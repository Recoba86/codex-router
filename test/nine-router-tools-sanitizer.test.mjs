import assert from "node:assert/strict";
import { test } from "node:test";
import {
  stripEncryptedSchemaKey,
  sanitizeNineRouterTools,
} from "../src/nine-router-tools-sanitizer.mjs";

function recursiveCountKey(obj, targetKey, paths = []) {
  let count = 0;
  function scan(current, path) {
    if (!current || typeof current !== "object") return;
    if (Array.isArray(current)) {
      current.forEach((item, idx) => scan(item, `${path}[${idx}]`));
      return;
    }
    for (const [key, value] of Object.entries(current)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (key === targetKey) {
        count++;
        paths.push({ path: currentPath, key, value });
      }
      scan(value, currentPath);
    }
  }
  scan(obj, "");
  return { count, paths };
}

test("stripEncryptedSchemaKey removes top-level, nested, and array-nested encrypted keys without mutating other fields", () => {
  const schema = {
    type: "object",
    encrypted: true,
    description: "Keep description with encrypted word",
    properties: {
      message: {
        type: "string",
        encrypted: true,
        description: "User message",
      },
      nested: {
        type: "object",
        properties: {
          token: {
            type: "string",
            encrypted: true,
          },
          count: {
            type: "integer",
          },
        },
      },
      items: {
        type: "array",
        items: [
          { type: "string", encrypted: true },
          { type: "number", validField: 123 },
        ],
      },
    },
    required: ["message"],
  };

  const sanitized = stripEncryptedSchemaKey(schema);

  assert.equal(recursiveCountKey(schema, "encrypted").count, 4);
  assert.equal(recursiveCountKey(sanitized, "encrypted").count, 0);

  // Verify non-encrypted fields and values are preserved
  assert.equal(sanitized.type, "object");
  assert.equal(sanitized.description, "Keep description with encrypted word");
  assert.equal(sanitized.properties.message.type, "string");
  assert.equal(sanitized.properties.message.description, "User message");
  assert.equal(sanitized.properties.nested.properties.count.type, "integer");
  assert.equal(sanitized.properties.items.items[1].validField, 123);
  assert.deepEqual(sanitized.required, ["message"]);
});

test("sanitizeNineRouterTools sanitizes both OpenAI function tools and raw parameter tools", () => {
  const tools = [
    {
      type: "function",
      function: {
        name: "test_tool_1",
        description: "Tool 1",
        parameters: {
          type: "object",
          properties: {
            param1: { type: "string", encrypted: true },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "test_tool_2",
        description: "Tool 2",
        parameters: {
          type: "object",
          properties: {
            param2: { type: "number" },
          },
        },
      },
    },
    {
      name: "raw_tool",
      parameters: {
        type: "object",
        encrypted: true,
      },
    },
  ];

  const sanitized = sanitizeNineRouterTools(tools);

  assert.equal(recursiveCountKey(tools, "encrypted").count, 2);
  assert.equal(recursiveCountKey(sanitized, "encrypted").count, 0);
  assert.equal(sanitized[0].function.name, "test_tool_1");
  assert.equal(sanitized[1].function.name, "test_tool_2");
  assert.equal(sanitized[2].name, "raw_tool");
});

test("sanitizeNineRouterTools handles non-array or empty input safely", () => {
  assert.equal(sanitizeNineRouterTools(undefined), undefined);
  assert.equal(sanitizeNineRouterTools(null), null);
  assert.deepEqual(sanitizeNineRouterTools([]), []);
});
