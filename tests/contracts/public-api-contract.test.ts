import { describe, expect, it } from "vitest";
import * as api from "../../src";

describe("public API contract", () => {
  it("exports required integration-facing symbols", () => {
    const required = [
      "BETTERA11Y_API_VERSION",
      "createEngine",
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
    ];

    for (const symbol of required) {
      expect(api).toHaveProperty(symbol);
    }
  });
});
