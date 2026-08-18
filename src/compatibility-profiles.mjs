// Resolves model compatibility families and request profiles generically for OpenAI-compatible endpoints.
// Transport Provider != Model Compatibility Family.

export function resolveCompatibilityFamily(model = {}) {
  if (model.compatibilityFamily) return model.compatibilityFamily.toLowerCase();
  if (model.compatFamily) return model.compatFamily.toLowerCase();
  if (model.compatibilityProfile) return model.compatibilityProfile.toLowerCase();

  const upstream = String(model.upstreamModel || "").toLowerCase();
  if (
    upstream.startsWith("google/") ||
    upstream.startsWith("gemini/") ||
    upstream.startsWith("gemini-")
  ) {
    return "google";
  }
  if (
    upstream.startsWith("anthropic/") ||
    upstream.startsWith("claude/") ||
    upstream.startsWith("claude-")
  ) {
    return "anthropic";
  }
  if (
    upstream.startsWith("deepseek/") ||
    upstream.startsWith("deepseek-")
  ) {
    return "deepseek";
  }
  if (
    upstream.startsWith("z-ai/") ||
    upstream.startsWith("zhipu/") ||
    upstream.startsWith("glm/") ||
    upstream.startsWith("glm-")
  ) {
    return "glm";
  }
  if (
    upstream.startsWith("moonshot/") ||
    upstream.startsWith("kimi/") ||
    upstream.startsWith("kimi-")
  ) {
    return "kimi";
  }
  if (
    upstream.startsWith("minimax/") ||
    upstream.startsWith("minimax-")
  ) {
    return "minimax";
  }
  if (
    upstream.startsWith("qwen/") ||
    upstream.startsWith("qwen-")
  ) {
    return "qwen";
  }
  if (
    upstream.startsWith("xai/") ||
    upstream.startsWith("grok/") ||
    upstream.startsWith("grok-")
  ) {
    return "xai";
  }
  if (
    upstream.startsWith("stepfun/") ||
    upstream.startsWith("step-")
  ) {
    return "stepfun";
  }
  if (
    upstream.startsWith("openai/") ||
    upstream.startsWith("gpt-")
  ) {
    return "openai";
  }
  return undefined;
}

export function resolveEffectiveRequestProfile(model = {}) {
  if (model.requestProfile) return model.requestProfile;
  const family = resolveCompatibilityFamily(model);
  const upstream = String(model.upstreamModel || "").toLowerCase();

  if (family === "deepseek") return "deepseek-thinking";
  if (family === "anthropic" && upstream.includes("thinking")) return "deepseek-thinking";
  if (family === "glm") return "glm-thinking";
  if (family === "kimi") return "kimi-k3";
  if (family === "xai") return "xai-reasoning";
  if (family === "qwen") return "qwen-plan";
  if (family === "minimax") return "minimax-m3";
  if (family === "stepfun") return "auto-tool-choice";
  return undefined;
}

export function isGeminiCompatible(model = {}, provider = {}) {
  if (provider?.id === "gemini-api" || provider?.ownedBy === "google") return true;
  const family = resolveCompatibilityFamily(model);
  return family === "google" || family === "gemini";
}
