export type Severity = "info" | "warn" | "error";

export type DiagnosticCategory =
    | "semantics"
    | "structure"
    | "aria"
    | "forms"
    | "media"
    | "landmarks"
    | "keyboard"
    | "system";

export interface Position {
    line: number;
    column: number;
    offset: number;
}

export interface DiagnosticLocation {
    sourcePath?: string;
    selector?: string;
    start?: Position;
    end?: Position;
}

export interface DiagnosticMetadata {
    docsUrl?: string;
    tags?: string[];
    confidence?: number;
    fixable?: boolean;
}

export interface AuditDiagnostic {
    id: string;
    ruleId: string;
    message: string;
    severity: Severity;
    category: DiagnosticCategory;
    remediation?: string;
    location?: DiagnosticLocation;
    metadata?: DiagnosticMetadata;
}

export interface AuditMetadata {
    inputId?: string;
    sourcePath?: string;
    cacheHit: boolean;
    durationMs: number;
    ruleTimingsMs: Record<string, number>;
}

export interface AuditResult {
    diagnostics: AuditDiagnostic[];
    metadata: AuditMetadata;
}
