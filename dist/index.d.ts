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
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
/** Fallback chain configuration */
export interface FallbackChain {
    [chainName: string]: string[];
}
/** Parsed error from provider APIs */
export interface ProviderError {
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
export interface ChainCache {
    /** Last working model string (e.g., "google/gemini-2.5-pro") */
    workingModel: string;
    /** When the cache was set (Date.now()) */
    timestamp: number;
    /** Index in the chain that was working */
    workingIndex: number;
}
/** Failed model tracking */
export interface FailedModel {
    /** When it failed (Date.now()) */
    failedAt: number;
    /** Optional retry delay from the error */
    retryDelayMs?: number;
}
/** Cache TTL: 1 hour in milliseconds */
export declare const CACHE_TTL_MS: number;
/** Failed model cooldown: 5 minutes */
export declare const FAILED_COOLDOWN_MS: number;
/** Max retries per model on retryable errors */
export declare const MAX_RETRIES_PER_MODEL = 10;
/** Initial retry delay (ms) */
export declare const INITIAL_RETRY_DELAY_MS = 1000;
/** Max retry delay cap (ms) */
export declare const MAX_RETRY_DELAY_MS = 1000;
/** Load fallback chains from config file */
export declare function loadFallbackChains(): FallbackChain;
/** Extract error info from various error formats */
export declare function parseProviderError(errorMessage: string): ProviderError | null;
/** Extract retry delay from error (e.g., "53.021s" -> 53021) */
export declare function extractRetryDelay(error: ProviderError): number | null;
/** Check if an error is retryable */
export declare function isRetryableError(errorMessage: string): {
    retryable: boolean;
    delayMs?: number;
};
/** Parse provider/model string */
export declare function parseModelString(modelString: string): {
    provider: string;
    modelId: string;
} | null;
/** Determine the order of models to try based on cache */
export declare function getModelOrder(chainName: string, fallbackList: string[], cache: ChainCache | null, failedModels: Map<string, FailedModel>): {
    models: string[];
    startIndex: number;
    usedCache: boolean;
};
/** Build provider config models from chains */
export declare function buildProviderModels(chains: FallbackChain): {
    id: string;
    name: string;
    reasoning: boolean;
    input: ("text" | "image")[];
    cost: {
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
    };
    contextWindow: number;
    maxTokens: number;
}[];
/** Extension entry point */
export default function (pi: ExtensionAPI): void;
//# sourceMappingURL=index.d.ts.map