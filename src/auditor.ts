import { defaultRuntimeAdapter, type Normalizer, type RuntimeAdapter } from "./dom";
import type {
    AuditDiagnostic,
    AuditInput,
    AuditInputNormalizationOptions,
    AuditSourceKind,
    NormalizedAuditInput,
    AuditResult,
    AuditSession,
    AuditorConfig,
    IncrementalAuditRequest,
    RuleDefinition,
    SessionTelemetry
} from "./contracts";
import { BETTERA11Y_API_VERSION, normalizeAuditInput, validateAuditInput } from "./contracts";
import { createDiagnosticFingerprint, getSha256, selectorToSourceLocation } from "./utils";

interface CacheEntry {
    result: AuditResult;
    createdAt: number;
}

/**
 * Source text used to map DOM elements back to line/column locations.
 * For TSX/JSX, rules run on normalized HTML while diagnostics must point at the original file, so offsets are computed from `input.content`.
 */
function sourceTextForElementLocation(input: NormalizedAuditInput, html: string): string {
    if (input.format === "jsx" || input.format === "tsx") {
        return input.content;
    }
    return html;
}

/**
 * Top-level options accepted by the pure-function audit API.
 */
export interface AuditFunctionOptions extends AuditorConfig {
    rules?: RuleDefinition[];
    runtimeAdapter?: RuntimeAdapter;
    normalizers?: Partial<Record<NormalizedAuditInput["format"], Normalizer>>;
    format?: NormalizedAuditInput["format"];
    filepath?: string;
    source?: {
        kind?: AuditSourceKind;
        path?: string;
        label?: string;
        language?: string;
        framework?: string;
        contentHash?: string;
    };
    id?: string;
    telemetry?: SessionTelemetry;
}

interface InternalAuditor {
    registerRule: (rule: RuleDefinition) => void;
    unregisterRule: (ruleId: string) => void;
    listRules: () => RuleDefinition[];
    audit: (input: AuditInput, options?: AuditInputNormalizationOptions, signal?: AbortSignal) => Promise<AuditResult>;
    auditSync: (input: AuditInput, options?: AuditInputNormalizationOptions) => AuditResult;
    check: (input: AuditInput, options?: AuditInputNormalizationOptions, signal?: AbortSignal) => Promise<boolean>;
    checkSync: (input: AuditInput, options?: AuditInputNormalizationOptions) => boolean;
    auditIncremental: (
        request: IncrementalAuditRequest,
        options?: AuditInputNormalizationOptions,
        signal?: AbortSignal
    ) => Promise<AuditResult[]>;
    startAuditSession: (telemetry?: SessionTelemetry) => AuditSession;
    clearCache: () => void;
}

function buildAuditor(
    initialRules: RuleDefinition[] = [],
    config: AuditFunctionOptions = {},
    runtimeAdapter: RuntimeAdapter = defaultRuntimeAdapter
): InternalAuditor {
    /** In-memory rule registry keyed by rule id for deterministic lookup. */
    const ruleMap = new Map<string, RuleDefinition>();
    /** Bounded result cache used for repeat audits in a single auditor instance. */
    const cache = new Map<string, CacheEntry>();
    const maxEntries = config.cache?.maxEntries ?? 200;
    const ttlMs = config.cache?.ttlMs ?? 5 * 60 * 1000;

    initialRules.forEach((rule) => {
        ruleMap.set(rule.meta.id, rule);
    });

    /**
     * Removes expired entries and enforces max cache size.
     */
    const clearExpiredCache = (): void => {
        const now = Date.now();
        for (const [key, entry] of cache.entries()) {
            if (now - entry.createdAt > ttlMs) {
                cache.delete(key);
            }
        }
        while (cache.size > maxEntries) {
            const oldestKey = cache.keys().next().value as string | undefined;
            if (!oldestKey) break;
            cache.delete(oldestKey);
        }
    };

    /**
     * Lists rules in deterministic id order.
     */
    const listRules = (): RuleDefinition[] =>
        Array.from(ruleMap.values()).sort((a, b) => a.meta.id.localeCompare(b.meta.id));

    /**
     * Creates a standardized system diagnostic payload.
     */
    const createSystemDiagnostic = (message: string, ruleId = "__system__"): AuditDiagnostic => ({
        id: createDiagnosticFingerprint({
            ruleId,
            message,
            severity: "error",
            category: "system"
        }),
        ruleId,
        message,
        severity: "error",
        category: "system"
    });

    /**
     * Builds an audit result containing validation errors.
     */
    const createInvalidInputResult = (input: NormalizedAuditInput, messages: string[], start: number): AuditResult => ({
        diagnostics: messages.map((msg) => createSystemDiagnostic(`Invalid audit input: ${msg}`)),
        metadata: {
            inputId: input.id,
            sourcePath: input.filepath ?? input.source?.path,
            cacheHit: false,
            durationMs: Number((performance.now() - start).toFixed(3)),
            ruleTimingsMs: {}
        }
    });

    /**
     * Executes all enabled rules synchronously.
     */
    const runRulesSync = (
        normalizedInput: NormalizedAuditInput,
        html: string,
        document: Document | null,
        signal?: AbortSignal
    ): {
        diagnostics: AuditDiagnostic[];
        ruleTimingsMs: Record<string, number>;
    } => {
        const diagnostics: AuditDiagnostic[] = [];
        const ruleTimingsMs: Record<string, number> = {};
        const rules = listRules().filter((rule) => config.enabledRules?.[rule.meta.id] !== false);

        for (const rule of rules) {
            if (signal?.aborted) {
                throw new Error("Audit cancelled.");
            }
            const ruleStart = performance.now();
            const ruleOptions = config.ruleOptions?.[rule.meta.id] ?? {};
            let emitted: Awaited<ReturnType<RuleDefinition["check"]>> = [];
            try {
                const maybeResult = rule.check({
                    document,
                    input: normalizedInput,
                    createSelector: runtimeAdapter.createSelector,
                    locate(element) {
                        const selector = runtimeAdapter.createSelector(element);
                        return runtimeAdapter.locateElement(
                            sourceTextForElementLocation(normalizedInput, html),
                            element,
                            selector,
                            normalizedInput.filepath ?? normalizedInput.source?.path
                        );
                    },
                    signal,
                    options: ruleOptions
                });
                if (maybeResult instanceof Promise) {
                    throw new Error(`Rule "${rule.meta.id}" is async and cannot run in auditSync.`);
                }
                emitted = maybeResult;
            } catch (error) {
                diagnostics.push(
                    createSystemDiagnostic(
                        `Rule "${rule.meta.id}" failed during audit: ${
                            error instanceof Error ? error.message : String(error)
                        }`,
                        rule.meta.id
                    )
                );
            }

            ruleTimingsMs[rule.meta.id] = Number((performance.now() - ruleStart).toFixed(3));

            for (const item of emitted) {
                const severity = config.severityOverrides?.[rule.meta.id] ?? item.severity ?? rule.meta.defaultSeverity;
                const normalized = {
                    ...item,
                    severity,
                    category: item.category ?? rule.meta.category,
                    location:
                        item.location ??
                        selectorToSourceLocation(
                            html,
                            undefined,
                            normalizedInput.filepath ?? normalizedInput.source?.path
                        ),
                    metadata: {
                        docsUrl: rule.meta.docsUrl,
                        tags: rule.meta.tags,
                        ...item.metadata
                    }
                };
                diagnostics.push({
                    ...normalized,
                    id: createDiagnosticFingerprint(normalized)
                });
            }
        }

        return { diagnostics, ruleTimingsMs };
    };

    /**
     * Builds a deterministic cache key from input/rule configuration.
     */
    const buildCacheKey = (html: string, input: NormalizedAuditInput): string => {
        const rules = listRules().filter((rule) => config.enabledRules?.[rule.meta.id] !== false);
        return getSha256(
            `${config.apiVersion ?? BETTERA11Y_API_VERSION}:${input.source?.contentHash ?? getSha256(html)}:${rules
                .map(
                    (rule) =>
                        `${rule.meta.id}:${config.severityOverrides?.[rule.meta.id] ?? "default"}:${JSON.stringify(config.ruleOptions?.[rule.meta.id] ?? {})}`
                )
                .join("|")}`
        );
    };

    /**
     * Creates a consistent system result when input cannot be normalized into HTML.
     */
    const createNoHtmlResult = (input: NormalizedAuditInput, start: number): AuditResult => ({
        diagnostics: [createSystemDiagnostic("Audit input could not be normalized to HTML.")],
        metadata: {
            inputId: input.id,
            sourcePath: input.filepath ?? input.source?.path,
            cacheHit: false,
            durationMs: Number((performance.now() - start).toFixed(3)),
            ruleTimingsMs: {}
        }
    });

    /**
     * Synchronous one-shot audit execution.
     */
    const auditSync = (input: AuditInput, inputOptions: AuditInputNormalizationOptions = {}): AuditResult => {
        clearExpiredCache();
        const start = performance.now();
        const normalizedInput = normalizeAuditInput(input, inputOptions);
        const inputErrors = validateAuditInput(normalizedInput);
        if (inputErrors.length > 0) {
            return createInvalidInputResult(normalizedInput, inputErrors, start);
        }

        const html = runtimeAdapter.toHtml(normalizedInput, config.normalizers);
        if (!html) {
            return createNoHtmlResult(normalizedInput, start);
        }

        const cacheKey = buildCacheKey(html, normalizedInput);
        const cached = cache.get(cacheKey);
        if (cached) {
            return {
                ...cached.result,
                metadata: {
                    ...cached.result.metadata,
                    cacheHit: true,
                    durationMs: Number((performance.now() - start).toFixed(3))
                }
            };
        }

        const document = runtimeAdapter.createDocument(html);
        const { diagnostics, ruleTimingsMs } = runRulesSync(normalizedInput, html, document);
        const result: AuditResult = {
            diagnostics,
            metadata: {
                inputId: normalizedInput.id,
                sourcePath: normalizedInput.filepath ?? normalizedInput.source?.path,
                cacheHit: false,
                durationMs: Number((performance.now() - start).toFixed(3)),
                ruleTimingsMs
            }
        };
        cache.set(cacheKey, { result, createdAt: Date.now() });
        clearExpiredCache();
        return result;
    };

    /**
     * Asynchronous one-shot audit execution.
     */
    const audit = async (
        input: AuditInput,
        inputOptions: AuditInputNormalizationOptions = {},
        signal?: AbortSignal
    ): Promise<AuditResult> => {
        if (signal?.aborted) {
            throw new Error("Audit cancelled before start.");
        }

        clearExpiredCache();
        const start = performance.now();
        const normalizedInput = normalizeAuditInput(input, inputOptions);
        const inputErrors = validateAuditInput(normalizedInput);
        if (inputErrors.length > 0) {
            return createInvalidInputResult(normalizedInput, inputErrors, start);
        }

        const html = runtimeAdapter.toHtml(normalizedInput, config.normalizers);
        if (!html) {
            return createNoHtmlResult(normalizedInput, start);
        }

        const rules = listRules().filter((rule) => config.enabledRules?.[rule.meta.id] !== false);
        const cacheKey = buildCacheKey(html, normalizedInput);
        const cached = cache.get(cacheKey);
        if (cached) {
            return {
                ...cached.result,
                metadata: {
                    ...cached.result.metadata,
                    cacheHit: true,
                    durationMs: Number((performance.now() - start).toFixed(3))
                }
            };
        }

        const document = runtimeAdapter.createDocument(html);
        const diagnostics: AuditDiagnostic[] = [];
        const ruleTimingsMs: Record<string, number> = {};

        for (const rule of rules) {
            if (signal?.aborted) {
                throw new Error("Audit cancelled.");
            }
            const ruleStart = performance.now();
            const ruleOptions = config.ruleOptions?.[rule.meta.id] ?? {};
            let emitted: Awaited<ReturnType<RuleDefinition["check"]>> = [];
            try {
                emitted = await rule.check({
                    document,
                    input: normalizedInput,
                    createSelector: runtimeAdapter.createSelector,
                    locate(element) {
                        const selector = runtimeAdapter.createSelector(element);
                        return runtimeAdapter.locateElement(
                            sourceTextForElementLocation(normalizedInput, html),
                            element,
                            selector,
                            normalizedInput.filepath ?? normalizedInput.source?.path
                        );
                    },
                    signal,
                    options: ruleOptions
                });
            } catch (error) {
                diagnostics.push(
                    createSystemDiagnostic(
                        `Rule "${rule.meta.id}" failed during audit: ${
                            error instanceof Error ? error.message : String(error)
                        }`,
                        rule.meta.id
                    )
                );
            }

            ruleTimingsMs[rule.meta.id] = Number((performance.now() - ruleStart).toFixed(3));

            for (const item of emitted) {
                const severity = config.severityOverrides?.[rule.meta.id] ?? item.severity ?? rule.meta.defaultSeverity;
                const normalized = {
                    ...item,
                    severity,
                    category: item.category ?? rule.meta.category,
                    location:
                        item.location ??
                        selectorToSourceLocation(
                            html,
                            undefined,
                            normalizedInput.filepath ?? normalizedInput.source?.path
                        ),
                    metadata: {
                        docsUrl: rule.meta.docsUrl,
                        tags: rule.meta.tags,
                        ...item.metadata
                    }
                };
                diagnostics.push({
                    ...normalized,
                    id: createDiagnosticFingerprint(normalized)
                });
            }
        }

        const result: AuditResult = {
            diagnostics,
            metadata: {
                inputId: normalizedInput.id,
                sourcePath: normalizedInput.filepath ?? normalizedInput.source?.path,
                cacheHit: false,
                durationMs: Number((performance.now() - start).toFixed(3)),
                ruleTimingsMs
            }
        };
        cache.set(cacheKey, { result, createdAt: Date.now() });
        clearExpiredCache();
        return result;
    };

    /**
     * Async helper that returns true when no diagnostics are emitted.
     */
    const check = async (
        input: AuditInput,
        options: AuditInputNormalizationOptions = {},
        signal?: AbortSignal
    ): Promise<boolean> => {
        const result = await audit(input, options, signal);
        return result.diagnostics.length === 0;
    };

    /**
     * Sync helper that returns true when no diagnostics are emitted.
     */
    const checkSync = (input: AuditInput, options: AuditInputNormalizationOptions = {}): boolean =>
        auditSync(input, options).diagnostics.length === 0;

    /**
     * Executes a batch of changes using the same auditor configuration.
     */
    const auditIncremental = async (
        request: IncrementalAuditRequest,
        options: AuditInputNormalizationOptions = {},
        signal?: AbortSignal
    ): Promise<AuditResult[]> => {
        const output: AuditResult[] = [];
        for (const change of request.changes) {
            output.push(await audit(change, options, signal));
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
        audit,
        auditSync,
        check,
        checkSync,
        auditIncremental,
        startAuditSession(telemetry) {
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
                async audit(input, signal) {
                    if (!started) {
                        throw new Error("Audit session must be started before audit.");
                    }
                    const result = await audit(input, {}, signal);
                    telemetry?.emit({
                        type: "audit-run",
                        durationMs: result.metadata.durationMs,
                        cacheHit: result.metadata.cacheHit
                    });
                    return result;
                },
                async auditIncremental(request, signal) {
                    if (!started) {
                        throw new Error("Audit session must be started before auditIncremental.");
                    }
                    return auditIncremental(request, {}, signal);
                }
            };
        },
        clearCache() {
            cache.clear();
        }
    };
}

export async function audit(
    input: AuditInput,
    options: AuditFunctionOptions = {},
    signal?: AbortSignal
): Promise<AuditResult> {
    const auditor = buildAuditor(options.rules ?? [], options, options.runtimeAdapter ?? defaultRuntimeAdapter);
    return auditor.audit(input, options, signal);
}

/**
 * Runs a synchronous one-shot audit.
 */
export function auditSync(input: AuditInput, options: AuditFunctionOptions = {}): AuditResult {
    const auditor = buildAuditor(options.rules ?? [], options, options.runtimeAdapter ?? defaultRuntimeAdapter);
    return auditor.auditSync(input, options);
}

/**
 * Returns true when async audit emits no diagnostics.
 */
export async function check(
    input: AuditInput,
    options: AuditFunctionOptions = {},
    signal?: AbortSignal
): Promise<boolean> {
    const auditor = buildAuditor(options.rules ?? [], options, options.runtimeAdapter ?? defaultRuntimeAdapter);
    return auditor.check(input, options, signal);
}

/**
 * Returns true when sync audit emits no diagnostics.
 */
export function checkSync(input: AuditInput, options: AuditFunctionOptions = {}): boolean {
    const auditor = buildAuditor(options.rules ?? [], options, options.runtimeAdapter ?? defaultRuntimeAdapter);
    return auditor.checkSync(input, options);
}

/**
 * Audits a batch of changes in order.
 */
export async function auditIncremental(
    request: IncrementalAuditRequest,
    options: AuditFunctionOptions = {},
    signal?: AbortSignal
): Promise<AuditResult[]> {
    const auditor = buildAuditor(options.rules ?? [], options, options.runtimeAdapter ?? defaultRuntimeAdapter);
    return auditor.auditIncremental(request, options, signal);
}

/**
 * Creates a stateful audit session for long-lived watch/dev workflows.
 */
export function startAuditSession(options: AuditFunctionOptions = {}): AuditSession {
    const auditor = buildAuditor(options.rules ?? [], options, options.runtimeAdapter ?? defaultRuntimeAdapter);
    return auditor.startAuditSession(options.telemetry);
}
