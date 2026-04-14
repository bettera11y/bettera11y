import type { AuditResult } from "./diagnostics";
import type { AuditInput } from "./input";
import type { RuleEnabledMap, RuleSeverityOverrides } from "./rules";

export const BETTERA11Y_API_VERSION = "1";

export interface AuditEngineConfig {
  apiVersion?: typeof BETTERA11Y_API_VERSION;
  severityOverrides?: RuleSeverityOverrides;
  enabledRules?: RuleEnabledMap;
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

export interface WatchSessionContract {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  run: (input: AuditInput, signal?: AbortSignal) => Promise<AuditResult>;
  runIncremental: (
    request: IncrementalAuditRequest,
    signal?: AbortSignal,
  ) => Promise<AuditResult[]>;
}
