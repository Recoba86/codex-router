// Recursively strips internal Codex JSON-schema metadata (e.g. `encrypted`)
// from tool parameter definitions before forwarding to OpenAI-compatible upstreams.

export function stripEncryptedSchemaKey(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(stripEncryptedSchemaKey);
  }
  const result = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === "encrypted") continue;
    result[k] = stripEncryptedSchemaKey(v);
  }
  return result;
}

export function sanitizeOpenAICompatibleTools(tools) {
  if (!Array.isArray(tools)) return tools;
  return tools.map((tool) => {
    if (!tool || typeof tool !== "object") return tool;
    if (tool.function && typeof tool.function === "object" && tool.function.parameters) {
      return {
        ...tool,
        function: {
          ...tool.function,
          parameters: stripEncryptedSchemaKey(tool.function.parameters),
        },
      };
    }
    if (tool.parameters) {
      return {
        ...tool,
        parameters: stripEncryptedSchemaKey(tool.parameters),
      };
    }
    return tool;
  });
}
