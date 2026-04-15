# TP-006: Consolidate Tests & Prepare for Publishing — Status

**Task ID:** TP-006
**Last Updated:** 2026-04-15
**Status:** ✅ Complete
**Started:** Not started
**Wave:** 1

## Steps

- [ ] Step 1: Export pure functions from `src/index.ts`
- [ ] Step 2: Refactor `src/__tests__/fallback.test.ts` to import real functions
- [ ] Step 3: Move `test-real-minimax.ts` to `scripts/`
- [ ] Step 4: Update `package.json` for publishing
- [ ] Step 5: Final verification

## Notes

Foundation task — must be completed first.

## Exit Criteria

- All functions exported from `src/index.ts` are importable
- All tests pass against real implementations
- `test-real-minimax.ts` moved to `scripts/`
- `package.json` has no `"private": true`, has `files`, `types`, `sideEffects`
- `npm run check && npm run test:run && npm run build` all pass

| 2026-04-15 22:32 | Task started | Runtime V2 lane-runner execution |
| 2026-04-15 22:32 | Task complete | .DONE created |