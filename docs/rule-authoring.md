# Rule Authoring Guide

Rules are pure analyzers that receive `RuleContext` and emit diagnostics.

## Rule Structure

```ts
import type { RuleDefinition } from "bettera11y";

export const myRule: RuleDefinition = {
    meta: {
        id: "my-rule-id",
        description: "What the rule checks",
        category: "semantics",
        defaultSeverity: "warn",
        tags: ["custom"],
        wcagAlignment: "heuristic", // or "normative"
        wcagCriteria: ["1.3.1"], // only for normative mappings
        wcagNotes: "Explain limitations for static or heuristic checks."
    },
    async check(context) {
        // return diagnostics
        return [];
    }
};
```

## Best Practices

- Keep `meta.id` stable; treat id changes as breaking.
- Use `context.locate(element)` for best-effort source locations.
- Return concise remediation guidance for each diagnostic.
- Keep rule execution deterministic (sorted traversals where relevant).
- Use `context.signal` to bail out early during cancellations.
- Add JSDoc blocks for non-trivial helpers and constants used by your rule implementation.

## Rule Option Schemas

Define `meta.optionsSchema` to document and validate configurable rule behavior.
Integrations can surface these options in their own config UX.

Example for style auditing options:

```ts
optionsSchema: {
    minContrastNormal: { type: "number", defaultValue: 4.5 },
    minContrastLarge: { type: "number", defaultValue: 3 },
    minFontSizePx: { type: "number", defaultValue: 12 }
}
```

## WCAG Metadata Guidance

- Use `wcagAlignment: "normative"` only when the check directly corresponds to a WCAG success criterion.
- Use `wcagAlignment: "heuristic"` for proxy checks, best-practice warnings, or checks with known static-analysis limits.
- Add `wcagCriteria` for normative checks and `wcagNotes` to explain confidence/limitations where needed.
