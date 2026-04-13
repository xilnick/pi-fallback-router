/**
 * Fallback Router Extension for pi
 * 
 * Implements model fallback chains with smart caching.
 * - Caches the last working model for ~1 hour
 * - On failure, tries next model and remembers the failure
 * - Clears cached model on persistent failures
 * 
 * Usage:
 *   1. Create ~/.pi/fallback-chains.json with your chains
 *   2. Load via: pi -e ~/.pi/extensions/pi-fallback-provider/src/index.ts
 *   3. Select models like: fallback/reviewer or fallback/worker
 */

import * as fs from "node:fs";
import {
  createAssistantMessageEventStream,
  type Api,
  type AssistantMessage,
  type AssistantMessageEventStream,
  type Context,
  type Model,
  type SimpleStreamOptions,
  streamSimple,
} from "@mariozechner/pi-ai";
import type { ExtensionAPI, ModelRegistry } from "@mariozechner/pi-coding-agent";

/** Fallback chain configuration */
interface FallbackChain {
  [chainName: string]: string[];
}

/** Parsed error from provider APIs */
interface ProviderError {
  code?: number | string;
  status?: string;
  message?: string;
  details?: Array<{
    "@type"?: string;
    retryDelay?: string;
    [key: string]: unknown;
  }>;
}

/** Cached state for a chain */
interface ChainCache {
  /** Last working model string (e.g., "google/gemini-2.5-pro") */
  workingModel: string;
  /** When the cache was set (Date.now()) */
  timestamp: number;
  /** Index in the chain that was working */
  workingIndex: number;
}

/** Failed model tracking */
interface FailedModel {
  /** When it failed (Date.now()) */
  failedAt: number;
  /** Optional retry delay from the error */
  retryDelayMs?: number;
}

/** Path to fallback chains config */
const CONFIG_PATH = `${process.env.HOME || process.env.USERPROFILE || "~"}/.pi/fallback-chains.json`;

/** Cache TTL: 1 hour in milliseconds */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Failed model cooldown: 5 minutes */
const FAILED_COOLDOWN_MS = 5 * 60 * 1000;

/** Load fallback chains from config file */
function loadFallbackChains(): FallbackChain {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.warn(`[Fallback] Config not found at ${CONFIG_PATH}`);
      return {};
    }
    
    const content = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(content);
    
    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      console.error("[Fallback] Config must be a JSON object");
      return {};
    }
    
    const chains: FallbackChain = {};
    for (const [chainName, chain] of Object.entries(config)) {
      if (!Array.isArray(chain)) {
        console.warn(`[Fallback] Chain "${chainName}" must be an array, skipping`);
        continue;
      }
      if (chain.length === 0) {
        console.warn(`[Fallback] Chain "${chainName}" is empty, skipping`);
        continue;
      }
      chains[chainName] = chain.filter((m): m is string => typeof m === "string" && m.includes("/"));
    }
    
    return chains;
  } catch (error) {
    console.error(`[Fallback] Failed to load config from ${CONFIG_PATH}:`, error);
    return {};
  }
}

/** Extract error info from various error formats */
function parseProviderError(errorMessage: string): ProviderError | null {
  try {
    const parsed = JSON.parse(errorMessage);
    if (parsed.error) {
      return {
        code: parsed.error.code,
        status: parsed.error.status,
        message: parsed.error.message,
        details: parsed.error.details,
      };
    }
    return {
      code: parsed.code,
      status: parsed.status,
      message: parsed.message,
      details: parsed.details,
    };
  } catch {
    return null;
  }
}

/** Extract retry delay from error (e.g., "53.021s" -> 53021) */
function extractRetryDelay(error: ProviderError): number | null {
  if (!error.details) return null;
  
  for (const detail of error.details) {
    if (detail["@type"]?.includes("RetryInfo") && detail.retryDelay) {
      const match = detail.retryDelay.match(/^([\d.]+)s$/);
      if (match) {
        return Math.round(parseFloat(match[1]) * 1000);
      }
    }
  }
  return null;
}

/** Check if an error is retryable */
function isRetryableError(errorMessage: string): { retryable: boolean; delayMs?: number } {
  const parsed = parseProviderError(errorMessage);
  
  if (parsed) {
    if (parsed.code === 429 || parsed.code === 529) {
      const delay = extractRetryDelay(parsed);
      return { retryable: true, delayMs: delay ?? undefined };
    }
    
    const retryableStatuses = ["RESOURCE_EXHAUSTED", "OVERLOADED", "UNAVAILABLE", "DEADLINE_EXCEEDED"];
    if (parsed.status && retryableStatuses.includes(parsed.status)) {
      const delay = extractRetryDelay(parsed);
      return { retryable: true, delayMs: delay ?? undefined };
    }
  }
  
  const message = errorMessage.toLowerCase();
  const retryablePatterns = [
    "rate limit", "overloaded", "too many requests", "fetch failed",
    "network error", "connection refused", "timeout",
    "temporarily unavailable", "service unavailable", "429", "529", "resource_exhausted",
  ];
  
  return { retryable: retryablePatterns.some((p) => message.includes(p)) };
}

/** Parse provider/model string */
function parseModelString(modelString: string): { provider: string; modelId: string } | null {
  const parts = modelString.split("/");
  if (parts.length < 2) return null;
  return {
    provider: parts[0],
    modelId: parts.slice(1).join("/"),
  };
}

/** Create error output message */
function createErrorMessage(model: Model<Api>, error: unknown, chainName: string): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: chainName,
    usage: {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
    },
    stopReason: "error",
    errorMessage: error instanceof Error ? error.message : String(error),
    timestamp: Date.now(),
  };
}

/** Wait for specified milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Determine the order of models to try based on cache */
function getModelOrder(
  chainName: string,
  fallbackList: string[],
  cache: ChainCache | null,
  failedModels: Map<string, FailedModel>
): { models: string[]; startIndex: number; usedCache: boolean } {
  
  const now = Date.now();
  
  // Check if cache is valid
  if (cache && cache.workingModel && now - cache.timestamp < CACHE_TTL_MS) {
    const cachedIndex = fallbackList.indexOf(cache.workingModel);
    if (cachedIndex !== -1) {
      console.log(`[Fallback] Using cached working model: ${cache.workingModel}`);
      
      // Build order: cached model, then subsequent models (skipping failed ones)
      const ordered: string[] = [cache.workingModel];
      
      // Add subsequent models that aren't failed
      for (let i = cachedIndex + 1; i < fallbackList.length; i++) {
        const model = fallbackList[i];
        const failed = failedModels.get(model);
        if (!failed || now - failed.failedAt > FAILED_COOLDOWN_MS) {
          ordered.push(model);
        } else {
          console.log(`[Fallback] Skipping ${model} (failed ${Math.round((now - failed.failedAt) / 1000)}s ago)`);
        }
      }
      
      // Add earlier models that aren't failed (wrap around)
      for (let i = 0; i < cachedIndex; i++) {
        const model = fallbackList[i];
        const failed = failedModels.get(model);
        if (!failed || now - failed.failedAt > FAILED_COOLDOWN_MS) {
          ordered.push(model);
        }
      }
      
      return { models: ordered, startIndex: 0, usedCache: true };
    }
  }
  
  // No valid cache, try in chain order skipping failed models
  console.log(`[Fallback] No valid cache, starting from beginning`);
  const ordered: string[] = [];
  
  for (const model of fallbackList) {
    const failed = failedModels.get(model);
    if (!failed || now - failed.failedAt > FAILED_COOLDOWN_MS) {
      ordered.push(model);
    } else {
      console.log(`[Fallback] Skipping ${model} (failed ${Math.round((now - failed.failedAt) / 1000)}s ago)`);
    }
  }
  
  return { models: ordered, startIndex: 0, usedCache: false };
}

/** Create a stream that implements fallback logic with caching */
function createFallbackStream(
  chains: FallbackChain,
  getModelRegistry: () => ModelRegistry | null,
  cache: Map<string, ChainCache>,
  failedModels: Map<string, FailedModel>,
  onSuccess: (chainName: string, model: string, index: number) => void,
  onFailure: (model: string, delayMs?: number) => void
): (model: Model<Api>, context: Context, options?: SimpleStreamOptions) => AssistantMessageEventStream {
  
  return function fallbackStream(
    model: Model<Api>,
    context: Context,
    options?: SimpleStreamOptions
  ): AssistantMessageEventStream {
    const stream = createAssistantMessageEventStream();
    const chainName = model.id;
    const fallbackList = chains[chainName];

    if (!fallbackList || fallbackList.length === 0) {
      console.error(`[Fallback] No fallback chain found for: ${chainName}`);
      stream.push({ type: "error", reason: "error", error: createErrorMessage(model, new Error(`Unknown chain: ${chainName}`), chainName) });
      stream.end();
      return stream;
    }

    console.log(`[Fallback] Processing request for chain: ${chainName}`);
    console.log(`[Fallback] Chain: ${fallbackList.join(" -> ")}`);

    (async () => {
      const chainCache = cache.get(chainName) || null;
      
      // Get ordered list of models to try
      const { models: modelOrder, usedCache } = getModelOrder(chainName, fallbackList, chainCache, failedModels);
      
      if (modelOrder.length === 0) {
        console.error(`[Fallback] All models in chain '${chainName}' are temporarily unavailable`);
        stream.push({ type: "error", reason: "error", error: createErrorMessage(model, new Error("All models temporarily unavailable"), chainName) });
        stream.end();
        return;
      }
      
      console.log(`[Fallback] Model order: ${modelOrder.join(" -> ")}`);

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < modelOrder.length; attempt++) {
        const targetModelString = modelOrder[attempt];
        const originalIndex = fallbackList.indexOf(targetModelString);
        const parsed = parseModelString(targetModelString);

        if (!parsed) {
          lastError = new Error(`Invalid model string format: ${targetModelString}`);
          continue;
        }

        const { provider: providerName, modelId: targetModelId } = parsed;

        const modelRegistry = getModelRegistry();
        if (!modelRegistry) {
          console.error(`[Fallback] Model registry not available`);
          lastError = new Error("Model registry not available");
          break;
        }

        try {
          const targetModel = modelRegistry.find(providerName, targetModelId);
          if (!targetModel) {
            console.warn(`[Fallback] Model not found: ${targetModelString}`);
            lastError = new Error(`Model not found: ${targetModelString}`);
            continue;
          }

          const authResult = await modelRegistry.getApiKeyAndHeaders(targetModel);
          if (!authResult.ok || !authResult.apiKey) {
            const errMsg = "error" in authResult ? authResult.error : "Authentication failed";
            console.warn(`[Fallback] No API key for ${targetModelString}: ${errMsg}`);
            lastError = new Error(errMsg);
            continue;
          }

          console.log(`[Fallback] Attempting: ${targetModelString} (${attempt + 1}/${modelOrder.length})`);

          // Buffer events
          const eventBuffer: Parameters<typeof stream.push>[0][] = [];
          const sourceStream = streamSimple(targetModel, context, { ...options, apiKey: authResult.apiKey, headers: authResult.headers });

          let shouldFallback = false;
          
          for await (const event of sourceStream) {
            if (event.type === "error") {
              const errorStr = event.error?.errorMessage || "";
              const { retryable, delayMs } = isRetryableError(errorStr);
              
              if (retryable) {
                console.warn(`[Fallback] ${targetModelString} failed (retryable)`);
                lastError = new Error(errorStr);
                shouldFallback = true;
                
                // Record failure
                onFailure(targetModelString, delayMs);
                
                // If this was the cached model, clear the cache
                if (usedCache && attempt === 0) {
                  console.log(`[Fallback] Cached model failed, will try alternatives`);
                }
                
                // Wait if there's a retry delay
                if (delayMs && attempt < modelOrder.length - 1) {
                  console.log(`[Fallback] Waiting ${delayMs}ms...`);
                  await sleep(delayMs);
                }
                break;
              }
            }
            eventBuffer.push(event);
          }

          if (shouldFallback) {
            eventBuffer.length = 0;
            continue;
          }

          // Success!
          console.log(`[Fallback] ${targetModelString} succeeded`);
          
          // Update cache with this working model
          onSuccess(chainName, targetModelString, originalIndex);
          
          // Emit buffered events
          for (const event of eventBuffer) {
            stream.push(event);
          }
          stream.end();
          return;

        } catch (error) {
          const errorStr = error instanceof Error ? error.message : String(error);
          const { retryable, delayMs } = isRetryableError(errorStr);
          
          console.warn(`[Fallback] ${targetModelString} failed: ${errorStr}`);
          lastError = error instanceof Error ? error : new Error(errorStr);
          
          if (retryable) {
            onFailure(targetModelString, delayMs);
            if (delayMs && attempt < modelOrder.length - 1) {
              await sleep(delayMs);
            }
          }
        }
      }

      // All models failed
      console.error(`[Fallback] All models in chain '${chainName}' failed`);
      stream.push({ type: "error", reason: "error", error: createErrorMessage(model, lastError || new Error("Unknown error"), chainName) });
      stream.end();
    })();

    return stream;
  };
}

/** Build provider config models from chains */
function buildProviderModels(chains: FallbackChain) {
  return Object.keys(chains).map((chainName) => ({
    id: chainName,
    name: `Fallback/${chainName}`,
    reasoning: false,
    input: ["text"] as ("text" | "image")[],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 16384,
  }));
}

/** Extension entry point */
export default function (pi: ExtensionAPI) {
  console.log("[Fallback] Loading Fallback Router Extension...");

  const chains = loadFallbackChains();

  if (Object.keys(chains).length === 0) {
    console.warn("[Fallback] No fallback chains defined in ~/.pi/fallback-chains.json");
    console.warn("[Fallback] Create with: { \"reviewer\": [\"google/gemini-3.1-pro-preview\", \"google/gemini-2.5-pro\"] }");
    return;
  }

  console.log(`[Fallback] Found chains: ${Object.keys(chains).join(", ")}`);
  console.log(`[Fallback] Cache TTL: ${CACHE_TTL_MS / 1000 / 60}min, Failed cooldown: ${FAILED_COOLDOWN_MS / 1000}s`);

  const modelsConfig = buildProviderModels(chains);

  // Cache state - persisted in memory (would need file storage for persistence across restarts)
  const chainCache = new Map<string, ChainCache>();
  const failedModels = new Map<string, FailedModel>();

  // Cache management
  const onSuccess = (chainName: string, model: string, index: number) => {
    chainCache.set(chainName, {
      workingModel: model,
      timestamp: Date.now(),
      workingIndex: index,
    });
    console.log(`[Fallback] Cached working model: ${model} (chain: ${chainName})`);
    
    // Clear failure record for this model
    failedModels.delete(model);
  };

  const onFailure = (model: string, delayMs?: number) => {
    failedModels.set(model, {
      failedAt: Date.now(),
      retryDelayMs: delayMs,
    });
    console.log(`[Fallback] Recorded failure for: ${model}`);
  };

  // Get model registry helper
  let modelRegistryRef: ModelRegistry | null = null;
  const getModelRegistry = (): ModelRegistry | null => modelRegistryRef;

  pi.on("session_start", async (_event, ctx) => {
    modelRegistryRef = ctx.modelRegistry;
  });

  pi.registerProvider("fallback", {
    models: modelsConfig,
    baseUrl: "https://fallback.local", // Placeholder
    apiKey: process.env.FALLBACK_DUMMY_KEY || "dummy", // Placeholder
    api: "anthropic-messages",
    streamSimple: createFallbackStream(chains, getModelRegistry, chainCache, failedModels, onSuccess, onFailure),
  });

  console.log("[Fallback] Extension loaded successfully.");
  console.log(`[Fallback] Available: ${Object.keys(chains).map((c) => `fallback/${c}`).join(", ")}`);
}
