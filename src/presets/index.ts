import type { RuleDefinition } from "../contracts";
import { coreRules } from "../rules/default-rules";

function byId(ids: string[]): RuleDefinition[] {
  const idSet = new Set(ids);
  return coreRules.filter((rule) => idSet.has(rule.meta.id));
}

export const recommendedPreset: RuleDefinition[] = byId([
  "duplicate-id",
  "heading-order",
  "image-alt",
  "form-control-label",
  "button-accessible-name",
  "invalid-aria",
  "main-landmark",
]);

export const strictPreset: RuleDefinition[] = [...coreRules];

export const wcagAaBaselinePreset: RuleDefinition[] = byId([
  "duplicate-id",
  "heading-order",
  "html-lang",
  "image-alt",
  "form-control-label",
  "button-accessible-name",
  "invalid-aria",
  "main-landmark",
  "positive-tabindex",
]);
