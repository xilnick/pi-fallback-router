# pi-fallback-router

A custom provider extension for [pi](https://github.com/badlogic/pi-mono) that implements model fallback chains for reliable routing when primary models fail.

## Features

- **Automatic Fallback**: When a model fails with a retryable error (rate limit, overloaded, network issue), the extension automatically tries the next model in the chain
- **Configurable Chains**: Define fallback chains in a JSON config file
- **Virtual Models**: Works like a single model to pi, while delegating to real providers behind the scenes

## Installation

1. Clone or copy this extension to your extensions directory:
   ```bash
   # Option 1: Use directly
   pi -e /path/to/pi-fallback-router/src/index.ts
   
   # Option 2: Install to ~/.pi/agent/extensions/
   cp -r /path/to/pi-fallback-router ~/.pi/agent/extensions/pi-fallback-router
   ```

## Configuration

Create a config file at `~/.pi/fallback-chains.json`:

```json
{
  "reviewer": [
    "google/gemini-3.1-pro-preview",
    "google/gemini-2.5-pro"
  ],
  "worker": [
    "google/gemini-3-flash-preview",
    "google/gemini-2.5-flash"
  ]
}
```

Each chain is a JSON array of model strings in the format `provider/model-id`.

## Usage

After creating the config, load the extension:

```bash
pi -e ./src/index.ts
```

Then select a fallback model:

```
/model fallback/reviewer
```

Or use the `--model` flag:

```bash
pi --model fallback/reviewer -p "explain this code"
```

## Supported Providers

The extension supports any provider registered with pi, including:

- `google` - Google Gemini API
- `google-gemini-cli` - Google Gemini CLI
- `google-antigravity` - Google Antigravity (includes Claude models)
- `google-vertex` - Google Vertex AI
- `anthropic` - Anthropic Claude API
- `openai` - OpenAI models
- `mistral` - Mistral models
- And more...

## How It Works

1. When you select a `fallback/<chain-name>` model, the extension looks up the chain in your config
2. It attempts the first model in the chain
3. If the model fails with a retryable error (429, 529, network errors, etc.), it fails over to the next model
4. This continues until a model succeeds or all models in the chain have failed

## Retryable Errors

The extension automatically retries on these error types:

- HTTP 429 (Rate Limit)
- HTTP 529 (Overloaded)
- Network errors (fetch failed, connection refused, timeout)
- Service unavailable errors

Non-retryable errors (like authentication failures or invalid requests) immediately fail the chain.

## Example Use Cases

1. **High Availability**: Chain multiple providers for reliability
2. **Cost Management**: Use expensive models only as fallback
3. **Regional Redundancy**: Chain models from different regions/data centers
4. **Feature Fallback**: Chain models with different capability levels

## Troubleshooting

### Model Not Found

Make sure the model IDs match exactly what's shown in `pi --list-models`. For example, use `gemini-3.1-pro-preview` not `gemini-3.1-pro`.

### API Key Errors

Ensure you have API keys configured for all providers in your chains. The extension uses pi's model registry to resolve API keys.

### No Fallback Triggered

Check that the error is actually retryable. Non-retryable errors (400, 401, 403) will fail the chain immediately.

## License

MIT
