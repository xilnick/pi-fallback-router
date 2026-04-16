# Changelog

All notable changes to pi-fallback-router will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-04-16

### Added

- Extension entry point via `pi.registerProvider("fallback", ...)` — registers as a pi provider
- Fallback chain configuration via `~/.pi/fallback-chains.json` — define named chains of models
- Automatic failover on retryable errors (429, 529, 5xx, network errors, timeouts)
- Model caching — last working model cached for 1 hour, tried first on next request
- Failed model cooldown — 5-minute cooldown before retrying previously failed models
- Exponential backoff with per-model retry limits (up to 10 retries per model)
- Retry delay extraction from Google API `RetryInfo` error details
- 10-second connection timeout to prevent streams from hanging indefinitely
- Debug logging via `PI_EXTENSION_DEBUG=true` environment variable
- Stream buffering — buffers events until real content arrives before committing to a model
- All pure functions exported for testing and external use
- Unit test suite with 24 tests covering parsing, error detection, caching, and validation
- MIT license

### Changed

- Refactored test suite to import real exported functions instead of inline copies
- Moved integration test script to `scripts/test-real-minimax.ts`
- Prepared `package.json` for npm publishing (removed `private`, added `files`, `types`, `sideEffects`)

## [Unreleased]

_No unreleased changes._
