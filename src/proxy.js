const DEFAULT_MCP_URL = "https://getcoldagent.com/api/mcp";
const DEFAULT_PROTOCOL_VERSION = "2025-11-25";
const DEFAULT_TIMEOUT_MS = 60000;
const MAX_ERROR_BODY_LENGTH = 500;

export function readConfig(env = process.env) {
  const apiKey = (env.COLD_AGENT_API_KEY || "").trim();
  const mcpUrl = (env.COLD_AGENT_MCP_URL || DEFAULT_MCP_URL).trim();
  const protocolVersion = (
    env.COLD_AGENT_MCP_PROTOCOL_VERSION ||
    env.MCP_PROTOCOL_VERSION ||
    DEFAULT_PROTOCOL_VERSION
  ).trim();
  const timeoutMs = parsePositiveInteger(
    env.COLD_AGENT_MCP_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  );

  return {
    apiKey,
    mcpUrl,
    protocolVersion,
    timeoutMs,
    sessionId: "",
  };
}

export async function runProxy({
  input = process.stdin,
  output = process.stdout,
  error = process.stderr,
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const config = readConfig(env);

  if (!config.apiKey) {
    error.write(
      "cold-agent-mcp: COLD_AGENT_API_KEY is required. Create one at https://getcoldagent.com/settings/api-keys\n",
    );
    return 1;
  }

  if (!fetchImpl) {
    error.write("cold-agent-mcp: Node.js fetch is unavailable. Use Node 18 or newer.\n");
    return 1;
  }

  if (typeof input.setEncoding === "function") {
    input.setEncoding("utf8");
  }

  let buffer = "";
  for await (const chunk of input) {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    buffer = await drainLines(buffer, config, output, error, fetchImpl);
  }

  const finalLine = buffer.trim();
  if (finalLine) {
    await forwardLine(finalLine, config, output, error, fetchImpl);
  }

  return 0;
}

export async function drainLines(buffer, config, output, error, fetchImpl) {
  let next = buffer;
  let newlineIndex = next.indexOf("\n");

  while (newlineIndex !== -1) {
    const line = next.slice(0, newlineIndex).trim();
    next = next.slice(newlineIndex + 1);
    if (line) {
      await forwardLine(line, config, output, error, fetchImpl);
    }
    newlineIndex = next.indexOf("\n");
  }

  return next;
}

export async function forwardLine(rawLine, config, output, error, fetchImpl) {
  let payload;
  try {
    payload = JSON.parse(rawLine);
  } catch {
    writeJSONRPC(output, parseErrorResponse());
    return;
  }

  let response;
  try {
    response = await postToRemote(rawLine, payload, config, fetchImpl);
  } catch (err) {
    if (expectsResponse(payload)) {
      writeJSONRPC(output, errorResponseForPayload(payload, -32603, err.message));
    } else {
      error.write(`cold-agent-mcp: ${err.message}\n`);
    }
    return;
  }

  if (!response) {
    return;
  }

  for (const message of response.messages) {
    writeNormalizedMessage(output, error, payload, message);
  }
}

async function postToRemote(rawLine, payload, config, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers = {
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "@razroo/cold-agent-mcp/0.1.1",
    };

    if (config.protocolVersion) {
      headers["MCP-Protocol-Version"] = config.protocolVersion;
    }
    if (config.sessionId) {
      headers["MCP-Session-Id"] = config.sessionId;
    }

    const method = methodFromPayload(payload);
    if (method) {
      headers["Mcp-Method"] = method;
    }

    const response = await fetchImpl(config.mcpUrl, {
      method: "POST",
      headers,
      body: rawLine,
      signal: controller.signal,
    });

    const nextSessionId = response.headers.get("mcp-session-id");
    if (nextSessionId) {
      config.sessionId = nextSessionId;
    }

    if (response.status === 202 || response.status === 204) {
      return null;
    }

    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(httpErrorMessage(response.status, bodyText));
    }

    if (!bodyText.trim()) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.toLowerCase().includes("text/event-stream")) {
      return { messages: extractSSEDataMessages(bodyText) };
    }

    return { messages: [bodyText] };
  } catch (err) {
    if (err && err.name === "AbortError") {
      throw new Error(`request to ${config.mcpUrl} timed out after ${config.timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractSSEDataMessages(text) {
  const messages = [];
  let dataLines = [];

  for (const line of text.split(/\r?\n/)) {
    if (line === "") {
      flushSSEData(messages, dataLines);
      dataLines = [];
      continue;
    }
    if (line.startsWith(":")) {
      continue;
    }

    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    if (field === "data") {
      dataLines.push(value);
    }
  }

  flushSSEData(messages, dataLines);
  return messages;
}

function flushSSEData(messages, dataLines) {
  if (dataLines.length === 0) {
    return;
  }

  const data = dataLines.join("\n").trim();
  if (data && data !== "[DONE]") {
    messages.push(data);
  }
}

function writeNormalizedMessage(output, error, payload, message) {
  const trimmed = String(message).trim();
  if (!trimmed) {
    return;
  }

  try {
    writeJSONRPC(output, JSON.parse(trimmed));
  } catch {
    const errorMessage = "Cold Agent MCP returned an invalid JSON-RPC response";
    if (expectsResponse(payload)) {
      writeJSONRPC(output, errorResponseForPayload(payload, -32603, errorMessage));
      return;
    }
    error.write(`cold-agent-mcp: ${errorMessage}\n`);
  }
}

function writeJSONRPC(output, payload) {
  output.write(`${JSON.stringify(payload)}\n`);
}

function parseErrorResponse() {
  return {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32700,
      message: "Parse error",
    },
  };
}

function errorResponseForPayload(payload, code, message) {
  if (Array.isArray(payload)) {
    const responses = payload
      .filter((item) => item && typeof item === "object" && Object.hasOwn(item, "id"))
      .map((item) => errorResponse(item.id, code, message));
    return responses.length > 0 ? responses : errorResponse(null, code, message);
  }

  const id =
    payload && typeof payload === "object" && Object.hasOwn(payload, "id")
      ? payload.id
      : null;
  return errorResponse(id, code, message);
}

function errorResponse(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}

function expectsResponse(payload) {
  if (Array.isArray(payload)) {
    return payload.some(
      (item) => item && typeof item === "object" && Object.hasOwn(item, "id"),
    );
  }

  return payload && typeof payload === "object" && Object.hasOwn(payload, "id");
}

function methodFromPayload(payload) {
  if (payload && !Array.isArray(payload) && typeof payload.method === "string") {
    return payload.method;
  }
  return "";
}

function httpErrorMessage(status, bodyText) {
  const body = bodyText.trim().slice(0, MAX_ERROR_BODY_LENGTH);
  return body
    ? `Cold Agent MCP returned HTTP ${status}: ${body}`
    : `Cold Agent MCP returned HTTP ${status}`;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
