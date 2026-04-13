# General — Context

**Last Updated:** 2026-04-13
**Status:** Active
**Next Task ID:** TP-006

---

## Current State

This is the default task area for pi-fallback-router. Tasks that don't belong
to a specific domain area are created here.

Taskplane is configured and ready for task execution. Use `/task` for single
tasks or `/orch all` for parallel batch execution.

---

## Completed Tasks

- **TP-001** (2026-04-13): Smart Model Caching — ✅ Implemented

---

## Pending Tasks

| ID | Title | Size | Priority |
|----|-------|------|----------|
| TP-002 | Fix parseModelString Edge Case | S | Medium |
| TP-003 | Persist Cache to Disk | M | Medium |
| TP-004 | Deduplicate getModelOrder Logic | S | Low |
| TP-005 | Add Cost Tracking | M | Low |

---

## Key Files

| Category | Path |
|----------|------|
| Extension | `src/index.ts` |
| Tests | `src/__tests__/fallback.test.ts` |
| Tasks | `taskplane-tasks/` |
| Config | `.pi/task-runner.yaml` |

---

## Running Tests

```bash
npm run test:run      # Run tests once
npm run test          # Watch mode
npm run test:coverage # With coverage
```

---

## Technical Debt / Future Work

- [ ] Persist cache to disk for cross-session continuity
- [ ] Add configurable TTL via config file
- [ ] Add metrics/analytics for model success rates
- [ ] Consider cluster-based fallback (group by provider region)

---

## Next Task ID
TP-006
