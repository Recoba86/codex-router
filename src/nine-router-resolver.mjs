// Resolves 9Router model IDs and prefixes to native provider families and request profiles.
// ponytail: maps prefix convention (ag, ocg, gcli, qd, etc.) until 9Router exposes upstream model metadata endpoint.

export function resolveNineRouterFamily(upstreamModel = "") {
  const model = String(upstreamModel || "").toLowerCase();
  if (model.startsWith("ag/gemini") || model.startsWith("google/") || model.startsWith("gemini-")) {
    return "google";
  }
  if (model.startsWith("ag/claude") || model.startsWith("anthropic/") || model.startsWith("claude-")) {
    return "anthropic";
  }
  if (model.startsWith("ocg/deepseek") || model.startsWith("deepseek/")) {
    return "deepseek";
  }
  if (model.startsWith("ocg/glm") || model.startsWith("z-ai/") || model.startsWith("glm-")) {
    return "glm";
  }
  if (model.startsWith("ocg/kimi") || model.startsWith("moonshot/") || model.startsWith("kimi-")) {
    return "kimi";
  }
  if (model.startsWith("ocg/minimax") || model.startsWith("minimax/")) {
    return "minimax";
  }
  if (model.startsWith("ocg/qwen") || model.startsWith("qd/") || model.startsWith("qwen/")) {
    return "qwen";
  }
  if (model.startsWith("gcli/grok") || model.startsWith("xai/") || model.startsWith("grok-")) {
    return "xai";
  }
  if (model.startsWith("stepplan/") || model.startsWith("stepfun/")) {
    return "stepfun";
  }
  if (model.startsWith("ocg/gpt") || model.startsWith("cx/") || model.startsWith("openai/")) {
    return "openai";
  }
  return undefined;
}

export function defaultNineRouterProfile(upstreamModel = "") {
  const model = String(upstreamModel || "").toLowerCase();
  const family = resolveNineRouterFamily(model);
  if (family === "deepseek") return "deepseek-thinking";
  if (family === "anthropic" && model.includes("thinking")) return "deepseek-thinking";
  if (family === "glm") return "glm-thinking";
  if (family === "kimi") return "kimi-k3";
  if (family === "xai") return "xai-reasoning";
  if (family === "qwen") return "qwen-plan";
  if (family === "minimax") return "minimax-m3";
  if (family === "stepfun") return "auto-tool-choice";
  return undefined;
}
