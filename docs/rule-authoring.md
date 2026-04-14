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
        tags: ["custom"]
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

## Rule Option Schemas

Define `meta.optionsSchema` to document and validate configurable rule behavior.
Integrations can surface these options in their own config UX.
