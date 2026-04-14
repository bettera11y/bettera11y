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
      "toAdapterDiagnostic",
    ];

    for (const symbol of required) {
      expect(api).toHaveProperty(symbol);
    }
  });

  it("runs a working audit via public API", async () => {
    const result = await api.audit(
      "<html><main><button></button></main></html>",
      { rules: api.recommendedPreset, filepath: "contract.html" },
    );
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(typeof result.metadata.durationMs).toBe("number");
  });
});
