# Custom Modifications & Upstream Sync Guidelines

This repository contains custom patches maintained for local reliability and multi-model routing. When syncing or merging updates from the upstream repository (`duolahypercho/codex-router`), ensure these invariants and modifications are preserved.

---

## 1. NineRouter & Custom OpenAI-Compatible Endpoints Integration

- **Target Files:**
  - `config/nine-router/nine-router.json` (Provider & model definitions)
  - `src/nine-router-resolver.mjs` (Model family resolution & upstream model routing)
  - `src/nine-router-tools-sanitizer.mjs` (Tool schema sanitizer stripping internal encrypted metadata)
  - `src/api-forwarder.mjs` (Integration into routing pipeline & tool sanitization hooks)
  - `src/router.mjs` (Routing table integration & provider dispatch)
  - `test/nine-router-resolver.test.mjs` & `test/nine-router-tools-sanitizer.test.mjs` (Unit tests)
  - `docs/CUSTOM-ENDPOINTS.md` & `docs/UPSTREAM-PR-PLAN.md` (Design & upstream documentation)

- **Capabilities Added:**
  1. **Generic Multi-Model Forwarding:** Adds NineRouter integration mapping `nine-router/*` models to designated backends (Google Antigravity, OpenCode-Go, Grok CLI, StepPlan).
  2. **Schema Sanitization:** Strips internal encrypted/opaque parameters from tool schemas before forwarding to non-OpenAI endpoints that would otherwise reject invalid JSON schema keywords.
  3. **Context Windows & Compaction Calibration:** Calibrates context limits across 15+ external models for accurate token counting and auto-compaction.

---

## 2. Gemini Trailing Model-Turn Sanitization

- **Target File:** `src/api-forwarder.mjs`
- **Issue Solved:** Google Gemini (Antigravity/NineRouter) strictly forbids chat histories ending with a `model`/`assistant` turn (`HTTP 400: Requests ending with a model turn are not supported`). When a session is interrupted, timed out, or a bare `continue` is submitted, Codex sends history terminating on an assistant message, triggering the 400 rejection loop.
- **Implemented Fix:**
  In `src/api-forwarder.mjs`, the helper `trimTrailingModelTurns` pops any trailing assistant messages from the history payload when `isGeminiProvider(provider, model)` is true:

  ```javascript
  function trimTrailingModelTurns(messages) {
    const trimmed = [...messages];
    while (trimmed.length > 0 && trimmed[trimmed.length - 1]?.role === "assistant") {
      trimmed.pop();
    }
    return trimmed;
  }
  ```
  Integrated inside `sanitizeChatToolHistory`:
  ```javascript
  if (isGeminiProvider(provider, model)) {
    const geminiClean = ensureGeminiThoughtSignatures(sanitizeGeminiImageContent(repaired));
    return trimTrailingModelTurns(geminiClean);
  }
  ```

---

## Upstream Sync Procedure

When pulling new releases from `upstream` / `origin` (`duolahypercho/codex-router`):

1. **Fetch latest upstream:**
   ```bash
   git fetch origin
   ```

2. **Rebase personal `main` branch onto upstream:**
   ```bash
   git rebase origin/main
   ```

3. **Conflict Resolution Checklist:**
   - **`src/api-forwarder.mjs`:**
     - Ensure `sanitizeNineRouterTools` hook is retained in payload preparation.
     - Ensure `isGeminiProvider` logic and `trimTrailingModelTurns` are retained in `sanitizeChatToolHistory`.
   - **`src/router.mjs`:**
     - Ensure NineRouter provider resolver and model resolution branches are preserved.
   - **`config/nine-router/` & `src/nine-router-*.mjs`:**
     - Ensure custom resolver, sanitizer, and configs are intact.

4. **Verify Regression Suite:**
   ```bash
   npm test
   ```

5. **Push Updated State to Personal Fork:**
   ```bash
   git push fork main
   ```
