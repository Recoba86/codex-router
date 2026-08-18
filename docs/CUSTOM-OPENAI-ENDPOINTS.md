# Custom OpenAI-Compatible Endpoints & Model Integration

This document outlines the architecture, protocol translation, tool schema normalization, model overrides, and context window management for generic OpenAI-compatible endpoints in `codex-router`.

---

## 1. Architecture Overview

`codex-router` routes OpenAI-compatible endpoints directly to downstream model APIs with full support for streaming, function calling, tool execution, and context compaction.

```
Codex Desktop / CLI Client
           │
           ▼ (HTTP POST /v1/responses or /v1/chat/completions)
┌────────────────────────────────────────┐
│             codex-router               │
│  - Caller Authentication               │
│  - Model Catalog Resolution            │
│  - Namespace Flattening                │
└──────────────────┬─────────────────────┘
                   │
                   ▼ (Loopback / Gateway Dispatch)
┌────────────────────────────────────────┐
│             api-forwarder              │
│  - Downstream Provider Protocol Match  │
│  - Compatibility Profile Resolution    │
│  - Tool Schema Sanitization            │
│  - Thought Signature Injection         │
│  - Non-User Image Sanitization         │
│  - Outbound Key / Header Management    │
└──────────────────┬─────────────────────┘
                   │
                   ▼ (HTTP POST upstream)
   Target Provider (e.g. Custom Upstream Gateway)
```

### Credential Protection
- API keys are stored in user-isolated `*.secret` files (mode `0600`) located at `$CODEX_ROUTER_STATE_DIR` or `$HOME/.codex/codex-router/`.
- Environment variables (e.g., `CUSTOM_ROUTER_API_KEY`, `ROUTER_API_KEY`) and OS Keychains are probed in priority order.
- Secrets are never logged or exposed in traces.

---

## 2. Downstream Compatibility Profiles

**Transport Provider != Model Compatibility Family**

When communicating with a multi-model aggregator or gateway, the HTTP transport target is a single OpenAI-compatible provider, but individual models behind that provider originate from distinct vendor families (Google, Anthropic, DeepSeek, Zhipu/GLM, Moonshot/Kimi, StepFun, Qwen, xAI, OpenAI).

| Model Family | Detected Prefix / Model Declaration | Compatibility Treatment |
|---|---|---|
| **Google** | `google/*`, `gemini-*` (or `compatibilityFamily: "google"`) | Injects synthetic thought signatures for multi-turn tool history; converts non-user images to text placeholders; strips unsupported search options |
| **DeepSeek** | `deepseek/*` (or `compatibilityFamily: "deepseek"`) | Applies `deepseek-thinking` profile for reasoning budget forwarding and downgrades forced tool_choice to auto under thinking |
| **Anthropic** | `anthropic/*` (or `compatibilityFamily: "anthropic"`) | Normalizes adaptive thinking effort |
| **Zhipu / GLM** | `z-ai/*`, `glm/*` (or `compatibilityFamily: "glm"`) | Normalizes reasoning effort ladder across GLM levels |
| **Moonshot / Kimi** | `moonshot/*`, `kimi/*` (or `compatibilityFamily: "kimi"`) | Normalizes Kimi K3 effort levels |
| **StepFun** | `stepfun/*`, `step-*` (or `compatibilityFamily: "stepfun"`) | Normalizes tool choice under thinking |
| **Qwen** | `qwen/*` (or `compatibilityFamily: "qwen"`) | Normalizes system message ordering and merges consecutive system turns |
| **xAI** | `xai/*`, `grok-*` (or `compatibilityFamily: "xai"`) | Full OpenAI-compatible chat completions with reasoning tokens |

---

## 3. Tool-Schema Normalization

Codex Desktop annotates tool definitions with internal metadata properties such as `encrypted: true` on parameter properties. Strict upstream JSON-schema validators reject requests containing unrecognized schema properties with HTTP 400.

### Tool Schema Sanitizer (`src/tool-schema-sanitizer.mjs`)
- Recursively walks tool definitions (`tool.function.parameters` and `tool.parameters`).
- Strips `encrypted` metadata keys from object definitions while preserving schema structure (`type`, `properties`, `required`, `description`, etc.).
- Applied at the outbound API forwarder boundary for all OpenAI-compatible endpoints.

---

## 4. Context Window & Compaction Policy

Context windows are calibrated to balance model capability, token limits, and client stability.

### Advertised vs Native vs Effective
- **Advertised Context (`contextWindow`)**: Declared to Codex UI for budget planning.
- **Auto Compact (`autoCompact`)**: Standardized at 85% of context window (`Math.floor(contextWindow * 0.85)`) when `autoCompact` is omitted.
- **Effective Context Percent**: Standardized at 95% across routed models.

---

## 5. Configuration Examples

### Custom Provider (`config/custom-router/custom-router.json`)
```json
{
  "version": 1,
  "providers": [
    {
      "id": "custom-router",
      "displayName": "Custom Router",
      "kind": "openai-compatible",
      "ownedBy": "custom",
      "baseUrl": "https://router.example.com/v1",
      "baseUrlEnv": "CUSTOM_ROUTER_API_BASE_URL",
      "credential": {
        "environment": [
          "CUSTOM_ROUTER_API_KEY",
          "ROUTER_API_KEY"
        ],
        "file": "custom-router-api-key.secret",
        "legacyFiles": [],
        "keychainServices": [
          "codex-router-custom-router"
        ],
        "prompt": "Custom Router API key"
      }
    }
  ]
}
```

### User Models Overlay (`~/.codex/codex-router/user-models.json`)
```json
{
  "version": 1,
  "models": [
    {
      "slug": "custom-router/gemini-2.5-pro",
      "gatewayModel": "custom-router-gemini-2-5-pro",
      "upstreamModel": "google/gemini-2.5-pro",
      "provider": "custom-router",
      "compatibilityFamily": "google",
      "listed": true,
      "displayName": "Gemini 2.5 Pro (Custom)",
      "description": "Gemini 2.5 Pro routed via custom OpenAI-compatible endpoint.",
      "priority": 100,
      "defaultEffort": "high",
      "reasoningLevels": [
        { "effort": "high", "description: "Deep reasoning" }
      ],
      "contextWindow": 1048576,
      "inputModalities": ["text", "image"],
      "compHash": "custom-router-gemini-2-5-pro-v1"
    }
  ]
}
```
