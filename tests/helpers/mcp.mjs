import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const token = "synthetic-test-token-not-a-credential";

export async function fixture(t, workspaceId, respond) {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({ method: request.method, url: request.url, body });
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end(JSON.stringify({ detail: "Missing fixture authentication" }));
      return;
    }
    try {
      const reply = respond(request.url, request.method);
      response.writeHead(reply.status ?? 200, { "content-type": "application/json" });
      response.end(JSON.stringify(reply.body));
    } catch (error) {
      response.writeHead(400).end(JSON.stringify({ detail: error.message }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const child = spawn(process.execPath, [fileURLToPath(new URL("../../dist/index.js", import.meta.url))], {
    env: {
      PATH: process.env.PATH,
      MONO_API_TOKEN: token,
      MONO_API_URL: `http://127.0.0.1:${server.address().port}/api/v1`,
      MONO_WORKSPACE_ID: workspaceId,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pending = new Map();
  const stdoutErrors = [];
  const messages = [];
  let buffer = "";
  let stderr = "";
  let nextId = 1;
  let stopping = false;

  function failPending(error) {
    for (const entry of pending.values()) entry.reject(error);
    pending.clear();
  }

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      try {
        const message = JSON.parse(line);
        assert.equal(message.jsonrpc, "2.0", "stdout must contain JSON-RPC only");
        messages.push(message);
        const entry = pending.get(message.id);
        if (entry) {
          pending.delete(message.id);
          entry.resolve(message);
        }
      } catch (error) {
        stdoutErrors.push(error.message);
        failPending(error);
      }
    }
  });
  child.on("error", failPending);
  child.on("exit", (code, signal) => {
    if (!stopping) failPending(new Error(`MCP exited unexpectedly: ${code ?? signal}`));
  });

  t.after(async () => {
    stopping = true;
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "close");
      child.kill();
      await closed;
    }
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    assert.deepEqual(stdoutErrors, []);
    assert.equal(buffer, "", "stdout ends on a complete JSON-RPC message");
    assert.equal(stderr, "", "stdio smoke must not emit diagnostics or credentials");
    assert.ok(!JSON.stringify(messages).includes(token), "token must not appear in tool results");
    assert.ok(requests.every((request) => request.method === "GET" && request.body === ""), "EDU tools only issue bodyless GET requests");
  });

  async function request(method, params = {}) {
    const id = nextId++;
    let timer;
    try {
      return await new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Timed out waiting for ${method}`));
        }, 10000);
        pending.set(id, { resolve, reject });
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      });
    } finally {
      clearTimeout(timer);
    }
  }

  const hello = await request("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "edu-integration-test", version: "1.0.0" },
  });
  assert.equal(hello.error, undefined);
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  return {
    requests,
    hello: hello.result,
    request,
    call: (name, args = {}) => request("tools/call", { name, arguments: args }),
  };
}

export function textResult(response) {
  assert.equal(response.error, undefined);
  assert.notEqual(response.result.isError, true, JSON.stringify(response.result));
  return response.result.content.map((item) => {
    assert.equal(item.type, "text");
    return item.text;
  }).join("\n");
}

export function errorResult(response) {
  assert.equal(response.error, undefined);
  assert.equal(response.result.isError, true);
  return response.result.content.map((item) => item.text).join("\n");
}
