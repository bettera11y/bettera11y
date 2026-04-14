import type { RuleDefinition, RuleDiagnostic } from "../../contracts";

export const duplicateIdRule: RuleDefinition = {
  meta: {
    id: "duplicate-id",
    description: "Detect duplicate element ids.",
    category: "structure",
    defaultSeverity: "error",
    tags: ["wcag-4.1.1"],
  },
  check({ document, createSelector, locate }) {
    if (!document) return [];
    const idMap = new Map<string, Element[]>();
    document.querySelectorAll("[id]").forEach((element) => {
      const id = element.getAttribute("id");
      if (!id) return;
      const list = idMap.get(id) ?? [];
      list.push(element);
      idMap.set(id, list);
    });

    return Array.from(idMap.entries()).flatMap(([id, elements]) =>
      elements.length < 2
        ? []
        : elements.map((element) => {
            const selector = createSelector(element);
            return {
              ruleId: "duplicate-id",
              message: `Duplicate id "${id}" found.`,
              severity: "error",
              category: "structure",
              remediation: "Ensure each id value is unique within a page.",
              location: locate(element),
              metadata: { tags: ["id", "structure"] },
            };
          }),
    );
  },
};

export const duplicateH1Rule: RuleDefinition = {
  meta: {
    id: "duplicate-h1",
    description: "Detect multiple h1 elements in one document.",
    category: "structure",
    defaultSeverity: "warn",
    tags: ["headings"],
  },
  check({ document, locate }) {
    if (!document) return [];
    const h1s = Array.from(document.querySelectorAll("h1"));
    if (h1s.length <= 1) return [];
    return h1s.map((h1) => ({
      ruleId: "duplicate-h1",
      message: "Multiple h1 elements found in the same document.",
      severity: "warn",
      category: "structure",
      remediation:
        "Use a single primary h1 and nest sections under lower heading levels.",
      location: locate(h1),
    }));
  },
};

export const headingOrderRule: RuleDefinition = {
  meta: {
    id: "heading-order",
    description: "Detect heading level jumps.",
    category: "semantics",
    defaultSeverity: "warn",
    tags: ["headings", "wcag-1.3.1"],
  },
  check({ document, locate }) {
    if (!document) return [];
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    const diagnostics: RuleDiagnostic[] = [];
    let previous = 0;
    for (const heading of headings) {
      const level = Number(heading.tagName.toLowerCase().slice(1));
      if (previous > 0 && level > previous + 1) {
        diagnostics.push({
          ruleId: "heading-order",
          message: `Heading level jumps from h${previous} to h${level}.`,
          severity: "warn",
          category: "semantics",
          remediation:
            "Use sequential heading levels to preserve document outline.",
          location: locate(heading),
        });
      }
      previous = level;
    }
    return diagnostics;
  },
};

export const htmlLangRule: RuleDefinition = {
  meta: {
    id: "html-lang",
    description: "Ensure html element defines a language.",
    category: "semantics",
    defaultSeverity: "error",
    tags: ["wcag-3.1.1"],
  },
  check({ document, locate }) {
    if (!document) return [];
    const html = document.documentElement;
    if (!html || html.getAttribute("lang")) return [];
    return [
      {
        ruleId: "html-lang",
        message: "The <html> element is missing a lang attribute.",
        severity: "error",
        category: "semantics",
        remediation: 'Add a valid language code, for example <html lang="en">.',
        location: locate(html),
      },
    ];
  },
};
