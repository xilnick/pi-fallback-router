# TP-008: Add License, Contributing Guide & Changelog

**Status:** Pending
**Size:** S
**Priority:** Medium

## Goal

Complete the open-source hygiene checklist: MIT license, contribution guidelines, and a changelog tracking what ships in v1.0.0.

## Background

The README claims MIT license but no `LICENSE` file exists. There's no `CONTRIBUTING.md`, and no changelog — both expected by developers browsing or evaluating the project.

## Steps

- [ ] **Step 1: Create `LICENSE` file**
  - Use the standard MIT License template
  - Year: 2026 (or current year)
  - Full name: use "The pi-fallback-router Contributors" or operator's name
  - Place in the project root alongside `README.md`

- [ ] **Step 2: Create `CONTRIBUTING.md`**
  - **Development Setup:**
    - Clone the repo
    - Run `npm install` to install dependencies
    - Run `npm run check` to verify TypeScript compiles
    - Run `npm run test:run` to run the test suite
    - Run `npm run build` to compile to `dist/`
  - **Code Style:**
    - TypeScript strict mode is enforced (no `any` without good reason)
    - Run `npm run check` before committing
  - **Testing:**
    - All new functions need unit tests in `src/__tests__/`
    - Run `npm run test:run` — all tests must pass
    - Aim for tests that cover edge cases, not just happy paths
  - **Debugging:**
    - Set `PI_EXTENSION_DEBUG=true` when running pi to see verbose logs
    - Example: `PI_EXTENSION_DEBUG=true pi -e ./src/index.ts --model fallback/worker -p "test"`
  - **Submitting Changes:**
    - Open a GitHub issue first for non-trivial changes
    - Keep PRs focused and small (one feature or fix per PR)
    - Include tests for new behavior
    - Update `CHANGELOG.md` under the "Unreleased" section
  - **Branch Model:**
    - `main` is the stable branch
    - Feature branches from `main`, PRs back to `main`
    - No direct commits to `main`

- [ ] **Step 3: Create `CHANGELOG.md`**
  - Use [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
  - Sections: `Unreleased`, `Added`, `Changed`, `Fixed`, `Removed`
  - For v1.0.0, document everything that's been built:
    - **Added:** Extension entry point (`pi.registerProvider`)
    - **Added:** Fallback chain configuration via `~/.pi/fallback-chains.json`
    - **Added:** Automatic retry on retryable errors (429, 529, network errors, etc.)
    - **Added:** Model caching (last working model cached for 1 hour)
    - **Added:** Failed model cooldown (5-minute cooldown before retrying failed models)
    - **Added:** Exponential backoff for retries
    - **Added:** Configurable retry delays from Google API RetryInfo metadata
    - **Added:** Debug logging via `PI_EXTENSION_DEBUG` env var
    - **Added:** Unit test suite (23 tests)
    - **Added:** 10-second connection timeout to prevent streams from hanging
  - Under `Unreleased`, add a note: "No unreleased changes yet" (or link to the current work)
  - The changelog should tell the story of v1.0.0 to someone evaluating the project

- [ ] **Step 4: Verify completeness**
  - Confirm `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `README.md` all exist
  - Confirm the year in LICENSE is correct
  - Confirm `CHANGELOG.md` has v1.0.0 entry with at least 8 items in **Added**
  - Confirm `CONTRIBUTING.md` references `PI_EXTENSION_DEBUG` for debugging

## Dependencies

- TP-006 and TP-007 should be complete before or alongside this task

## Out of Scope

- Actually publishing to npm
- Setting up CI/CD (GitHub Actions, etc.)
- Writing a security policy
- Creating a code of conduct
