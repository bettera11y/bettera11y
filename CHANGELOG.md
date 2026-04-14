# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0](https://github.com/bettera11y/bettera11y/compare/v0.1.0...v0.2.0) (2026-04-14)


### Features

* **ci:** add automated release PR and publish pipelines ([5018410](https://github.com/bettera11y/bettera11y/commit/50184109fd5ceddaf668e53728914e76fc10a07c))


### Bug Fixes

* **ci:** allow release-please PR creation and node24 runtime ([1f56fa6](https://github.com/bettera11y/bettera11y/commit/1f56fa66e9b0e844360f333250c9b78adec4ab05))


### Miscellaneous

* initialize repository ([eeb2bc5](https://github.com/bettera11y/bettera11y/commit/eeb2bc57da437305693811f1c7d28b34c74ea74d))
* **tests:** add missing test snapshots ([2d11c73](https://github.com/bettera11y/bettera11y/commit/2d11c733af81b31e5bdbf9759c3f37d477f4c46e))

## [Unreleased]

### Added

- Versioned standalone contracts (`input`, `diagnostics`, `rules`, `session`).
- Async audit engine session API with cancellation and incremental caching.
- Expanded rule coverage with recommended/strict/WCAG-AA baseline presets.
- Integration mapping utilities for source locations, severity translation, and deterministic fingerprints.
- Contract, performance, and deterministic incremental test coverage.
- Integration and rule authoring documentation for downstream packages.
