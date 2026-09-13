import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

export async function connectChrome(debugUrl, onEvent) {
  const { webSocketDebuggerUrl } = await fetch(`${debugUrl}/json/version`).then((r) => r.json());
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return onEvent(message);
    const operation = pending.get(message.id);
    if (!operation) return;
    pending.delete(message.id);
    clearTimeout(operation.timeout);
    if (message.error) operation.reject(new Error(message.error.message));
    else operation.resolve(message.result);
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome timed out: ${method}`));
      }, 30_000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  const { browserContextId } = await send("Target.createBrowserContext");
  const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  return {
    send: (method, params) => send(method, params, sessionId),
    async evaluate(expression) {
      const result = await send("Runtime.evaluate", {
        expression, awaitPromise: true, returnByValue: true,
      }, sessionId);
      assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    },
    async close() {
      await send("Target.disposeBrowserContext", { browserContextId });
      socket.close();
    },
  };
}

export async function waitFor(check, label) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(100);
  }
  assert.fail(`Timed out: ${label}`);
}
