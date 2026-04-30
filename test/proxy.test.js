import assert from "node:assert/strict";
import { Writable } from "node:stream";
import test from "node:test";
import {
  extractSSEDataMessages,
  forwardLine,
  readConfig,
  runProxy,
} from "../src/proxy.js";

test("readConfig defaults to the hosted Cold Agent MCP endpoint", () => {
  const config = readConfig({ COLD_AGENT_API_KEY: "ca_test" });

  assert.equal(config.apiKey, "ca_test");
  assert.equal(config.mcpUrl, "https://getcoldagent.com/api/mcp");
  assert.equal(config.protocolVersion, "2025-11-25");
});

test("forwardLine posts JSON-RPC to the hosted endpoint with auth headers", async () => {
  const output = captureStream();
  const error = captureStream();
  const responseBody = { jsonrpc: "2.0", id: 1, result: { ok: true } };
  let request;

  const fetchImpl = async (url, init) => {
    request = { url, init };
    return response(JSON.stringify(responseBody), {
      headers: { "content-type": "application/json", "mcp-session-id": "session-1" },
    });
  };

  const config = readConfig({
    COLD_AGENT_API_KEY: "ca_secret",
    COLD_AGENT_MCP_URL: "https://example.test/api/mcp",
  });

  await forwardLine(
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
    config,
    output,
    error,
    fetchImpl,
  );

  assert.equal(request.url, "https://example.test/api/mcp");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.Authorization, "Bearer ca_secret");
  assert.equal(request.init.headers["Mcp-Method"], "initialize");
  assert.equal(config.sessionId, "session-1");
  assert.equal(output.text, `${JSON.stringify(responseBody)}\n`);
  assert.equal(error.text, "");
});

test("forwardLine writes a JSON-RPC error when the remote request fails", async () => {
  const output = captureStream();
  const error = captureStream();
  const fetchImpl = async () => response("bad key", { status: 401 });
  const config = readConfig({ COLD_AGENT_API_KEY: "bad" });

  await forwardLine(
    JSON.stringify({ jsonrpc: "2.0", id: "req-1", method: "tools/list" }),
    config,
    output,
    error,
    fetchImpl,
  );

  const parsed = JSON.parse(output.text);
  assert.equal(parsed.id, "req-1");
  assert.equal(parsed.error.code, -32603);
  assert.match(parsed.error.message, /HTTP 401/);
  assert.equal(error.text, "");
});

test("forwardLine keeps invalid remote bodies off stdout as plain text", async () => {
  const output = captureStream();
  const error = captureStream();
  const fetchImpl = async () => response("not json");
  const config = readConfig({ COLD_AGENT_API_KEY: "ca_secret" });

  await forwardLine(
    JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    config,
    output,
    error,
    fetchImpl,
  );

  const parsed = JSON.parse(output.text);
  assert.equal(parsed.id, 2);
  assert.equal(parsed.error.code, -32603);
  assert.match(parsed.error.message, /invalid JSON-RPC/);
  assert.equal(error.text, "");
});

test("runProxy fails fast without an API key", async () => {
  const output = captureStream();
  const error = captureStream();

  const exitCode = await runProxy({
    input: [],
    output,
    error,
    env: {},
    fetchImpl: async () => {
      throw new Error("should not fetch");
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(output.text, "");
  assert.match(error.text, /COLD_AGENT_API_KEY is required/);
});

test("extractSSEDataMessages returns non-empty data events", () => {
  const messages = extractSSEDataMessages(
    ": ping\n\nid: 1\ndata: {\"jsonrpc\":\"2.0\",\"id\":1}\n\nid: 2\ndata: [DONE]\n\ndata: {\"jsonrpc\":\"2.0\",\"id\":2}\n\n",
  );

  assert.deepEqual(messages, [
    "{\"jsonrpc\":\"2.0\",\"id\":1}",
    "{\"jsonrpc\":\"2.0\",\"id\":2}",
  ]);
});

function captureStream() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });

  Object.defineProperty(stream, "text", {
    get() {
      return Buffer.concat(chunks).toString("utf8");
    },
  });

  return stream;
}

function response(body, options = {}) {
  return new Response(body, {
    status: options.status || 200,
    headers: options.headers || { "content-type": "application/json" },
  });
}
