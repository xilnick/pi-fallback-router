# TP-001: Smart Model Caching for Fallback Provider

**Status:** Implemented
**Size:** M
**Priority:** High
**Created:** 2026-04-13

## Summary

Implemented smart caching for the fallback provider extension to reduce latency by remembering the last working model and avoiding unnecessary fallback attempts on subsequent requests.

## Problem

The original fallback implementation tried models sequentially on every request, even when the same model worked successfully on the previous request. This caused unnecessary latency and API calls.

## Solution

Implemented a caching strategy with the following behavior:

1. **Cache working model**: After a successful request, cache the model that responded for 1 hour (TTL)
2. **Fast path**: On subsequent requests, try the cached model first
3. **Skip failed models**: Track failed models with a 5-minute cooldown to avoid hammering rate-limited endpoints
4. **Wrap-around**: If cached model fails, try subsequent models, then wrap around to try earlier models

## Implementation Details

### Cache Structure
```typescript
interface ChainCache {
  workingModel: string;      // e.g., "google/gemini-2.5-pro"
  timestamp: number;         // Date.now() when cached
  workingIndex: number;      // Index in chain for ordering
}
```

### Failed Model Tracking
```typescript
interface FailedModel {
  failedAt: number;         // Date.now() when failed
  retryDelayMs?: number;    // Optional delay from error
}
```

### Configuration
- **Cache TTL**: 60 minutes (configurable)
- **Failed cooldown**: 5 minutes

## Model Selection Algorithm

```
1. If cache valid (within TTL):
   a. Try cached model first
   b. Try subsequent models (skip if on cooldown)
   c. Try earlier models (wrap around, skip if on cooldown)
   
2. If cache invalid/expired:
   a. Try models in chain order (skip if on cooldown)
```

## Files Modified

- `src/index.ts` - Core implementation with caching logic

## Testing

Verified that:
- Extension loads correctly with cache parameters
- Cache TTL and cooldown values are logged
- Model selection respects cache and failure tracking

## Related

- Original extension: TP-000 (if exists)
- Future: Persist cache to disk for cross-session continuity
