import {
  audit,
  recommendedPreset,
  toAdapterDiagnostic,
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
  const result = await audit(sourceText, {
    rules: recommendedPreset,
    filepath: filePath,
    format: "tsx",
    source: {
      kind: "file",
      path: filePath,
      language: "tsx",
      framework: "react",
    },
  });

  return result.diagnostics.map((diagnostic) => {
    const mapped = toAdapterDiagnostic(diagnostic, "eslint");
    return {
      ruleId: `bettera11y/${diagnostic.ruleId}`,
      message: diagnostic.message,
      severity: Number(mapped.level),
      line: diagnostic.location?.start?.line ?? 1,
      column: diagnostic.location?.start?.column ?? 1,
      endLine: diagnostic.location?.end?.line,
      endColumn: diagnostic.location?.end?.column,
    };
  });
}
