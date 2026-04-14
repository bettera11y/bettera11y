# Integration Authoring Guide

This package is a standalone core API. External integrations should import this
library and own their runtime concerns.

## Recommended Integration Shape

1. Consume one of the exported presets (`recommendedPreset`, `strictPreset`, `wcagAaBaselinePreset`).
2. Call `audit(source, options)` or `auditIncremental(request, options)` for stateless checks.
3. Use `startAuditSession(options)` in watch/dev-server workflows.
4. Feed content-first `AuditInput` values into `session.audit()` or `session.auditIncremental()`.
5. Convert diagnostics to host-native payloads using utility helpers.

See concrete reference implementations in [`examples/README.md`](../examples/README.md).

## Host Mapping Utilities

- `selectorToSourceLocation`: fallback source mapping helper.
- `translateSeverity`: map BetterA11y severity to host severity conventions.
- `createDiagnosticFingerprint`: deterministic id for dedupe across incremental updates.

## Contract Notes

- Prefer `audit(sourceText, { filepath })` for Prettier-style ergonomics.
- Use `format` to override parser inference (`html`, `markdown`, `jsx`, `tsx`, `text`).
- `source` is optional provenance metadata, not a required file-path contract.
- Pass `AbortSignal` for cancellation-aware integration behavior.
- For compatibility checks, assert `BETTERA11Y_API_VERSION` at startup.
