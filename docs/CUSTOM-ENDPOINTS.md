# Custom OpenAI-Compatible Endpoints & Model Integration

This document outlines the architecture, protocol translation, tool schema normalization, and context window management for custom OpenAI-compatible endpoints in `codex-router`.

---

## 1. Architecture Overview

`codex-router` enables routing OpenAI-compatible endpoints directly to downstream model APIs with full support for streaming, function calling, tool execution, and context compaction.

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
│  - Tool Schema Sanitization            │
│  - Gemini Thought Signature Injection  │
│  - Non-User Image Sanitization         │
│  - Outbound Key / Header Management    │
└──────────────────┬─────────────────────┘
                   │
                   ▼ (HTTP POST upstream)
   Target Provider (e.g. 9Router / Custom Upstream)
```

### Credential Protection
- API keys are stored in user-isolated `*.secret` files (mode `0600`) located at `$CODEX_ROUTER_HOME` or `$HOME/.codex/codex-router/`.
- Environment variables (e.g., `NINEROUTER_API_KEY`, `NINE_ROUTER_API_KEY`) and OS Keychains are probed in priority order.
- Secrets are never logged or exposed in traces.

---

## 2. Downstream Compatibility Profiles

**Transport Provider != Model Compatibility Family**

When communicating with a multi-model aggregator or gateway (such as 9Router), the HTTP transport target is a single OpenAI-compatible provider (`nine-router`), but individual models behind that provider originate from distinct vendor families (Google, Anthropic/DeepSeek, Z.ai, StepPlan, Qwen, xAI).

| Model Family | Detected Prefix / Upstream Model | Compatibility Treatment |
|---|---|---|
| **Google** | `ag/gemini-*` | Injects synthetic thought signatures for multi-turn tool history; converts non-user images to text placeholders; strips unsupported search options |
| **DeepSeek / Thinking** | `ocg/deepseek-*`, `ag/claude-*` | Assigns `deepseek-thinking` profile for reasoning budget forwarding |
| **Zhipu / GLM** | `ocg/glm-*` | Normalizes reasoning effort ladder across GLM levels |
| **StepPlan** | `stepplan/step-*` | Standard chat completions format with calibrated context windows |
| **Qwen** | `qd/*` | Normalizes system message ordering and merges consecutive system turns |
| **xAI** | `gcli/grok-*` | Full OpenAI-compatible chat completions with reasoning tokens |

---

## 3. Tool-Schema Normalization

Codex Desktop annotates tool definitions with internal metadata properties such as `encrypted: true` on parameter properties. Strict upstream JSON-schema validators (e.g. OpenAI / Google / Anthropic proxies) reject requests containing unrecognized schema properties with HTTP 400.

### Tool Sanitizer (`nine-router-tools-sanitizer.mjs`)
- Recursively walks tool definitions (`tool.function.parameters` and `tool.parameters`).
- Strips `encrypted` metadata keys from object definitions while preserving schema structure (`type`, `properties`, `required`, `description`, etc.).
- Pre-dispatch assertion ensures zero `encrypted` keys reach upstream:
  ```js
  recursiveCountKey(finalOutboundBody.tools, "encrypted") === 0
  ```

---

## 4. Context Window & Compaction Policy

Context windows are calibrated to balance model capability, token limits, and client stability.

### Advertised vs Native vs Effective
- **Advertised Context (`contextWindow`)**: Declared to Codex UI for budget planning.
- **Auto Compact (`autoCompact`)**: Set at 85% of context window (`Math.floor(contextWindow * 0.85)`) to trigger compaction before context overflow.
- **Effective Context Percent**: Standardized at 95% across all routed models.

### Calibrated Model Catalog

| Model Slug | Display Name | Advertised Context | Auto-Compact Limit | Modalities | Notes / Probe Findings |
|---|---|---|---|---|---|
| `nine-router/ag/gemini-3.7-flash-high` | Gemini 3.7 Flash High | 1,048,576 | 891,289 | Text, Image | Full 1M window; thought signature injection |
| `nine-router/ag/gemini-3.7-flash-medium` | Gemini 3.7 Flash Medium | 1,048,576 | 891,289 | Text, Image | Full 1M window; thought signature injection |
| `nine-router/ag/claude-opus-4-6-thinking` | Claude Opus 4.6 Thinking | 1,000,000 | 850,000 | Text, Image | `deepseek-thinking` profile |
| `nine-router/ocg/deepseek-v4-pro` | DeepSeek V4 Pro | 1,000,000 | 850,000 | Text | `deepseek-thinking` profile |
| `nine-router/ocg/deepseek-v4-flash` | DeepSeek V4 Flash | 1,000,000 | 850,000 | Text | `deepseek-thinking` profile |
| `nine-router/ocg/mimo-v2.5-pro` | MiMo V2.5 Pro | 1,048,576 | 891,289 | Text, Image | Full 1M context |
| `nine-router/ocg/gpt-5.6-luna` | GPT-5.6 Luna | 1,050,000 | 892,500 | Text, Image | Extended 1.05M window |
| `nine-router/ocg/glm-5.3` | GLM 5.3 | 1,000,000 | 850,000 | Text | 1M context with GLM effort mapping |
| `nine-router/gcli/grok-4.6` | Grok 4.6 | 500,000 | 425,000 | Text, Image | 500K window |
| `nine-router/gcli/grok-4.6-high` | Grok 4.6 High | 500,000 | 425,000 | Text, Image | 500K window |
| `nine-router/qd/lite` | QD Lite | 200,000 | 170,000 | Text | 200K window; system turn normalization |
| `nine-router/qd/qmodel_38max` | QD QModel 38Max | 200,000 | 170,000 | Text | 200K window; system turn normalization |
| `nine-router/stepplan/step-3.5-flash` | Step 3.5 Flash | 128,000 | 108,800 | Text | 128K standard window |
| `nine-router/stepplan/step-3.5-flash-2603` | Step 3.5 Flash 2603 | 128,000 | 108,800 | Text | 128K standard window |
| `nine-router/stepplan/step-3.7-flash` | Step 3.7 Flash | 256,000 | 217,600 | Text | 256K window (calibrated from 128K) |
