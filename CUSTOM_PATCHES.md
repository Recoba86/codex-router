# Custom Modifications & Upstream Sync Guidelines

This repository contains custom patches maintained for local reliability. When syncing or merging updates from the upstream repository (`duolahypercho/codex-router`), ensure these invariants and modifications are preserved.

---

## 1. Gemini Trailing Model-Turn Sanitization

- **Target File:** `src/api-forwarder.mjs`
- **Issue Solved:** Google Gemini (Antigravity/NineRouter) strictly forbids chat histories ending with a `model`/`assistant` turn (`HTTP 400: Requests ending with a model turn are not supported`). When a session is interrupted or a bare `continue` is submitted, Codex sends history terminating on an assistant message, triggering the 400 rejection loop.
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

1. Fetch latest upstream:
   ```bash
   git fetch origin
   ```
2. Rebase or merge onto `main`:
   ```bash
   git rebase origin/main
   ```
3. If conflicts occur in `src/api-forwarder.mjs`, ensure `trimTrailingModelTurns` is retained inside `sanitizeChatToolHistory`.
4. Run regression suite:
   ```bash
   npm test
   ```
5. Push updated `main` to personal fork:
   ```bash
   git push fork main
   ```
