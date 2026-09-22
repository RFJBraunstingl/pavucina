// node --experimental-strip-types scripts/todo-completion-smoke.mjs [app URL] [Chrome URL]
// Uses mocked APIs in a disposable browser context; no saved workspace is changed.
import assert from "node:assert/strict";
import { createSeedGraph } from "../src/data/seed-graph.ts";
import { saveNativeEvent } from "../src/services/event/native/native-event-service.ts";
import { isNodeDone } from "../src/services/event/completion-service.ts";
import { incrementalFixture } from "./incremental-browser-fixture.mjs";
import { todayIso } from "../src/utils/shared/date.ts";
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
const fixture = incrementalFixture(graph);
fixture.preferences.hideDone = false;
fixture.connections = [{ id: connectionId, source: "google", address: "test@example.com", status: "connected",
  calendars: [{ id: "work", name: "Work", color: "#4285f4", selected: true, visible: true }] }];
const errors = [];
const browser = await connectChrome(process.argv[3] ?? "http://127.0.0.1:9225", (event) => {
  if (event.method === "Runtime.exceptionThrown") errors.push(event.params);
  if (event.method === "Fetch.requestPaused") void fixture.respond(browser, event.params).catch((error) => errors.push(error));
});
const ui = calendarInteractions(browser);

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
    await waitFor(() => isNodeDone(fixture.graph, id), `${name} completion persisted`);
    await ui.wait(`document.querySelector('.todo-count').textContent === '${index + 1} of 4 done'`);
    await ui.wait(`document.querySelector(${JSON.stringify(selector)})?.closest('li').classList.contains('is-done')`);
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
  await waitFor(() => !isNodeDone(fixture.graph, imported.id), "mobile reopen persisted");
  await ui.wait("document.querySelector('.todo-count').textContent === '1 of 4 done'");
  await ui.touch(position);
  await waitFor(() => isNodeDone(fixture.graph, imported.id), "mobile completion persisted");
  await browser.send("Page.navigate", { url: `${appUrl}/calendar` });
  const nativeVisible = "[...document.querySelectorAll('.calendar-event strong')].some(node => node.textContent === 'Native meeting')";
  await ui.wait(nativeVisible);
  await ui.click(".done-toggle input");
  await ui.wait(`!(${nativeVisible})`);
  assert.deepEqual(errors, []);
  console.log("PASS: native/imported completion, keyboard, styling, details, counts, reload, mobile, calendar hide done");
} finally {
  await browser.close();
}
