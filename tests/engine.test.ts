import { describe, expect, it } from "vitest";
import {
  BETTERA11Y_API_VERSION,
  createEngine,
  defaultRules,
  type RuleDefinition,
} from "../src";

describe("engine", () => {
  it("runs default rules and returns diagnostics with timings", async () => {
    const engine = createEngine(defaultRules);
    const result = await engine.run({
      kind: "html",
      source: { path: "index.html", language: "html" },
      html: `
        <main>
          <h1>Page</h1>
          <h1>Other</h1>
          <img src="/a.png" />
          <input id="email" />
        </main>
      `,
    });

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(Object.keys(result.metadata.ruleTimingsMs).length).toBe(
      defaultRules.length,
    );
    expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("registers and unregisters rules deterministically by id", () => {
    const a: RuleDefinition = {
      meta: {
        id: "zeta",
        description: "z",
        category: "structure",
        defaultSeverity: "warn",
      },
      check: () => [],
    };
    const b: RuleDefinition = {
      meta: {
        id: "alpha",
        description: "a",
        category: "structure",
        defaultSeverity: "warn",
      },
      check: () => [],
    };

    const engine = createEngine([a]);
    engine.registerRule(b);
    expect(engine.listRules().map((rule) => rule.meta.id)).toEqual([
      "alpha",
      "zeta",
    ]);
    engine.unregisterRule("alpha");
    expect(engine.listRules().map((rule) => rule.meta.id)).toEqual(["zeta"]);
  });

  it("supports runIncremental and cache hits", async () => {
    const engine = createEngine(defaultRules);
    const request = {
      changes: [
        {
          kind: "html" as const,
          source: { path: "a.html" },
          html: "<h1>Only title</h1>",
        },
        {
          kind: "html" as const,
          source: { path: "b.html" },
          html: "<img src='/x.png' />",
        },
      ],
    };
    const results = await engine.runIncremental(request);
    const results2 = await engine.runIncremental(request);
    expect(results).toHaveLength(2);
    expect(results2[0]?.metadata.cacheHit).toBe(true);
  });

  it("supports audit session lifecycle and telemetry", async () => {
    const events: string[] = [];
    const engine = createEngine(defaultRules, {
      apiVersion: BETTERA11Y_API_VERSION,
    });
    const session = engine.createAuditSession({
      emit: (event) => events.push(event.type),
    });

    await session.start();
    const result = await session.run({
      kind: "html",
      source: { path: "page.html" },
      html: "<button></button>",
    });
    await session.stop();

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(events).toEqual(["session-start", "audit-run", "session-stop"]);
  });
});
