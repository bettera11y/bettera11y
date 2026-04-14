# Integration Authoring Guide

This package is a standalone core API. External integrations should import this
library and own their runtime concerns.

## Recommended Integration Shape

1. Consume one of the exported presets (`recommendedPreset`, `strictPreset`, `wcagAaBaselinePreset`).
2. Create an engine via `createEngine(preset, config)`.
3. Use `createAuditSession()` in watch/dev-server workflows.
4. Feed normalized `AuditInput` documents into `session.run()` or `session.runIncremental()`.
5. Convert diagnostics to host-native payloads using utility helpers.

See concrete reference implementations in [`examples/README.md`](../examples/README.md).

## Host Mapping Utilities

- `selectorToSourceLocation`: fallback source mapping helper.
- `translateSeverity`: map BetterA11y severity to host severity conventions.
- `createDiagnosticFingerprint`: deterministic id for dedupe across incremental updates.

## Contract Notes

- Prefer `kind: "html"` or `kind: "virtual-file"` inputs.
- Set `source.path`, `source.language`, and `source.contentHash` when possible.
- Pass `AbortSignal` for cancellation-aware integration behavior.
- For compatibility checks, assert `BETTERA11Y_API_VERSION` at startup.

## Migration and Deprecation

- New contracts are added in minor versions.
- Deprecated contracts remain for at least one minor line before removal in the next major.
- Read `CHANGELOG.md` on every upgrade and gate upgrades with `npm run validate:release`.
