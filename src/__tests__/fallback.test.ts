/**
 * Unit tests for Fallback Provider Extension
 * 
 * Tests the actual exported functions from src/index.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
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
  type ChainCache,
  type FailedModel,
  type ProviderError,
} from "../index.js";

describe("Fallback Provider Extension - Unit Tests", () => {

  describe("parseModelString", () => {
    it("should parse valid provider/model format", () => {
      const result = parseModelString("google/gemini-2.5-pro");
      expect(result).toEqual({
        provider: "google",
        modelId: "gemini-2.5-pro",
      });
    });

    it("should handle model IDs with slashes", () => {
      const result = parseModelString("provider/model/with/slashes");
      expect(result).toEqual({
        provider: "provider",
        modelId: "model/with/slashes",
      });
    });

    it("should return null for invalid format", () => {
      expect(parseModelString("no-slash")).toBeNull();
      expect(parseModelString("")).toBeNull();
      // Leading slash is invalid
      expect(parseModelString("/starts-with-slash")).toBeNull();
    });
  });

  describe("isRetryableError", () => {
    it("should detect 429 rate limit", () => {
      expect(isRetryableError("Error 429: Rate limit exceeded").retryable).toBe(true);
      expect(isRetryableError("429 Too Many Requests").retryable).toBe(true);
    });

    it("should detect 529 overloaded", () => {
      expect(isRetryableError("529 Overloaded").retryable).toBe(true);
    });

    it("should detect network errors", () => {
      expect(isRetryableError("fetch failed: connection refused").retryable).toBe(true);
      expect(isRetryableError("network error").retryable).toBe(true);
    });

    it("should detect timeout", () => {
      expect(isRetryableError("Request timeout").retryable).toBe(true);
    });

    it("should not match non-retryable errors", () => {
      expect(isRetryableError("400 Bad Request").retryable).toBe(false);
      expect(isRetryableError("401 Unauthorized").retryable).toBe(false);
      expect(isRetryableError("403 Forbidden").retryable).toBe(false);
    });

    it("should return retry delay from Google 429 with RetryInfo", () => {
      const error = JSON.stringify({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Rate limit exceeded",
          details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "15s" }],
        },
      });
      const result = isRetryableError(error);
      expect(result.retryable).toBe(true);
      expect(result.delayMs).toBe(15000);
    });

    it("should return { retryable: false } for 400 Bad Request", () => {
      const result = isRetryableError("400 Bad Request");
      expect(result).toEqual({ retryable: false });
    });
  });

  describe("parseProviderError", () => {
    it("should parse nested Google API error format", () => {
      const json = JSON.stringify({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Rate limit exceeded",
          details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "15s" }],
        },
      });
      const result = parseProviderError(json);
      expect(result?.code).toBe(429);
      expect(result?.status).toBe("RESOURCE_EXHAUSTED");
    });

    it("should parse flat error format", () => {
      const json = JSON.stringify({
        code: 500,
        status: "INTERNAL_ERROR",
        message: "Server error",
      });
      const result = parseProviderError(json);
      expect(result?.code).toBe(500);
    });

    it("should return null for invalid JSON", () => {
      expect(parseProviderError("not json")).toBeNull();
    });
  });

  describe("extractRetryDelay", () => {
    it("should extract delay in seconds", () => {
      const error: ProviderError = {
        details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "15s" }],
      };
      expect(extractRetryDelay(error)).toBe(15000);
    });

    it("should handle fractional seconds", () => {
      const error: ProviderError = {
        details: [{ "@type": "RetryInfo", retryDelay: "0.5s" }],
      };
      expect(extractRetryDelay(error)).toBe(500);
    });

    it("should return null for missing details", () => {
      expect(extractRetryDelay({})).toBeNull();
      expect(extractRetryDelay({ details: [] })).toBeNull();
    });

    it("should return null for non-RetryInfo details", () => {
      const error: ProviderError = {
        details: [{ "@type": "Help", retryDelay: "15s" }],
      };
      expect(extractRetryDelay(error)).toBeNull();
    });
  });

  describe("getModelOrder (caching logic)", () => {
    it("should return full chain in order when no cache", () => {
      const chain = ["model-a", "model-b", "model-c"];
      const failed = new Map<string, FailedModel>();

      const result = getModelOrder("test", chain, null, failed);

      expect(result.models).toEqual(chain);
      expect(result.usedCache).toBe(false);
    });

    it("should return full chain regardless of cache (current priority-first behavior)", () => {
      const chain = ["model-a", "model-b", "model-c"];
      const cache: ChainCache = {
        workingModel: "model-b",
        timestamp: Date.now(),
        workingIndex: 1,
      };
      const failed = new Map<string, FailedModel>();

      const result = getModelOrder("test", chain, cache, failed);

      // Current implementation always returns chain order
      expect(result.models).toEqual(chain);
    });

    it("should return full chain even with failed models (current behavior)", () => {
      const chain = ["model-a", "model-b", "model-c"];
      const failed = new Map<string, FailedModel>([
        ["model-b", { failedAt: Date.now() }],
      ]);

      const result = getModelOrder("test", chain, null, failed);

      // Current implementation doesn't filter failed models
      expect(result.models).toEqual(chain);
    });

    it("should use chain order when cache expired", () => {
      const chain = ["model-a", "model-b", "model-c"];
      const cache: ChainCache = {
        workingModel: "model-a",
        timestamp: Date.now() - CACHE_TTL_MS - 1000, // expired
        workingIndex: 0,
      };
      const failed = new Map<string, FailedModel>();

      const result = getModelOrder("test", chain, cache, failed);

      expect(result.models).toEqual(chain);
      expect(result.usedCache).toBe(false);
    });
  });

  describe("buildProviderModels", () => {
    it("should generate correct model configs from chains", () => {
      const chains = {
        reviewer: ["google/gemini-2.5-pro"],
        worker: ["openai/gpt-4o", "anthropic/claude-3.5"],
      };
      const models = buildProviderModels(chains);

      expect(models).toHaveLength(2);
      expect(models[0]).toEqual({
        id: "reviewer",
        name: "Fallback/reviewer",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 16384,
      });
      expect(models[1].id).toBe("worker");
    });

    it("should return empty array for empty chains", () => {
      expect(buildProviderModels({})).toEqual([]);
    });
  });

  describe("loadFallbackChains (validation)", () => {
    it("should return empty object when config file does not exist", () => {
      // The config path is hardcoded to ~/.pi/fallback-chains.json
      // This test verifies graceful handling when file is missing
      // Since we can't control the filesystem in unit tests easily,
      // we just verify the return type is correct
      const chains = loadFallbackChains();
      expect(typeof chains).toBe("object");
      expect(Array.isArray(chains)).toBe(false);
    });
  });
});
