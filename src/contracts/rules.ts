import type { AuditInput } from "./input";
import type {
  AuditDiagnostic,
  DiagnosticCategory,
  DiagnosticLocation,
  Severity,
} from "./diagnostics";

export interface RuleOptionSchemaEntry {
  type: "boolean" | "number" | "string";
  defaultValue?: boolean | number | string;
  description?: string;
}

export type RuleOptionsSchema = Record<string, RuleOptionSchemaEntry>;

export interface RuleCapabilities {
  requiresDom?: boolean;
  supportsIncremental?: boolean;
}

export interface RuleMeta {
  id: string;
  description: string;
  category: DiagnosticCategory;
  defaultSeverity: Severity;
  docsUrl?: string;
  tags?: string[];
  capabilities?: RuleCapabilities;
  optionsSchema?: RuleOptionsSchema;
}

export interface RuleContext {
  input: AuditInput;
  document: Document | null;
  createSelector: (element: Element) => string;
  locate: (element: Element) => DiagnosticLocation;
  signal?: AbortSignal;
}

export type RuleDiagnostic = Omit<AuditDiagnostic, "id">;

export interface RuleDefinition {
  meta: RuleMeta;
  check: (context: RuleContext) => RuleDiagnostic[] | Promise<RuleDiagnostic[]>;
}

export type RuleSeverityOverrides = Record<string, Severity>;
export type RuleEnabledMap = Record<string, boolean>;
