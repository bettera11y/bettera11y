export function hasAccessibleName(element: Element): boolean {
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) return true;

    const ariaLabelledBy = element.getAttribute("aria-labelledby");
    if (ariaLabelledBy && ariaLabelledBy.trim()) return true;

    const title = element.getAttribute("title");
    if (title && title.trim()) return true;

    return Boolean(element.textContent?.trim());
}

export function createSimpleDiagnostic(
    ruleId: string,
    message: string,
    severity: "info" | "warn" | "error",
    category: "semantics" | "structure" | "aria" | "forms" | "media" | "landmarks" | "keyboard",
    remediation: string,
    location?: ReturnType<import("../../contracts").RuleContext["locate"]>
) {
    return { ruleId, message, severity, category, remediation, location };
}
