import type { AuditResult } from "./contracts";

export interface DiagnosticsReporter {
  format: (result: AuditResult) => string;
}

export function createJsonReporter(): DiagnosticsReporter {
  return {
    format(result) {
      return JSON.stringify(result, null, 2);
    },
  };
}

export function createMachineReporter(): DiagnosticsReporter {
  return {
    format(result) {
      return JSON.stringify({
        diagnostics: result.diagnostics,
        metadata: result.metadata,
      });
    },
  };
}

export function createPrettyReporter(): DiagnosticsReporter {
  return {
    format(result) {
      if (result.diagnostics.length === 0) {
        return "No accessibility warnings detected.";
      }

      const lines = result.diagnostics.map((diagnostic, index) => {
        const at = diagnostic.location?.selector
          ? ` at ${diagnostic.location.selector}`
          : "";
        const remediation = diagnostic.remediation
          ? `\n    remediation: ${diagnostic.remediation}`
          : "";
        return `${index + 1}. [${diagnostic.severity}] ${diagnostic.ruleId}: ${diagnostic.message}${at}${remediation}`;
      });

      return lines.join("\n");
    },
  };
}
