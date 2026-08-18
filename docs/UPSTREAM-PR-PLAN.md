# Upstream PR Planning: Generic OpenAI-Compatible Custom Endpoint Support

This document defines the plan for contributing generic OpenAI-compatible custom endpoint support upstream to `codex-router`.

---

## 1. Objectives

- Allow operators and users to define custom OpenAI-compatible endpoints with model catalogs, base URLs, and credentials without code modifications.
- Decouple vendor-specific compatibility profiles from transport provider IDs.
- Ensure strict tool-schema sanitization (`encrypted` metadata stripping) is applied generically to all OpenAI-compatible upstreams.

---

## 2. Generalizable Features (Upstream Scope)

1. **Generic Endpoint Registration**:
   - Allow configuration of arbitrary OpenAI-compatible providers via `config/providers.json` or `user-providers.json`.
   - Support custom `baseUrl`, `baseUrlEnv`, `credential.environment`, `credential.file`, and `keychainServices`.

2. **Per-Model Endpoint & Compatibility Resolution**:
   - Model definitions in `user-models.json` can declare `requestProfile`, `compatFamily` (e.g. `google`, `deepseek`, `glm`, `qwen`), or infer them from prefixes.
   - Forwarder inspects model family rather than hardcoded provider names to apply necessary wire transformations (such as Gemini thought signature injection).

3. **Universal Tool-Schema Sanitization**:
   - Generalize `sanitizeNineRouterTools` into a standard `sanitizeOpenAiTools` utility that cleans internal Codex properties (`encrypted`, etc.) from all custom OpenAI endpoints.

4. **Context Window & Compaction Calculations**:
   - Standardize `autoCompact` calculation formula (`Math.floor(contextWindow * 0.85)`) when `autoCompact` is omitted in `user-models.json`.

---

## 3. Site-Specific vs Generic Separation

| Component | Upstream (Generic) | Local / Private (Local Only) |
|---|---|---|
| **Provider Definition** | Generic `openai-compatible` schema parser | Hardcoded `nine-router` provider ID and private base URLs |
| **API Keys & Secrets** | Generic file resolution (`<provider>-api-key.secret`) | `nine-router-api-key.secret`, private keys |
| **Model Catalogs** | Generic model schema and merge engine | Private model catalogs and curated endpoints |
| **Tool Sanitizer** | Reusable `tool-schema-sanitizer.mjs` | Specific test assertions for proprietary gateway IDs |

---

## 4. Proposed Upstream PR Structure

### Branch Strategy
- Base branch: `main` (or upstream development branch)
- Feature branch: `feat/generic-openai-endpoints`

### Key Commits
1. `feat(schema): add generic tool-parameter schema sanitizer`
2. `feat(routing): support dynamic model compatibility profiles in api-forwarder`
3. `feat(config): enable custom OpenAI-compatible provider definitions in user-models`
4. `test: add unit tests for generic tool schema cleaning and profile resolution`
5. `docs: document custom OpenAI-compatible endpoint configuration`

---

## 5. Non-Goals
- Do not upstream proprietary domain names, custom token plans, or non-public vendor endpoints.
- Do not alter default native OpenAI behavior or existing standard provider adapters.
