// node --experimental-strip-types scripts/todo-completion-smoke.mjs [app URL] [Chrome URL]
// Uses mocked APIs in a disposable browser context; no saved workspace is changed.
import assert from "node:assert/strict";
import { createSeedGraph } from "../src/data/seed-graph.ts";
import { saveNativeEvent } from "../src/services/native-event-service.ts";
import { isNodeDone } from "../src/services/completion-service.ts";
import { DEFAULT_USER_PREFERENCES } from "../src/services/preferences-service.ts";
import { todayIso } from "../src/utils/date.ts";
import { connectChrome, waitFor } from "./chrome-smoke-client.mjs";
import { calendarInteractions } from "./calendar-smoke-interactions.mjs";

const appUrl = process.argv[2] ?? "http://127.0.0.1:3004";
const day = todayIso();
const connectionId = crypto.randomUUID();
let graph = createSeedGraph(day);
for (const name of ["Native meeting", "Imported meeting"]) {
  graph = saveNativeEvent(graph, crypto.randomUUID(), {
    name, startDate: day, endDate: day, startTime: "09:00", endTime: "10:00",
    description: "Test event", location: "", timeZone: "UTC",
  }, true);
}
const imported = graph.nodes.find((node) => node.properties.name === "Imported meeting");
imported.properties.externalOrigin = {
  kind: "calendar", source: "google", connectionId, calendarId: "work", eventId: "meeting",
};
const errors = [];
const browser = await connectChrome(process.argv[3] ?? "http://127.0.0.1:9225", (event) => {
  if (event.method === "Runtime.exceptionThrown") errors.push(event.params);
  if (event.method === "Fetch.requestPaused") void respond(event.params).catch((error) => errors.push(error));
});
const ui = calendarInteractions(browser);
async function respond({ requestId, request }) {
  const path = new URL(request.url).pathname;
  let value = {};
  if (path === "/api/auth/session") value = { user: { id: connectionId }, expires: "2099-01-01T00:00:00Z" };
  if (path === "/api/preferences") value = DEFAULT_USER_PREFERENCES;
  if (path === "/api/calendars") value = { available: {}, events: [], connections: [{
    id: connectionId, source: "google", address: "test@example.com", status: "connected",
    calendars: [{ id: "work", name: "Work", color: "#4285f4", selected: true, visible: true }],
  }] };
  if (path === "/api/graph") {
    if (request.method !== "GET") graph = JSON.parse(request.postData);
    value = graph;
  }
  await browser.send("Fetch.fulfillRequest", { requestId, responseCode: 200,
    responseHeaders: [{ name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(value)).toString("base64") });
}

try {
  await browser.send("Runtime.enable");
  await browser.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await browser.send("Page.navigate", { url: `${appUrl}/todo` });
  await ui.wait("document.querySelectorAll('.todo-item').length === 4");
  await ui.wait("document.querySelector('.todo-count').textContent === '0 of 4 done'");
  for (const [index, name] of ["Native meeting", "Imported meeting"].entries()) {
    const selector = `[aria-label="Show details for ${name}"]`;
    await ui.evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('li').querySelector('.completion-button').focus()`);
    await ui.key("Enter", 13);
    const id = graph.nodes.find((node) => node.properties.name === name).id;
    await waitFor(() => isNodeDone(graph, id), `${name} completion persisted`);
    await ui.wait(`document.querySelector('.todo-count').textContent === '${index + 1} of 4 done'`);
    assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('li').classList.contains('is-done')`), true);
    await ui.click(selector);
    await ui.wait("document.querySelector('dialog[open]')?.textContent.includes('Completed')");
    await ui.key("Escape", 27);
    await ui.wait("!document.querySelector('dialog[open]')");
  }
  await browser.send("Page.navigate", { url: `${appUrl}/todo` });
  await ui.wait("document.querySelector('.todo-count')?.textContent === '2 of 4 done'");
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  const position = await ui.evaluate(`(() => {
    const button = document.querySelector('[aria-label="Show details for Imported meeting"]').closest('li').querySelector('.completion-button');
    button.scrollIntoView({ block: 'center' });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await ui.touch(position);
  await waitFor(() => !isNodeDone(graph, imported.id), "mobile reopen persisted");
  await ui.wait("document.querySelector('.todo-count').textContent === '1 of 4 done'");
  await ui.touch(position);
  await waitFor(() => isNodeDone(graph, imported.id), "mobile completion persisted");
  assert.deepEqual(errors, []);
  console.log("PASS: native/imported completion, keyboard, styling, details, counts, reload, mobile reopen/complete");
} finally {
  await browser.close();
}
