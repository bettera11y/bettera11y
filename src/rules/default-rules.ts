import type { RuleDefinition } from "../contracts";
import { buttonAccessibleNameRule, formControlLabelRule, imageAltRule } from "./core/forms-media-rules";
import { duplicateH1Rule, duplicateIdRule, headingOrderRule, htmlLangRule } from "./core/structure-rules";
import { interactiveRoleNameRule, invalidAriaRule, positiveTabindexRule } from "./core/aria-keyboard-rules";
import { mainLandmarkRule } from "./core/landmark-rules";
import { colorContrastRule, textReadabilityRule } from "./core/style-rules";

export const coreRules: RuleDefinition[] = [
    duplicateIdRule,
    duplicateH1Rule,
    headingOrderRule,
    htmlLangRule,
    imageAltRule,
    formControlLabelRule,
    buttonAccessibleNameRule,
    invalidAriaRule,
    interactiveRoleNameRule,
    positiveTabindexRule,
    mainLandmarkRule,
    colorContrastRule,
    textReadabilityRule
];

export const defaultRules = coreRules;
