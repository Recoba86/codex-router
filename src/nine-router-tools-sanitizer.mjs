// Strips Codex-internal JSON-schema metadata (e.g. `encrypted`) before forwarding to NineRouter.

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

export function sanitizeNineRouterTools(tools) {
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
