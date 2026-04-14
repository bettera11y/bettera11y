# BetterA11y Integration Examples

These examples are reference implementations that show how external packages can
consume the standalone `bettera11y` core API.

- `eslint-style-adapter.ts`: maps BetterA11y diagnostics to ESLint message shape.
- `vite-style-adapter.ts`: demonstrates a long-lived session API suitable for Vite watch mode.

Notes:

- They are intentionally lightweight and framework-agnostic.
- They do not introduce runtime coupling in the core package.
- Real integration repos can copy these patterns and extend host-specific behavior.
