import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveNineRouterFamily, defaultNineRouterProfile } from "../src/nine-router-resolver.mjs";

test("resolveNineRouterFamily maps all 9Router model prefixes correctly", () => {
  assert.equal(resolveNineRouterFamily("ag/gemini-3.7-flash-high"), "google");
  assert.equal(resolveNineRouterFamily("ag/gemini-3.7-flash-medium"), "google");
  assert.equal(resolveNineRouterFamily("ag/claude-opus-4-6-thinking"), "anthropic");
  assert.equal(resolveNineRouterFamily("ocg/deepseek-v4-pro"), "deepseek");
  assert.equal(resolveNineRouterFamily("ocg/deepseek-v4-flash"), "deepseek");
  assert.equal(resolveNineRouterFamily("ocg/glm-5.3"), "glm");
  assert.equal(resolveNineRouterFamily("ocg/mimo-v2.5-pro"), undefined);
  assert.equal(resolveNineRouterFamily("ocg/gpt-5.6-luna"), "openai");
  assert.equal(resolveNineRouterFamily("gcli/grok-4.6"), "xai");
  assert.equal(resolveNineRouterFamily("gcli/grok-4.6-high"), "xai");
  assert.equal(resolveNineRouterFamily("qd/lite"), "qwen");
  assert.equal(resolveNineRouterFamily("qd/qmodel_38max"), "qwen");
  assert.equal(resolveNineRouterFamily("stepplan/step-3.5-flash"), "stepfun");
});

test("defaultNineRouterProfile assigns native requestProfiles to 9Router models", () => {
  assert.equal(defaultNineRouterProfile("ag/gemini-3.7-flash-high"), undefined);
  assert.equal(defaultNineRouterProfile("ag/claude-opus-4-6-thinking"), "deepseek-thinking");
  assert.equal(defaultNineRouterProfile("ocg/deepseek-v4-pro"), "deepseek-thinking");
  assert.equal(defaultNineRouterProfile("ocg/glm-5.3"), "glm-thinking");
  assert.equal(defaultNineRouterProfile("gcli/grok-4.6"), "xai-reasoning");
  assert.equal(defaultNineRouterProfile("qd/qmodel_38max"), "qwen-plan");
  assert.equal(defaultNineRouterProfile("stepplan/step-3.5-flash"), "auto-tool-choice");
});
