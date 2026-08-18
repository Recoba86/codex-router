import assert from "node:assert/strict";
import { test } from "node:test";
import {
  stripEncryptedSchemaKey,
  sanitizeOpenAICompatibleTools,
} from "../src/tool-schema-sanitizer.mjs";

test("stripEncryptedSchemaKey strips encrypted property recursively from object parameters", () => {
  const schema = {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name",
        encrypted: true,
      },
      nested: {
        type: "object",
        encrypted: false,
        properties: {
          secretField: {
            type: "string",
            encrypted: true,
          },
          publicField: {
            type: "number",
          },
        },
        required: ["secretField"],
      },
      itemsList: {
        type: "array",
        items: {
          type: "object",
          properties: {
            itemCode: {
              type: "string",
              encrypted: true,
            },
          },
        },
      },
    },
    required: ["location"],
  };

  const stripped = stripEncryptedSchemaKey(schema);

  assert.equal(stripped.properties.location.encrypted, undefined);
  assert.equal(stripped.properties.location.type, "string");
  assert.equal(stripped.properties.location.description, "City name");

  assert.equal(stripped.properties.nested.encrypted, undefined);
  assert.equal(stripped.properties.nested.properties.secretField.encrypted, undefined);
  assert.equal(stripped.properties.nested.properties.secretField.type, "string");
  assert.equal(stripped.properties.nested.properties.publicField.type, "number");
  assert.deepEqual(stripped.properties.nested.required, ["secretField"]);

  assert.equal(stripped.properties.itemsList.items.properties.itemCode.encrypted, undefined);
  assert.equal(stripped.properties.itemsList.items.properties.itemCode.type, "string");
  assert.deepEqual(stripped.required, ["location"]);
});

test("stripEncryptedSchemaKey handles null, primitives, and arrays safely", () => {
  assert.equal(stripEncryptedSchemaKey(null), null);
  assert.equal(stripEncryptedSchemaKey(undefined), undefined);
  assert.equal(stripEncryptedSchemaKey("text"), "text");
  assert.equal(stripEncryptedSchemaKey(123), 123);
  assert.equal(stripEncryptedSchemaKey(true), true);
  assert.deepEqual(stripEncryptedSchemaKey([1, { encrypted: true, val: 2 }]), [1, { val: 2 }]);
});

test("sanitizeOpenAICompatibleTools sanitizes both function.parameters and direct parameters", () => {
  const tools = [
    {
      type: "function",
      function: {
        name: "test_fn",
        description: "A test function",
        parameters: {
          type: "object",
          properties: {
            foo: { type: "string", encrypted: true },
          },
        },
      },
    },
    {
      type: "custom",
      name: "direct_tool",
      parameters: {
        type: "object",
        properties: {
          bar: { type: "number", encrypted: true },
        },
      },
    },
    null,
    "not-a-tool",
  ];

  const sanitized = sanitizeOpenAICompatibleTools(tools);

  assert.equal(sanitized[0].function.parameters.properties.foo.encrypted, undefined);
  assert.equal(sanitized[0].function.parameters.properties.foo.type, "string");
  assert.equal(sanitized[1].parameters.properties.bar.encrypted, undefined);
  assert.equal(sanitized[1].parameters.properties.bar.type, "number");
  assert.equal(sanitized[2], null);
  assert.equal(sanitized[3], "not-a-tool");
});
