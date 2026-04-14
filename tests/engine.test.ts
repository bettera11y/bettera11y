import { describe, expect, it } from "vitest";
import {
    BETTERA11Y_API_VERSION,
    audit,
    auditIncremental,
    auditSync,
    check,
    checkSync,
    defaultRules,
    startAuditSession,
    type RuleDefinition
} from "../src";

describe("pure audit api", () => {
    it("runs default rules and returns diagnostics with timings", async () => {
        const result = await audit(
            `
        <main>
          <h1>Page</h1>
          <h1>Other</h1>
          <img src="/a.png" />
          <input id="email" />
        </main>
      `,
            { rules: defaultRules, filepath: "index.html" }
        );

        expect(result.diagnostics.length).toBeGreaterThan(0);
        expect(Object.keys(result.metadata.ruleTimingsMs).length).toBe(defaultRules.length);
        expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("supports auditIncremental", async () => {
        const request = {
            changes: [
                {
                    content: "<h1>Only title</h1>",
                    filepath: "a.html"
                },
                {
                    content: "<img src='/x.png' />",
                    filepath: "b.html"
                }
            ]
        };
        const results = await auditIncremental(request, { rules: defaultRules });
        const results2 = await auditIncremental(request, { rules: defaultRules });
        expect(results).toHaveLength(2);
        expect(results2[0]?.metadata.cacheHit).toBe(false);
    });

    it("supports audit session lifecycle and telemetry", async () => {
        const events: string[] = [];
        const session = startAuditSession({
            rules: defaultRules,
            apiVersion: BETTERA11Y_API_VERSION,
            telemetry: {
                emit: (event) => events.push(event.type)
            }
        });

        await session.start();
        const result = await session.audit({
            content: "<button></button>",
            source: { kind: "file", path: "page.html" }
        });
        await session.stop();

        expect(result.diagnostics.length).toBeGreaterThan(0);
        expect(events).toEqual(["session-start", "audit-run", "session-stop"]);
    });

    it("returns deterministic system diagnostics for malformed input", async () => {
        const result = await audit(
            {
                content: ""
            },
            { rules: defaultRules }
        );
        expect(result.diagnostics[0]?.category).toBe("system");
        expect(result.diagnostics[0]?.message).toContain("Invalid audit input");
    });

    it("isolates per-rule failures without crashing full audit", async () => {
        const brokenRule: RuleDefinition = {
            meta: {
                id: "broken-rule",
                description: "throws",
                category: "system",
                defaultSeverity: "error"
            },
            check: () => {
                throw new Error("boom");
            }
        };
        const result = await audit("<main></main>", {
            rules: [brokenRule],
            filepath: "broken.html"
        });
        expect(result.diagnostics.some((item) => item.ruleId === "broken-rule")).toBe(true);
    });

    it("supports sync API and check helpers", async () => {
        const syncResult = auditSync("<main><img src='/missing.png' /></main>", {
            rules: defaultRules,
            filepath: "sync.html"
        });
        expect(syncResult.diagnostics.length).toBeGreaterThan(0);

        await expect(
            check("<main><img src='/missing.png' /></main>", {
                rules: defaultRules,
                filepath: "check.html"
            })
        ).resolves.toBe(false);

        expect(
            checkSync("<html lang='en'><main><button aria-label='Save'></button></main></html>", {
                rules: defaultRules,
                filepath: "check-ok.html"
            })
        ).toBe(true);
    });

    it("infers format from filepath and supports jsx/markdown inputs", async () => {
        const jsxResult = await audit("<button><svg></svg></button>", {
            rules: defaultRules,
            filepath: "component.jsx"
        });
        expect(jsxResult.diagnostics.some((item) => item.ruleId === "button-accessible-name")).toBe(true);

        const markdownResult = await audit("# Page heading", {
            rules: defaultRules,
            filepath: "README.md",
            source: { kind: "inline", label: "md-snippet" }
        });
        expect(Array.isArray(markdownResult.diagnostics)).toBe(true);
    });

    it("supports custom normalizer overrides", async () => {
        const result = await audit("ignored", {
            rules: defaultRules,
            format: "text",
            normalizers: {
                text: () => "<main><img src='/missing.png' /></main>"
            }
        });
        expect(result.diagnostics.some((item) => item.ruleId === "image-alt")).toBe(true);
    });
});
