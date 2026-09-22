// Run with the app and Chrome (--remote-debugging-port=9223) running:
// node --experimental-strip-types scripts/calendar-creation-smoke.mjs [app URL] [Chrome URL]
// API calls are mocked in a disposable context; no saved workspace is changed.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveNativeEvent } from "../src/services/event/native/native-event-service.ts";
import { incrementalFixture } from "./incremental-browser-fixture.mjs";
import { todayIso } from "../src/utils/shared/date.ts";
import { connectChrome, waitFor } from "./chrome-smoke-client.mjs";
import { calendarInteractions } from "./calendar-smoke-interactions.mjs";

const appUrl = process.argv[2] ?? "http://127.0.0.1:3004";
const day = todayIso();
let graph = { version: 1, nodes: [{ id: crypto.randomUUID(), type: "root", properties: {} }], relationships: [] };
for (const [name, startTime, endTime] of [["Earlier", "08:00", "09:00"], ["Later", "09:30", "10:00"]]) {
  graph = saveNativeEvent(graph, crypto.randomUUID(), { name, startTime, endTime,
    startDate: day, endDate: day, timeZone: "Europe/Vienna", location: "", description: "" }, true);
}
const fixture = incrementalFixture(graph);
const errors = [];
const browser = await connectChrome(process.argv[3] ?? "http://127.0.0.1:9223", (event) => {
  if (event.method === "Runtime.exceptionThrown") errors.push(event.params);
  if (event.method === "Fetch.requestPaused") void fixture.respond(browser, event.params).catch((error) => errors.push(error));
});
const ui = calendarInteractions(browser);
const opened = "Boolean(document.querySelector('.event-dialog[open]'))";
const closed = "!document.querySelector('.event-dialog[open]')";
const saved = (name) => fixture.graph.nodes.some((node) => node.type === "event" && node.properties.name === name);


try {
  await browser.send("Runtime.enable");
  await browser.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await browser.send("Page.navigate", { url: `${appUrl}/calendar` });
  await ui.wait("document.querySelectorAll('.external-calendar-event').length === 2");
  await ui.wait("Boolean(document.querySelector('.calendar-current-time'))");
  await ui.click('[aria-label="Next week"]');
  await ui.wait("!document.querySelector('.calendar-current-time')");
  await ui.click(".today-button");
  await ui.wait("Boolean(document.querySelector('.calendar-current-time'))");
  await ui.click(`[aria-label="Create all-day event on ${day}"]`);
  await ui.wait(opened);
  assert.equal(await ui.evaluate("document.querySelector('[name=allDay]').checked"), true);
  assert.equal(await ui.evaluate("document.querySelector('[name=startTime]').disabled"), true);
  assert.equal(await ui.evaluate("document.querySelector('[name=endTime]').disabled"), true);
  await ui.field("name", "All-day plan");
  await ui.click(".event-dialog button[type=submit]");
  await waitFor(() => saved("All-day plan"), "all-day event saved");
  const allDay = fixture.graph.nodes.find((node) => node.type === "event" && node.properties.name === "All-day plan");
  assert.equal(allDay.properties.allDay, true);
  assert.equal(allDay.properties.startTime, undefined);
  await ui.wait("[...document.querySelectorAll('.calendar-all-day button:not(.calendar-all-day-create)')].some(button => button.textContent === 'All-day plan')");
  const writesAfterAllDay = fixture.writes.length;
  const position = await ui.point(9 * 60 + 10);
  await ui.mouse(position);
  await ui.wait("document.querySelector('.calendar-create-preview')?.textContent.includes('09:00 – 09:30')");
  assert.equal(fixture.writes.length, writesAfterAllDay);
  const screenshot = await browser.send("Page.captureScreenshot");
  await writeFile(join(tmpdir(), "pavucina-calendar-create-preview.png"), Buffer.from(screenshot.data, "base64"));
  await ui.mouse(position, true);
  await ui.wait(opened);
  assert.equal(await ui.evaluate("document.activeElement.name"), "name");
  assert.equal(await ui.evaluate("document.querySelector('[name=startTime]').value"), "09:00");
  assert.equal(await ui.evaluate("document.querySelector('[name=endTime]').value"), "09:30");
  await ui.field("name", "Created meeting");
  await ui.field("endTime", "08:00");
  await ui.click(".event-dialog button[type=submit]");
  await ui.wait("document.querySelector('.event-error')?.textContent.includes('end after')");
  assert.equal(fixture.writes.length, writesAfterAllDay);
  await ui.field("endTime", "09:30");
  await ui.click(".event-dialog button[type=submit]");
  await ui.wait(closed);
  await waitFor(() => saved("Created meeting"), "event saved to graph");

  await ui.selectEvent("Created meeting");
  await ui.wait(opened);
  await ui.field("name", "Updated meeting");
  await ui.field("endTime", "11:00");
  await ui.click(".event-dialog button[type=submit]");
  await waitFor(() => saved("Updated meeting"), "longer overlapping edit saved");
  await browser.send("Page.navigate", { url: `${appUrl}/calendar` });
  await ui.wait("[...document.querySelectorAll('.external-calendar-event strong')].some(node => node.textContent === 'Updated meeting')");
  await ui.selectEvent("Updated meeting");
  await ui.wait(opened);
  await ui.click(".event-dialog .dialog-danger");
  await ui.wait("document.querySelectorAll('dialog[open]').length === 2");
  await ui.click("dialog[open]:not(.event-dialog) button[type=button]");
  await ui.wait("document.querySelectorAll('dialog[open]').length === 1");
  assert.equal(saved("Updated meeting"), true);
  await ui.click(".event-dialog .dialog-danger");
  await ui.wait("document.querySelectorAll('dialog[open]').length === 2");
  await ui.key("Escape", 27);
  await ui.wait("document.querySelectorAll('dialog[open]').length === 1");
  await ui.click(".event-dialog .dialog-danger");
  await ui.wait("document.querySelectorAll('dialog[open]').length === 2");
  await ui.click("dialog[open]:not(.event-dialog) button[type=submit]");
  await waitFor(() => !saved("Updated meeting"), "event deletion saved");
  await ui.evaluate("document.querySelector('.calendar-days').focus()");
  assert.equal(await ui.evaluate("document.activeElement.className"), "calendar-days");
  await ui.key("Enter", 13);
  await ui.wait(opened);
  await ui.key("Escape", 27);
  await ui.wait(closed);

  await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await ui.evaluate(`(() => {
    window.calendarInputLog = [];
    for (const type of ['pointerdown', 'pointerup', 'pointerleave', 'pointercancel', 'click', 'scroll']) {
      document.addEventListener(type, event => {
        window.calendarInputLog.push({ type, pointer: event.pointerType,
          target: event.target.className, x: event.clientX, y: event.clientY });
      }, { capture: true, passive: true });
    }
  })()`);
  await ui.wait("document.querySelector('.calendar-edit-lock')?.getAttribute('aria-pressed') === 'true'");
  assert.equal(await ui.evaluate("document.querySelector('.calendar-all-day-create').disabled"), true);
  await ui.touch(await ui.point(9 * 60 + 10));
  assert.equal(await ui.evaluate(closed), true);
  await ui.click(".calendar-edit-lock");
  await ui.touch(await ui.point(9 * 60 + 10));
  await ui.wait(opened);
  await ui.field("name", "Mobile meeting");
  await ui.click(".event-dialog button[type=submit]");
  await waitFor(() => saved("Mobile meeting"), "one-tap mobile creation saved");
  const scrollPosition = await ui.point(12 * 60);
  const before = await ui.evaluate("document.querySelector('.calendar-scroll').scrollTop");
  await ui.touch(scrollPosition, true);
  await waitFor(async () => await ui.evaluate("document.querySelector('.calendar-scroll').scrollTop") !== before, "touch scroll moves calendar");
  assert.equal(await ui.evaluate(closed), true);
  assert.equal(await ui.evaluate("Boolean(document.querySelector('.calendar-create-preview'))"), false);

  fixture.userId = null;
  await browser.send("Page.navigate", { url: `${appUrl}/calendar` });
  await ui.wait("Boolean(document.querySelector('.calendar-edit-lock'))");
  await ui.click(".calendar-edit-lock");
  await ui.touch(await ui.point(12 * 60));
  await ui.wait(opened);
  await ui.field("name", "Guest event");
  await ui.click(".event-dialog button[type=submit]");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await browser.send("Page.navigate", { url: `${appUrl}/calendar` });
  await ui.wait("document.body.innerText.includes('Guest event')");
  assert.deepEqual(errors, []);
  console.log("PASS: all-day, hover preview, click, validation, create/edit/delete, reload, keyboard, mobile lock/tap/scroll, guest persistence");
} catch (error) {
  console.error(await ui.evaluate("document.body.innerText"), errors, await ui.evaluate("window.calendarInputLog"));
  throw error;
} finally {
  await browser.close();
}
