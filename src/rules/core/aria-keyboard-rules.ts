import type { RuleDefinition, RuleDiagnostic } from "../../contracts";
import { hasAccessibleName } from "./helpers";

const VALID_ARIA_ATTRIBUTES = new Set([
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-hidden",
    "aria-expanded",
    "aria-controls",
    "aria-checked",
    "aria-pressed",
    "aria-current",
    "aria-live",
    "aria-invalid",
    "aria-required",
    "aria-selected",
    "aria-role-description"
]);

const BOOLEAN_ARIA_ATTRIBUTES = new Set([
    "aria-hidden",
    "aria-expanded",
    "aria-checked",
    "aria-pressed",
    "aria-invalid",
    "aria-required",
    "aria-selected"
]);

export const invalidAriaRule: RuleDefinition = {
    meta: {
        id: "invalid-aria",
        description: "Detect invalid aria attributes and values.",
        category: "aria",
        defaultSeverity: "error",
        tags: ["aria", "wcag-4.1.2"]
    },
    check({ document, locate }) {
        if (!document) return [];
        const diagnostics: RuleDiagnostic[] = [];
        for (const element of Array.from(document.querySelectorAll("*"))) {
            for (const attr of element.getAttributeNames()) {
                if (!attr.startsWith("aria-")) continue;
                if (!VALID_ARIA_ATTRIBUTES.has(attr)) {
                    diagnostics.push({
                        ruleId: "invalid-aria",
                        message: `Invalid ARIA attribute "${attr}".`,
                        severity: "error",
                        category: "aria",
                        remediation: "Use only valid WAI-ARIA attributes.",
                        location: locate(element)
                    });
                    continue;
                }

                if (BOOLEAN_ARIA_ATTRIBUTES.has(attr)) {
                    const value = element.getAttribute(attr);
                    if (value !== "true" && value !== "false") {
                        diagnostics.push({
                            ruleId: "invalid-aria",
                            message: `ARIA boolean attribute "${attr}" must be "true" or "false".`,
                            severity: "error",
                            category: "aria",
                            remediation: `Set ${attr} to "true" or "false".`,
                            location: locate(element)
                        });
                    }
                }
            }
        }
        return diagnostics;
    }
};

export const interactiveRoleNameRule: RuleDefinition = {
    meta: {
        id: "interactive-role-name",
        description: "Detect custom interactive roles without accessible names.",
        category: "aria",
        defaultSeverity: "warn",
        tags: ["aria", "roles"]
    },
    check({ document, locate }) {
        if (!document) return [];
        const interactiveRoles = new Set(["button", "switch", "checkbox", "menuitem"]);
        return Array.from(document.querySelectorAll("[role]")).flatMap((element) => {
            const role = element.getAttribute("role");
            if (!role || !interactiveRoles.has(role) || hasAccessibleName(element)) {
                return [];
            }
            return [
                {
                    ruleId: "interactive-role-name",
                    message: `Element with role="${role}" is missing an accessible name.`,
                    severity: "warn",
                    category: "aria",
                    remediation: "Provide aria-label, aria-labelledby, or meaningful text content.",
                    location: locate(element)
                }
            ];
        });
    }
};

export const positiveTabindexRule: RuleDefinition = {
    meta: {
        id: "positive-tabindex",
        description: "Detect positive tabindex usage.",
        category: "keyboard",
        defaultSeverity: "warn",
        tags: ["keyboard", "focus-order"]
    },
    check({ document, locate }) {
        if (!document) return [];
        return Array.from(document.querySelectorAll("[tabindex]")).flatMap((element) => {
            const value = Number(element.getAttribute("tabindex"));
            if (Number.isNaN(value) || value <= 0) return [];
            return [
                {
                    ruleId: "positive-tabindex",
                    message: "Positive tabindex can create confusing keyboard focus order.",
                    severity: "warn",
                    category: "keyboard",
                    remediation: 'Use tabindex="0" or rely on natural DOM order when possible.',
                    location: locate(element)
                }
            ];
        });
    }
};
