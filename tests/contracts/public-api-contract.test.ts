import { describe, expect, it } from "vitest";
import * as api from "../../src";

describe("public API contract", () => {
    it("exports required integration-facing symbols", () => {
        const required = [
            "BETTERA11Y_API_VERSION",
            "audit",
            "auditSync",
            "auditIncremental",
            "check",
            "checkSync",
            "startAuditSession",
            "createJsonReporter",
            "createMachineReporter",
            "createPrettyReporter",
            "MockAdapter",
            "recommendedPreset",
            "strictPreset",
            "wcagAaBaselinePreset",
            "createDiagnosticFingerprint",
            "selectorToSourceLocation",
            "translateSeverity",
            "toAdapterDiagnostic"
        ];

        for (const symbol of required) {
            expect(api).toHaveProperty(symbol);
        }
    });

    it("runs a working audit via public API", async () => {
        const result = await api.audit("<html><main><button></button></main></html>", {
            rules: api.recommendedPreset,
            filepath: "contract.html"
        });
        expect(Array.isArray(result.diagnostics)).toBe(true);
        expect(typeof result.metadata.durationMs).toBe("number");
    });

    it("exposes wcag metadata and keeps wcag baseline normative-only", () => {
        const colorContrast = api.strictPreset.find((rule) => rule.meta.id === "color-contrast");
        const imageAlt = api.strictPreset.find((rule) => rule.meta.id === "image-alt");

        expect(colorContrast?.meta.wcagAlignment).toBe("heuristic");
        expect(imageAlt?.meta.wcagAlignment).toBe("normative");
        expect(imageAlt?.meta.wcagCriteria).toContain("1.1.1");

        const baselineIds = new Set(api.wcagAaBaselinePreset.map((rule) => rule.meta.id));
        expect(baselineIds.has("color-contrast")).toBe(false);
        expect(baselineIds.has("text-readability")).toBe(false);
    });
});
