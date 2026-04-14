import {
  createEngine,
  recommendedPreset,
  translateSeverity,
  type AuditInput,
} from "../src";

type EslintMessage = {
  ruleId: string;
  message: string;
  severity: number;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
};

export async function lintHtmlLikeSource(
  filePath: string,
  sourceText: string,
): Promise<EslintMessage[]> {
  const engine = createEngine(recommendedPreset);
  const input: AuditInput = {
    kind: "virtual-file",
    source: {
      path: filePath,
      language: "tsx",
      framework: "react",
    },
    content: sourceText,
  };

  const result = await engine.run(input);

  return result.diagnostics.map((diagnostic) => ({
    ruleId: `bettera11y/${diagnostic.ruleId}`,
    message: diagnostic.message,
    severity: Number(translateSeverity(diagnostic.severity, "eslint")),
    line: diagnostic.location?.start?.line ?? 1,
    column: diagnostic.location?.start?.column ?? 1,
    endLine: diagnostic.location?.end?.line,
    endColumn: diagnostic.location?.end?.column,
  }));
}
