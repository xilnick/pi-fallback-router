# pi-fallback-router

**Automatic model failover for [pi](https://github.com/badlogic/pi-mono)** — when your primary AI model fails, instantly falls back to the next one.

[![npm version](https://img.shields.io/npm/v/pi-fallback-provider.svg)](https://www.npmjs.com/package/pi-fallback-provider) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why?

AI providers go down. Rate limits hit. Networks flake. Instead of manually switching models every time something breaks, **pi-fallback-router** handles it automatically:

1. You define a priority-ordered chain of models
2. It tries the first model
3. If it fails with a retryable error (429, 529, timeout, network error…) it moves to the next
4. It remembers what works and caches it for ~1 hour

**You type `fallback/reviewer` once. The router handles the rest.**

## Highlights

- ⚡ **Zero-config failover** — define chains in a JSON file, done
- 🧠 **Smart caching** — remembers the last working model for ~1 hour, skips known failures
- 🔄 **Automatic retries** — exponential backoff with configurable limits
- ⏱️ **Retry-aware delays** — reads Google API `RetryInfo` headers to respect provider rate limits
- 🐛 **Debug mode** — set `PI_EXTENSION_DEBUG=true` for verbose logging
- 📦 **Tiny footprint** — single-file extension, no runtime dependencies

## Quick Start

**1. Install:**

```bash
npm install pi-fallback-provider
```

**2. Create `~/.pi/fallback-chains.json`:**

```json
{
  "worker": [
    "google/gemini-2.5-pro",
    "anthropic/claude-sonnet-4",
    "openai/gpt-4o"
  ],
  "reviewer": [
    "anthropic/claude-sonnet-4",
    "google/gemini-2.5-flash"
  ]
}
```

**3. Load the extension:**

```bash
pi -e node_modules/pi-fallback-provider/dist/index.js --model fallback/worker
```

**4. Verify it works:**

```bash
PI_EXTENSION_DEBUG=true pi -e node_modules/pi-fallback-provider/dist/index.js \
  --model fallback/worker -p "Say hello"
```

You should see `[Fallback]` debug logs showing which model was selected.

## Configuration

The config file lives at `~/.pi/fallback-chains.json`. Each key is a chain name you can reference as `fallback/<chain-name>`.

```json
{
  "chain-name": ["provider/model-id", "provider/model-id", ...]
}
```

Model IDs use the format `provider/model-id` — the same strings shown by `pi --list-models`.

### Common Configurations

**High availability** — 3 providers, automatic failover:

```json
{
  "default": [
    "google/gemini-2.5-pro",
    "anthropic/claude-sonnet-4",
    "openai/gpt-4o"
  ]
}
```

**Cost optimization** — cheap primary, expensive fallback:

```json
{
  "economy": [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "anthropic/claude-sonnet-4"
  ]
}
```

**Regional redundancy** — different endpoints for the same provider:

```json
{
  "resilient": [
    "google/gemini-2.5-pro",
    "google-vertex/gemini-2.5-pro",
    "google-gemini-cli/gemini-2.5-pro"
  ]
}
```

## How It Works

```
Request → Try model-1
              ├─ Success → Stream response, cache model-1
              └─ Retryable error → Try model-2
                                      ├─ Success → Stream, cache model-2
                                      └─ Retryable error → Try model-3…
                                                              └─ All failed → Error
```

- **Caching:** The last successful model is cached for 1 hour. On the next request, it's tried first.
- **Cooldown:** Failed models are tracked with a 5-minute cooldown before they're retried.
- **Retries:** Each model gets up to 10 retries with exponential backoff before moving to the next.
- **Timeout:** Each connection has a 10-second timeout to prevent hanging streams.

## Retryable Errors

The router automatically retries on these error types:

| Error Type | Examples |
|---|---|
| HTTP 429 | Rate limit, quota exceeded |
| HTTP 529 | Provider overloaded |
| HTTP 5xx | Server errors (500, 502, 503, 504) |
| Network | `fetch failed`, `connection refused`, `ECONNRESET` |
| Timeout | Request timeout, socket hang up |
| Provider status | `RESOURCE_EXHAUSTED`, `UNAVAILABLE`, `OVERLOADED` |

**Non-retryable errors** (400, 401, 403, invalid model, missing API key) fail the chain immediately — no point retrying those.

## Supported Providers

Any provider registered with pi works. Use the exact provider name from `pi --list-models`:

- `google` — Google Gemini API
- `anthropic` — Anthropic Claude API
- `openai` — OpenAI models
- `google-vertex` — Google Vertex AI
- `google-gemini-cli` — Gemini CLI
- `google-antigravity` — Google Antigravity (includes Claude models)
- `mistral` — Mistral models
- And any other registered provider…

## Troubleshooting

### "Model not found"

Check the model ID matches exactly what `pi --list-models` shows. Common mistake: using `gemini-2.5-pro` when the ID is `google/gemini-2.5-pro`.

### "No fallback triggered"

The error might be non-retryable. Authentication failures (401), bad requests (400), and forbidden errors (403) skip the fallback chain entirely — the issue is your API key or request, not the provider.

### "Extension not loading"

Verify the path is correct and points to `dist/index.js` (compiled), not `src/index.ts`:
```bash
pi -e ./node_modules/pi-fallback-provider/dist/index.js ...
```

### "Chain is empty"

Make sure your config file exists at `~/.pi/fallback-chains.json` and has at least one chain with valid model strings (must contain a `/`).

### Debug mode

Set `PI_EXTENSION_DEBUG=true` for detailed logs showing model selection, retries, and errors:
```bash
PI_EXTENSION_DEBUG=true pi -e ./dist/index.js --model fallback/worker -p "test"
```

## API (for extension developers)

The extension exports its internal functions for testing or custom integrations:

```typescript
import {
  parseModelString,
  isRetryableError,
  parseProviderError,
  extractRetryDelay,
  loadFallbackChains,
  getModelOrder,
  buildProviderModels,
  CACHE_TTL_MS,
  FAILED_COOLDOWN_MS,
} from "pi-fallback-provider";
```

## License

MIT
