# TP-006: Consolidate Tests & Prepare for Publishing

**Status:** Pending
**Size:** M
**Priority:** High

## Goal

Refactor the test suite to test real exported functions instead of duplicated copies, remove the ad-hoc integration test from the project root, and prepare `package.json` for npm publishing.

## Background

Currently:
- `src/__tests__/fallback.test.ts` copies pure functions inline instead of importing from `src/index.ts`. This means tests can drift from the real implementation.
- `test-real-minimax.ts` sits at the project root — it's a one-off script, not a proper test.
- `package.json` has `"private": true`, missing publish metadata, and no `files` whitelist.

## Steps

- [ ] **Step 1: Export pure functions from `src/index.ts`**
  - Export these functions so tests can import them directly:
    - `parseModelString`
    - `isRetryableError`
    - `parseProviderError`
    - `extractRetryDelay`
    - `loadFallbackChains`
    - `getModelOrder`
    - `buildProviderModels`
  - Also export the types: `FallbackChain`, `ProviderError`, `ChainCache`, `FailedModel`
  - Export constants: `CACHE_TTL_MS`, `FAILED_COOLDOWN_MS`
  - Keep the default export (extension entry point) unchanged
  - Run `npm run check` to verify types still compile

- [ ] **Step 2: Refactor `src/__tests__/fallback.test.ts` to import real functions**
  - Remove all inline function copies (parseModelString, isRetryableError, parseProviderError, extractRetryDelay, etc.)
  - Import the actual functions from `../index.js`
  - Keep all existing test cases and assertions — they should pass unchanged against the real code
  - Add a few additional tests:
    - `isRetryableError` returns `{ retryable: true, delayMs: 15000 }` for a Google 429 with RetryInfo
    - `isRetryableError` returns `{ retryable: false }` for "400 Bad Request"
    - `loadFallbackChains` returns empty object when config file doesn't exist
    - `parseModelString` with empty string returns null
    - `buildProviderModels` generates correct model configs from chains
  - Run `npm run test:run` — all tests must pass

- [ ] **Step 3: Move `test-real-minimax.ts` to `scripts/`**
  - Create `scripts/` directory
  - Move `test-real-minimax.ts` to `scripts/test-real-minimax.ts`
  - Add a comment at the top explaining it's a manual integration test, not part of the automated suite
  - Add `"scripts:integration": "npx tsx scripts/test-real-minimax.ts"` to package.json scripts (optional, documented)
  - Remove the old file from the root

- [ ] **Step 4: Update `package.json` for publishing**
  - Remove `"private": true`
  - Add `"files": ["dist"]` to whitelist only the compiled output
  - Add `"types": "dist/index.d.ts"`
  - Add `"sideEffects": false`
  - Update `description` to something compelling: "Model fallback chain extension for pi — automatic retry and failover across AI providers"
  - Add these fields (operator should fill in author/repo):
    ```json
    "license": "MIT",
    "repository": { "type": "git", "url": "" },
    "author": "",
    "bugs": { "url": "" },
    "homepage": ""
    ```
  - Add `"prepublishOnly": "npm run build"` script
  - Ensure `keywords` includes: `"pi-extension"`, `"fallback"`, `"failover"`, `"model-routing"`, `"high-availability"`, `"ai-provider"`
  - Remove `pi` field — it's for local development only, not needed for published package
  - Run `npm run build && npm run test:run` to verify everything works

- [ ] **Step 5: Final verification**
  - Run `npm run check` — must pass with zero errors
  - Run `npm run test:run` — all tests must pass
  - Run `npm run build` — must compile cleanly
  - Verify `dist/` contains `index.js`, `index.d.ts`, and source maps
  - Verify no test files or scripts are included in `dist/`

## Dependencies

None — this is the foundation task.

## Out of Scope

- Writing new tests for the streaming/fallback logic (that's complex mock work for later)
- Actually publishing to npm (operator does that)
- Changing the extension API or behavior
