// Run against the local app and a debugging Chrome instance. APIs use an isolated fixture.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { connectChrome, waitFor } from "./chrome-smoke-client.mjs";
import { calendarInteractions } from "./calendar-smoke-interactions.mjs";
import { incrementalFixture } from "./incremental-browser-fixture.mjs";
import { checkDescriptions, checkDescriptionAccountChange, checkDescriptionDeletion } from "./description-editing-checks.mjs";
import { todayIso, addDays } from "../src/utils/shared/temporal/date.ts";
import { getTaskTime } from "../src/services/task/scheduling/task-time-service.ts";
import { scheduleTaskForDay } from "../src/services/task/scheduling/day/task-day-schedule-service.ts";
import { setTaskDates } from "../src/services/task/scheduling/dates/task-date-range-service.ts";
import { renameTask } from "../src/services/task/core/task-service.ts";
import { saveNativeEvent } from "../src/services/event/native/native-event-service.ts";

const appUrl = process.argv[2] ?? "http://localhost:3000";
const ids = Object.fromEntries(["root", "task", "tray", "other", "native", "overnight", "inbox"].map((key) => [key, crypto.randomUUID()]));
const day = todayIso();
let graph = { version: 1, nodes: [{ id: ids.root, type: "root", properties: {} },
  ...[["task", "Scheduled task"], ["tray", "Tray task"], ["other", "Other task"]].map(([key, name]) =>
    ({ id: ids[key], type: "task", properties: { name } }))],
  relationships: ["task", "tray", "other"].map((key) =>
    ({ id: crypto.randomUUID(), type: "child", sourceId: ids.root, targetId: ids[key] })),
  inboxNodes: [{ id: ids.inbox, type: "task", properties: { name: "Captured task" } }] };
graph = scheduleTaskForDay(graph, ids.task, day, "11:00", "12:00");
graph = scheduleTaskForDay(graph, ids.other, day, "13:00", "14:00");
graph = setTaskDates(graph, ids.tray, day, day);
for (const [key, name, start, end, endDate] of [["native", "Meeting", "09:00", "10:00", day],
  ["overnight", "Overnight", "22:00", "02:00", addDays(day, 1)]]) {
  graph = saveNativeEvent(graph, ids[key], { name, startDate: day, endDate, startTime: start,
    endTime: end, description: "", location: "", timeZone: "Europe/Vienna" }, true);
}
const fixture = incrementalFixture(graph);
const errors = [];
const failedLoads = [];
const pendingLoads = new Map();
const browser = await connectChrome(process.argv[3] ?? "http://127.0.0.1:9223", (event) => {
  if (event.method === "Runtime.exceptionThrown") errors.push(event.params);
  if (event.method === "Network.loadingFailed") failedLoads.push({ ...event.params, url: pendingLoads.get(event.params.requestId) });
  if (event.method === "Log.entryAdded" && event.params.entry.level === "error") errors.push(event.params.entry);
  if (event.method === "Runtime.consoleAPICalled" && event.params.type === "error") errors.push(event.params.args);
  if (event.method === "Network.requestWillBeSent") pendingLoads.set(event.params.requestId, event.params.request.url);
  if (event.method === "Network.loadingFinished" || event.method === "Network.loadingFailed") pendingLoads.delete(event.params.requestId);
  if (event.method === "Fetch.requestPaused") {
    const params = event.params;
    const respond = new URL(params.request.url).pathname === "/api/mailboxes"
      ? browser.send("Fetch.fulfillRequest", { requestId: params.requestId, responseCode: 200,
          responseHeaders: [{ name: "content-type", value: "application/json" }],
          body: Buffer.from(JSON.stringify({ available: {}, connections: [], messages: [] })).toString("base64") })
      : fixture.respond(browser, params);
    void respond.catch((error) => errors.push(error));
  }
});
const ui = calendarInteractions(browser);
const start = (id) => getTaskTime(fixture.graph, id, "plannedStartTime");
const end = (id) => getTaskTime(fixture.graph, id, "plannedEndTime");
const mouse = (type, point) => browser.send("Input.dispatchMouseEvent", { type, button: "left", buttons: type === "mouseReleased" ? 0 : 1, ...point });
async function grab(name, edge = "move") {
  return ui.evaluate(`(() => {
    const label = ${JSON.stringify(edge === "move" ? `Move ${name}` : `Change ${edge} time of ${name}`)};
    const button = [...document.querySelectorAll('.calendar-event button')].find(button => button.getAttribute('aria-label') === label);
    button.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + (rect.height > 40 ? 32 : rect.height / 2) };
  })()`);
}
async function oneDrop(id, expectedStart, operation) {
  const before = fixture.writes.length;
  await operation();
  await waitFor(() => start(id) === expectedStart, "calendar drop saved at expected time");
  assert.equal(fixture.writes.length, before + 1);
}

try {
  await browser.send("Runtime.enable");
  await browser.send("Log.enable");
  await browser.send("Network.enable");
  await browser.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await browser.send("Page.navigate", { url: `${appUrl}/calendar` });
  await ui.wait("document.querySelectorAll('.calendar-event-body').length >= 3");
  const rulerOffset = await ui.evaluate("(() => { const label = document.querySelectorAll('.calendar-times span')[12].getBoundingClientRect(); const line = document.querySelectorAll('.calendar-hour-line')[12].getBoundingClientRect(); return label.top + label.height / 2 - line.top; })()");
  assert.ok(Math.abs(rulerOffset) < 1, "hour ruler must align with the scheduling grid");
  await checkDescriptions(browser, fixture, ui, ids, appUrl);
  await ui.evaluate("document.addEventListener('pointerdown', event => window.editingPointerId = event.pointerId, true)");

  const point = await grab("Scheduled task");
  const writes = fixture.writes.length;
  await mouse("mousePressed", point);
  for (const offset of [32, 64]) await mouse("mouseMoved", { ...point, y: point.y + offset });
  await ui.wait("[...document.querySelectorAll('.calendar-event-body')].some(button => button.textContent.includes('11:30'))");
  await delay(750);
  assert.equal(fixture.writes.length, writes, "drag preview must not save");
  assert.equal(start(ids.task), "11:00");
  fixture.edit(renameTask(fixture.graph, ids.other, "Unrelated update"));
  await ui.evaluate("window.dispatchEvent(new Event('focus'))");
  await delay(200);
  await oneDrop(ids.task, "11:45", () => mouse("mouseReleased", { ...point, y: point.y + 96 }));
  assert.equal(end(ids.task), "12:45");
  assert.equal(fixture.graph.nodes.find((node) => node.id === ids.other).properties.name, "Unrelated update");

  const resize = await grab("Scheduled task", "end");
  const beforeResize = fixture.writes.length;
  await mouse("mousePressed", resize);
  await mouse("mouseMoved", { ...resize, y: resize.y + 32 });
  await delay(700);
  assert.equal(fixture.writes.length, beforeResize);
  await mouse("mouseReleased", { ...resize, y: resize.y + 32 });
  await waitFor(() => end(ids.task) === "13:00", "quarter-hour resize saved");
  assert.equal(fixture.writes.length, beforeResize + 1);

  const cancelled = await grab("Scheduled task");
  const beforeCancel = fixture.writes.length;
  await mouse("mousePressed", cancelled);
  await mouse("mouseMoved", { ...cancelled, y: cancelled.y + 32 });
  await ui.evaluate("document.querySelector('.calendar-days').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: window.editingPointerId }))");
  await mouse("mouseReleased", { ...cancelled, y: cancelled.y + 32 });
  await delay(700);
  assert.equal(fixture.writes.length, beforeCancel);
  assert.equal(start(ids.task), "11:45");

  const meeting = await grab("Meeting");
  const beforeMeeting = fixture.writes.length;
  await mouse("mousePressed", meeting);
  await mouse("mouseMoved", { ...meeting, y: meeting.y + 32 });
  await mouse("mouseReleased", { ...meeting, y: meeting.y + 32 });
  await waitFor(() => fixture.graph.nodes.find((node) => node.id === ids.native).properties.startTime === "09:15", "native event move saved");
  assert.equal(fixture.writes.length, beforeMeeting + 1);

  await ui.evaluate("window.scrollTo(0, 0); document.querySelector('.calendar-scroll').scrollTop = 9 * 128");
  await delay(150);
  const tray = await ui.evaluate("(() => { const r = [...document.querySelectorAll('.schedule-tray-task')].find(button => button.textContent.includes('Tray task')).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()");
  const drop = await ui.evaluate(`(() => { const r = document.querySelector('.calendar-days').getBoundingClientRect(); const days = [...document.querySelectorAll('.calendar-days-header > div')].slice(1); const index = days.findIndex(node => node.classList.contains('today')); return { x: r.left + (index + 0.5) * r.width / days.length, y: r.top + 9.25 * 128 }; })()`);
  await oneDrop(ids.tray, "09:15", async () => {
    await mouse("mousePressed", tray);
    await mouse("mouseMoved", drop);
    await mouse("mouseReleased", drop);
  });

  await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await ui.wait("document.querySelector('.calendar-edit-lock')?.getAttribute('aria-pressed') === 'true'");
  await ui.click(".calendar-edit-lock");
  const touch = await grab("Scheduled task");
  await oneDrop(ids.task, "12:00", async () => {
    await browser.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
    await browser.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...touch, y: touch.y + 32 }] });
    await browser.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  });
  await checkDescriptionAccountChange(browser, fixture, ui, ids.task);
  await checkDescriptionDeletion(browser, fixture, ui, ids.task);
  assert.deepEqual(errors, []);
  console.log("PASS: description debounce/switch/navigation/account isolation, local drag previews, one save per drop/resize, final release coordinates, cancellation, concurrent edits, tray drops, and mobile touch dragging");
} catch (error) {
  console.error(await ui.evaluate("document.body.innerText"), errors, failedLoads, [...pendingLoads.values()]);
  throw error;
} finally {
  await browser.close();
}
