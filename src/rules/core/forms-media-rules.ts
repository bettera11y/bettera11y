import type { RuleDefinition } from "../../contracts";
import { hasAccessibleName } from "./helpers";

export const imageAltRule: RuleDefinition = {
    meta: {
        id: "image-alt",
        description: "Detect images without alternative text.",
        category: "media",
        defaultSeverity: "warn",
        tags: ["wcag-1.1.1"]
    },
    check({ document, locate }) {
        if (!document) return [];
        return Array.from(document.querySelectorAll("img")).flatMap((img) => {
            if (img.hasAttribute("alt")) return [];
            return [
                {
                    ruleId: "image-alt",
                    message: "Image is missing an alt attribute.",
                    severity: "warn",
                    category: "media",
                    remediation: "Provide meaningful alt text or empty alt for decorative images.",
                    location: locate(img)
                }
            ];
        });
    }
};

export const formControlLabelRule: RuleDefinition = {
    meta: {
        id: "form-control-label",
        description: "Detect form controls without labels.",
        category: "forms",
        defaultSeverity: "error",
        tags: ["forms", "wcag-3.3.2"]
    },
    check({ document, locate }) {
        if (!document) return [];
        const controls = Array.from(document.querySelectorAll("input,select,textarea")).filter(
            (el) => el.getAttribute("type")?.toLowerCase() !== "hidden"
        );

        return controls.flatMap((control) => {
            const id = control.getAttribute("id");
            const explicitLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
            const hasLabel =
                Boolean(explicitLabel) ||
                Boolean(control.closest("label")) ||
                Boolean(control.getAttribute("aria-label")) ||
                Boolean(control.getAttribute("aria-labelledby"));
            if (hasLabel) return [];
            return [
                {
                    ruleId: "form-control-label",
                    message: "Form control does not have an associated accessible label.",
                    severity: "error",
                    category: "forms",
                    remediation: "Associate a <label> or provide aria-label/aria-labelledby.",
                    location: locate(control)
                }
            ];
        });
    }
};

export const buttonAccessibleNameRule: RuleDefinition = {
    meta: {
        id: "button-accessible-name",
        description: "Ensure buttons have accessible names.",
        category: "aria",
        defaultSeverity: "error",
        tags: ["controls", "wcag-4.1.2"]
    },
    check({ document, locate }) {
        if (!document) return [];
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.flatMap((button) =>
            hasAccessibleName(button)
                ? []
                : [
                      {
                          ruleId: "button-accessible-name",
                          message: "Button is missing an accessible name.",
                          severity: "error",
                          category: "aria",
                          remediation: "Provide text content, aria-label, or aria-labelledby.",
                          location: locate(button)
                      }
                  ]
        );
    }
};
