import type { AuditInput, AuditResult, AuditSession, IncrementalAuditRequest, SessionTelemetry } from "./contracts";
import { buildAuditor, type AuditFunctionOptions } from "./auditor-impl";
import { createBrowserRuntimeAdapter } from "./dom-browser";

export type { AuditFunctionOptions } from "./auditor-impl";

const browserDefaultAdapter = createBrowserRuntimeAdapter();

function resolveRuntimeAdapter(options: AuditFunctionOptions) {
    return options.runtimeAdapter ?? browserDefaultAdapter;
}

export async function audit(
    input: AuditInput,
    options: AuditFunctionOptions = {},
    signal?: AbortSignal
): Promise<AuditResult> {
    const auditor = buildAuditor(options.rules ?? [], options, resolveRuntimeAdapter(options));
    return auditor.audit(input, options, signal);
}

/**
 * Runs a synchronous one-shot audit.
 */
export function auditSync(input: AuditInput, options: AuditFunctionOptions = {}): AuditResult {
    const auditor = buildAuditor(options.rules ?? [], options, resolveRuntimeAdapter(options));
    return auditor.auditSync(input, options);
}

/**
 * Returns true when async audit emits no diagnostics.
 */
export async function check(
    input: AuditInput,
    options: AuditFunctionOptions = {},
    signal?: AbortSignal
): Promise<boolean> {
    const auditor = buildAuditor(options.rules ?? [], options, resolveRuntimeAdapter(options));
    return auditor.check(input, options, signal);
}

/**
 * Returns true when sync audit emits no diagnostics.
 */
export function checkSync(input: AuditInput, options: AuditFunctionOptions = {}): boolean {
    const auditor = buildAuditor(options.rules ?? [], options, resolveRuntimeAdapter(options));
    return auditor.checkSync(input, options);
}

/**
 * Audits a batch of changes in order.
 */
export async function auditIncremental(
    request: IncrementalAuditRequest,
    options: AuditFunctionOptions = {},
    signal?: AbortSignal
): Promise<AuditResult[]> {
    const auditor = buildAuditor(options.rules ?? [], options, resolveRuntimeAdapter(options));
    return auditor.auditIncremental(request, options, signal);
}

/**
 * Creates a stateful audit session for long-lived watch/dev workflows.
 */
export function startAuditSession(options: AuditFunctionOptions = {}): AuditSession {
    const auditor = buildAuditor(options.rules ?? [], options, resolveRuntimeAdapter(options));
    return auditor.startAuditSession(options.telemetry);
}
