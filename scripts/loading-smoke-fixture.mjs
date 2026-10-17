import { createSeedGraph } from "../src/data/seed-graph.ts";
import { todayIso } from "../src/utils/shared/temporal/date.ts";
import { incrementalFixture } from "./incremental-browser-fixture.mjs";
import { connectChrome } from "./chrome-smoke-client.mjs";
import { calendarInteractions } from "./calendar-smoke-interactions.mjs";

export async function loadingFixture(debugUrl) {
  const fixture = incrementalFixture(createSeedGraph(todayIso()));
  fixture.connections = [{ id: crypto.randomUUID(), source: "google", address: "test@example.com", status: "connected",
    calendars: [{ id: "work", name: "Work calendar", color: "#4285f4", selected: true, visible: true }] }];
  const mail = { available: {}, connections: [{ id: "mail", source: "gmail", address: "test@example.com", status: "connected" }],
    messages: Array.from({ length: 12 }, (_, index) => ({ connectionId: "mail", source: "gmail", account: "test@example.com",
      id: String(index), subject: `Message ${index}`, sender: "sender@example.com", receivedAt: new Date().toISOString(), preview: "Preview" })) };
  const held = new Set(), waiting = [], failures = new Set(), errors = [];
  const browser = await connectChrome(debugUrl, (event) => {
    if (event.method === "Runtime.exceptionThrown") errors.push(event.params);
    if (event.method === "Fetch.requestPaused") void respond(event.params).catch((error) => errors.push(error));
  });

  async function respond(params) {
    const path = new URL(params.request.url).pathname;
    if (held.has(path)) { waiting.push(params); return; }
    if (failures.has(path)) return fulfill(params.requestId, { error: "Simulated load failure" }, 500);
    if (path === "/api/mailboxes") return fulfill(params.requestId, mail);
    if (path === "/api/calendars/import") return fulfill(params.requestId, { syncedAt: new Date().toISOString(), errors: [] });
    return fixture.respond(browser, params);
  }

  function fulfill(requestId, value, responseCode = 200) {
    return browser.send("Fetch.fulfillRequest", { requestId, responseCode,
      responseHeaders: [{ name: "content-type", value: "application/json" }], body: Buffer.from(JSON.stringify(value)).toString("base64") });
  }

  async function release(path) {
    held.delete(path);
    const requests = waiting.filter(({ request }) => new URL(request.url).pathname === path);
    for (const request of requests) waiting.splice(waiting.indexOf(request), 1);
    await Promise.all(requests.map(respond));
  }

  await browser.send("Runtime.enable");
  await browser.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  return { browser, fixture, mail, held, failures, errors, release, ui: calendarInteractions(browser),
    pending: (path) => waiting.some(({ request }) => new URL(request.url).pathname === path) };
}

export function layoutSnapshot(browser, selectors) {
  return browser.evaluate(`(${JSON.stringify(selectors)}).map(selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error('Missing layout anchor: ' + selector);
    const rect = element.getBoundingClientRect();
    return [selector, rect.x + scrollX, rect.y + scrollY, rect.width, rect.height];
  })`);
}
