import type { AuditResult } from "./diagnostics";
import type { AuditInput } from "./input";
import type { RuleEnabledMap, RuleSeverityOverrides } from "./rules";

export const BETTERA11Y_API_VERSION = "1";

export interface AuditorConfig {
    apiVersion?: typeof BETTERA11Y_API_VERSION;
    severityOverrides?: RuleSeverityOverrides;
    enabledRules?: RuleEnabledMap;
    ruleOptions?: Record<string, Record<string, boolean | number | string>>;
    cache?: {
        maxEntries?: number;
        ttlMs?: number;
    };
}

export interface IncrementalAuditRequest {
    changes: AuditInput[];
}

export interface InputProvider {
    nextInput: () => Promise<AuditInput | null>;
}

export interface DiagnosticsSink {
    onResult: (result: AuditResult) => Promise<void> | void;
}

export interface SessionTelemetryEvent {
    type: "session-start" | "session-stop" | "audit-run";
    durationMs?: number;
    cacheHit?: boolean;
}

export interface SessionTelemetry {
    emit: (event: SessionTelemetryEvent) => void;
}

export interface AuditSession {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    audit: (input: AuditInput, signal?: AbortSignal) => Promise<AuditResult>;
    auditIncremental: (request: IncrementalAuditRequest, signal?: AbortSignal) => Promise<AuditResult[]>;
}
