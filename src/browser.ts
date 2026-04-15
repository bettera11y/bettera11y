/**
 * Browser-safe BetterA11y entry: same audit API as the main package without a JSDOM dependency.
 * Use `createBrowserRuntimeAdapter()` when supplying a custom `runtimeAdapter` to `audit()`.
 */
export { audit, auditSync, auditIncremental, check, checkSync, startAuditSession } from "./auditor-browser";
export type { AuditFunctionOptions } from "./auditor-impl";
export { createBrowserRuntimeAdapter } from "./dom-browser";
export { coreRules, defaultRules } from "./rules/default-rules";
export { recommendedPreset, strictPreset, wcagAaBaselinePreset } from "./presets";
export * from "./contracts";
export * from "./utils";
export { createJsonReporter, createMachineReporter, createPrettyReporter } from "./reporters";
export { MockAdapter } from "./adapters";
export type { MockAdapterOptions, ToolIntegrationAdapter } from "./adapters";
