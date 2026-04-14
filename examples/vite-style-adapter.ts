import {
  createEngine,
  strictPreset,
  translateSeverity,
  type AuditInput,
  type WatchSessionContract,
} from "../src";

type ViteDiagnostic = {
  id: string;
  plugin: string;
  message: string;
  level: string;
  loc?: {
    file?: string;
    line: number;
    column: number;
  };
};

export async function createViteStyleSession(): Promise<{
  session: WatchSessionContract;
  audit: (id: string, code: string) => Promise<ViteDiagnostic[]>;
}> {
  const engine = createEngine(strictPreset);
  const session = engine.createAuditSession();
  await session.start();

  return {
    session,
    async audit(id, code) {
      const input: AuditInput = {
        kind: "virtual-file",
        source: {
          path: id,
          language: "tsx",
        },
        content: code,
      };

      const result = await session.run(input);

      return result.diagnostics.map((diagnostic) => ({
        id: diagnostic.id,
        plugin: "vite-plugin-bettera11y",
        message: diagnostic.message,
        level: String(translateSeverity(diagnostic.severity, "vite")),
        loc: diagnostic.location?.start
          ? {
              file: diagnostic.location.sourcePath,
              line: diagnostic.location.start.line,
              column: diagnostic.location.start.column,
            }
          : undefined,
      }));
    },
  };
}
