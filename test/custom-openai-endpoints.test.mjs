import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveCompatibilityFamily,
  resolveEffectiveRequestProfile,
  isGeminiCompatible,
} from "../src/compatibility-profiles.mjs";
import { resolveProviderCredential } from "../src/provider-credentials.mjs";

test("resolveCompatibilityFamily identifies vendor family from explicit declaration or upstream prefix", () => {
  assert.equal(
    resolveCompatibilityFamily({ compatibilityFamily: "Google" }),
    "google",
  );
  assert.equal(
    resolveCompatibilityFamily({ compatFamily: "Anthropic" }),
    "anthropic",
  );
  assert.equal(
    resolveCompatibilityFamily({ compatibilityProfile: "DeepSeek" }),
    "deepseek",
  );

  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "google/gemini-2.5-pro" }),
    "google",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "gemini-2.5-flash" }),
    "google",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "anthropic/claude-3-7-sonnet" }),
    "anthropic",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "deepseek/deepseek-chat" }),
    "deepseek",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "z-ai/glm-4" }),
    "glm",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "moonshot/kimi-k2" }),
    "kimi",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "minimax/minimax-text-01" }),
    "minimax",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "qwen/qwen-2.5-72b" }),
    "qwen",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "xai/grok-3" }),
    "xai",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "stepfun/step-2-16k" }),
    "stepfun",
  );
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "openai/gpt-4o" }),
    "openai",
  );
});

test("resolveEffectiveRequestProfile maps compatibility families to request profiles", () => {
  assert.equal(
    resolveEffectiveRequestProfile({ requestProfile: "custom-profile" }),
    "custom-profile",
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "deepseek/deepseek-r1" }),
    "deepseek-thinking",
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "anthropic/claude-3-7-sonnet-thinking" }),
    "deepseek-thinking",
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "glm/glm-4-voice" }),
    "glm-thinking",
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "kimi/kimi-latest" }),
    "kimi-k3",
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "xai/grok-2" }),
    "xai-reasoning",
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "qwen/qwen-max" }),
    "qwen-plan",
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "minimax/minimax-01" }),
    "minimax-m3",
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "stepfun/step-1" }),
    "auto-tool-choice",
  );
});

test("resolveCompatibilityFamily fallback, precedence, and heterogeneous transports", () => {
  // Explicit wins over prefix inference
  assert.equal(
    resolveCompatibilityFamily({
      compatibilityFamily: "deepseek",
      upstreamModel: "google/gemini-2.5-pro",
    }),
    "deepseek",
  );
  // Unknown models safely return undefined (standard chat completions)
  assert.equal(
    resolveCompatibilityFamily({ upstreamModel: "custom-vendor/unknown-model-v1" }),
    undefined,
  );
  assert.equal(
    resolveEffectiveRequestProfile({ upstreamModel: "custom-vendor/unknown-model-v1" }),
    undefined,
  );

  // Heterogeneous models on a single custom OpenAI-compatible transport provider
  const customTransport = { id: "custom-gateway", kind: "openai-compatible" };
  const modelGoogle = { upstreamModel: "google/gemini-2.5-flash", provider: "custom-gateway" };
  const modelDeepSeek = { upstreamModel: "deepseek/deepseek-r1", provider: "custom-gateway" };
  const modelStandard = { upstreamModel: "custom/generic-gpt", provider: "custom-gateway" };

  assert.equal(isGeminiCompatible(modelGoogle, customTransport), true);
  assert.equal(isGeminiCompatible(modelDeepSeek, customTransport), false);
  assert.equal(resolveEffectiveRequestProfile(modelDeepSeek), "deepseek-thinking");
  assert.equal(resolveEffectiveRequestProfile(modelStandard), undefined);
});

test("isGeminiCompatible checks provider or model family", () => {
  assert.equal(isGeminiCompatible({}, { id: "gemini-api" }), true);
  assert.equal(isGeminiCompatible({}, { ownedBy: "google" }), true);
  assert.equal(
    isGeminiCompatible({ upstreamModel: "google/gemini-2.5-flash" }, { id: "custom-provider" }),
    true,
  );
  assert.equal(
    isGeminiCompatible({ compatibilityFamily: "gemini" }, { id: "custom-provider" }),
    true,
  );
  assert.equal(
    isGeminiCompatible({ upstreamModel: "deepseek/deepseek-chat" }, { id: "custom-provider" }),
    false,
  );
});

test("resolveProviderCredential handles custom OpenAI-compatible endpoint configurations", () => {
  const customProvider = {
    id: "custom-router",
    displayName: "Custom Router",
    kind: "openai-compatible",
    ownedBy: "custom",
    baseUrl: "https://router.example.com/v1",
    credential: {
      environment: ["CUSTOM_ROUTER_API_KEY", "ROUTER_API_KEY"],
      file: "custom-router-api-key.secret",
      keychainServices: ["codex-router-custom-router"],
      prompt: "Custom Router API key",
    },
  };

  process.env.CUSTOM_ROUTER_API_KEY = "test-custom-key-12345";
  try {
    const cred = resolveProviderCredential(customProvider);
    assert.ok(cred);
    assert.equal(cred.value, "test-custom-key-12345");
    assert.equal(cred.source, "environment (CUSTOM_ROUTER_API_KEY)");
    assert.equal(cred.persistent, false);
  } finally {
    delete process.env.CUSTOM_ROUTER_API_KEY;
  }
});
