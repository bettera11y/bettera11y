import type { AuditDiagnostic } from "../contracts";
import { getSha256 } from "./hash";

export function createDiagnosticFingerprint(diagnostic: Omit<AuditDiagnostic, "id">): string {
    return getSha256(
        JSON.stringify({
            ruleId: diagnostic.ruleId,
            message: diagnostic.message,
            severity: diagnostic.severity,
            selector: diagnostic.location?.selector,
            start: diagnostic.location?.start,
            end: diagnostic.location?.end
        })
    ).slice(0, 16);
}
