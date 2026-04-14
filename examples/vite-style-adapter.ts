import {
    audit as runAudit,
    auditIncremental as runAuditIncremental,
    startAuditSession,
    strictPreset,
    toAdapterDiagnostic,
    type AuditSession
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
    session: AuditSession;
    audit: (id: string, code: string) => Promise<ViteDiagnostic[]>;
}> {
    const session = startAuditSession({ rules: strictPreset });
    await session.start();

    return {
        session,
        async audit(id, code) {
            const result = await session.audit({
                content: code,
                filepath: id,
                format: "tsx",
                source: {
                    kind: "file",
                    path: id,
                    language: "tsx"
                }
            });

            return result.diagnostics.map((diagnostic) => {
                const mapped = toAdapterDiagnostic(diagnostic, "vite");
                return {
                    id: diagnostic.id,
                    plugin: "vite-plugin-bettera11y",
                    message: diagnostic.message,
                    level: String(mapped.level),
                    loc: diagnostic.location?.start
                        ? {
                              file: diagnostic.location.sourcePath,
                              line: diagnostic.location.start.line,
                              column: diagnostic.location.start.column
                          }
                        : undefined
                };
            });
        }
    };
}

export { runAudit, runAuditIncremental };
