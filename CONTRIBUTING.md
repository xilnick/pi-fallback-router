# Contributing to pi-fallback-router

Thanks for your interest! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone <repo-url>
cd pi-fallback-router

# Install dependencies
npm install

# Verify everything works
npm run check        # TypeScript type check
npm run test:run     # Run test suite
npm run build        # Compile to dist/
```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for any new behavior
4. Run the full check suite:

```bash
npm run check && npm run test:run && npm run build
```

5. Open a PR against `main`

## Code Style

- TypeScript strict mode is enforced — avoid `any` without good reason
- Keep the extension in a single file (`src/index.ts`) — it's a small, focused extension
- Export pure functions for testability (see existing exports)
- JSDoc comments on all exported functions and types

## Testing

- All new functions need unit tests in `src/__tests__/fallback.test.ts`
- Import from the real module: `import { ... } from "../index.js"`
- Aim for edge cases, not just happy paths
- Run with `npm run test:run` (or `npm test` for watch mode)

## Debugging

Set `PI_EXTENSION_DEBUG=true` when running pi to see verbose fallback logs:

```bash
PI_EXTENSION_DEBUG=true pi -e ./src/index.ts --model fallback/worker -p "test message"
```

## Submitting Changes

- **Small PRs** — one feature or fix per PR
- **Include tests** — PRs without tests for new behavior will be asked to add them
- **Update CHANGELOG.md** — add entries under the "Unreleased" section
- **Open an issue first** for non-trivial changes to discuss the approach

## Branch Model

- `main` is the stable branch
- Feature branches from `main`, PRs back to `main`
- No direct commits to `main`

## Questions?

Open an issue — happy to help!
