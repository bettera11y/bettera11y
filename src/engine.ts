import {
  createDocumentFromHtml,
  createElementSelector,
  locateElementInSource,
  normalizeInputToHtml,
} from "./dom";
import type {
  AuditDiagnostic,
  AuditEngineConfig,
  AuditInput,
  AuditResult,
  IncrementalAuditRequest,
  RuleDefinition,
  SessionTelemetry,
  WatchSessionContract,
} from "./contracts";
import { BETTERA11Y_API_VERSION } from "./contracts";
import {
  createDiagnosticFingerprint,
  getSha256,
  selectorToSourceLocation,
} from "./utils";

export interface AuditEngine {
  registerRule: (rule: RuleDefinition) => void;
  unregisterRule: (ruleId: string) => void;
  listRules: () => RuleDefinition[];
  run: (input: AuditInput, signal?: AbortSignal) => Promise<AuditResult>;
  runIncremental: (
    request: IncrementalAuditRequest,
    signal?: AbortSignal,
  ) => Promise<AuditResult[]>;
  createAuditSession: (telemetry?: SessionTelemetry) => WatchSessionContract;
}

interface CacheEntry {
  result: AuditResult;
  createdAt: number;
}

export function createEngine(
  initialRules: RuleDefinition[] = [],
  config: AuditEngineConfig = {},
): AuditEngine {
  const ruleMap = new Map<string, RuleDefinition>();
  const cache = new Map<string, CacheEntry>();

  initialRules.forEach((rule) => {
    ruleMap.set(rule.meta.id, rule);
  });

  const listRules = (): RuleDefinition[] =>
    Array.from(ruleMap.values()).sort((a, b) =>
      a.meta.id.localeCompare(b.meta.id),
    );

  const run = async (
    input: AuditInput,
    signal?: AbortSignal,
  ): Promise<AuditResult> => {
    if (signal?.aborted) {
      throw new Error("Audit cancelled before start.");
    }

    const start = performance.now();
    const html = normalizeInputToHtml(input);
    if (!html) {
      return {
        diagnostics: [],
        metadata: {
          inputId: input.id,
          sourcePath: input.source.path,
          cacheHit: false,
          durationMs: Number((performance.now() - start).toFixed(3)),
          ruleTimingsMs: {},
        },
      };
    }

    const rules = listRules().filter(
      (rule) => config.enabledRules?.[rule.meta.id] !== false,
    );
    const cacheKey = getSha256(
      `${config.apiVersion ?? BETTERA11Y_API_VERSION}:${input.source.contentHash ?? getSha256(html)}:${rules
        .map(
          (rule) =>
            `${rule.meta.id}:${config.severityOverrides?.[rule.meta.id] ?? "default"}`,
        )
        .join("|")}`,
    );
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        ...cached.result,
        metadata: {
          ...cached.result.metadata,
          cacheHit: true,
          durationMs: Number((performance.now() - start).toFixed(3)),
        },
      };
    }

    const document = createDocumentFromHtml(html);
    const ruleTimingsMs: Record<string, number> = {};
    const diagnostics: AuditDiagnostic[] = [];

    for (const rule of rules) {
      if (signal?.aborted) {
        throw new Error("Audit cancelled.");
      }
      const ruleStart = performance.now();
      const emitted = await rule.check({
        document,
        input,
        createSelector: createElementSelector,
        locate(element) {
          const selector = createElementSelector(element);
          return locateElementInSource(
            html,
            element,
            selector,
            input.source.path,
          );
        },
        signal,
      });
      ruleTimingsMs[rule.meta.id] = Number(
        (performance.now() - ruleStart).toFixed(3),
      );

      for (const item of emitted) {
        const severity =
          config.severityOverrides?.[rule.meta.id] ??
          item.severity ??
          rule.meta.defaultSeverity;
        const normalized = {
          ...item,
          severity,
          category: item.category ?? rule.meta.category,
          location:
            item.location ??
            selectorToSourceLocation(html, undefined, input.source.path),
          metadata: {
            docsUrl: rule.meta.docsUrl,
            tags: rule.meta.tags,
            ...item.metadata,
          },
        };
        diagnostics.push({
          ...normalized,
          id: createDiagnosticFingerprint(normalized),
        });
      }
    }

    const result: AuditResult = {
      diagnostics,
      metadata: {
        inputId: input.id,
        sourcePath: input.source.path,
        cacheHit: false,
        durationMs: Number((performance.now() - start).toFixed(3)),
        ruleTimingsMs,
      },
    };
    cache.set(cacheKey, { result, createdAt: Date.now() });
    return result;
  };

  const runIncremental = async (
    request: IncrementalAuditRequest,
    signal?: AbortSignal,
  ): Promise<AuditResult[]> => {
    const output: AuditResult[] = [];
    for (const change of request.changes) {
      output.push(await run(change, signal));
    }
    return output;
  };

  return {
    registerRule(rule) {
      ruleMap.set(rule.meta.id, rule);
    },
    unregisterRule(ruleId) {
      ruleMap.delete(ruleId);
    },
    listRules,
    run,
    runIncremental,
    createAuditSession(telemetry) {
      let started = false;
      return {
        async start() {
          started = true;
          telemetry?.emit({ type: "session-start" });
        },
        async stop() {
          started = false;
          telemetry?.emit({ type: "session-stop" });
        },
        async run(input, signal) {
          if (!started) {
            throw new Error("Audit session must be started before run.");
          }
          const result = await run(input, signal);
          telemetry?.emit({
            type: "audit-run",
            durationMs: result.metadata.durationMs,
            cacheHit: result.metadata.cacheHit,
          });
          return result;
        },
        async runIncremental(request, signal) {
          if (!started) {
            throw new Error(
              "Audit session must be started before runIncremental.",
            );
          }
          return runIncremental(request, signal);
        },
      };
    },
  };
}
