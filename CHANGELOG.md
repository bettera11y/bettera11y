# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2](https://github.com/bettera11y/bettera11y/compare/v0.4.1...v0.4.2) (2026-04-14)


### Bug Fixes

* map TSX/JSX diagnostic locations to original source ([0fa8650](https://github.com/bettera11y/bettera11y/commit/0fa8650b4e39b68ea8dce248329eadcb719fa18e))

## [0.4.1](https://github.com/bettera11y/bettera11y/compare/v0.4.0...v0.4.1) (2026-04-14)


### Bug Fixes

* improve TSX JSX extraction and skip main-landmark for non-page inputs ([fb150dc](https://github.com/bettera11y/bettera11y/commit/fb150dc30bf83f4ea0b8ec34b8bc1bb7c79fb66c))

## [0.4.0](https://github.com/bettera11y/bettera11y/compare/v0.3.1...v0.4.0) (2026-04-14)


### Features

* **style:** add contrast and readability auditing rules ([12a8b8e](https://github.com/bettera11y/bettera11y/commit/12a8b8eaf9caaec755805fd3a8d067e0ace51021))
* **wcag:** align rule metadata to wcag 2.1 aa ([7139488](https://github.com/bettera11y/bettera11y/commit/7139488e141ad8978b1920e144d4ae062466ff56))


### Documentation

* **codebase:** harden source docs and readability ([21c25d3](https://github.com/bettera11y/bettera11y/commit/21c25d339cf805e5ff9fdfa597580f32c4753bef))

## [0.3.1](https://github.com/bettera11y/bettera11y/compare/v0.3.0...v0.3.1) (2026-04-14)


### Miscellaneous

* **devx:** enforce format and tests in pre-commit ([e6918b8](https://github.com/bettera11y/bettera11y/commit/e6918b89be9e1b9e31c863ee1fd3513b68c44257))

## [0.3.0](https://github.com/bettera11y/bettera11y/compare/v0.2.1...v0.3.0) (2026-04-14)


### Features

* **api:** introduce prettier-style audit input and parser normalizers ([0e21134](https://github.com/bettera11y/bettera11y/commit/0e2113414f88e43d135af8d1f3ac4895d5429f08))


### Documentation

* **readme:** streamline package overview and usage sections ([613cc32](https://github.com/bettera11y/bettera11y/commit/613cc321016a3e658b3ca8ce39d635469007511b))

## [0.2.1](https://github.com/bettera11y/bettera11y/compare/v0.2.0...v0.2.1) (2026-04-14)


### Bug Fixes

* **ci:** stabilize release validation and npm publish automation ([57f7712](https://github.com/bettera11y/bettera11y/commit/57f771292479ea4b8bcb3abd45c68c431a32ec45))
* **ci:** switch release workflow to release-please CLI ([a07abfb](https://github.com/bettera11y/bettera11y/commit/a07abfbbe8aa4d7e3a81e4216c0735c08e2e4277))

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
