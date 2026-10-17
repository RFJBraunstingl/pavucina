// Uses delayed mocked APIs in disposable Chrome contexts; no saved workspace is changed.
// node --experimental-strip-types --import ./scripts/register-typescript.mjs scripts/loading-layout-smoke.mjs [app URL] [Chrome URL]
import assert from "node:assert/strict";
import { waitFor } from "./chrome-smoke-client.mjs";
import { loadingFixture, layoutSnapshot } from "./loading-smoke-fixture.mjs";

const appUrl = process.argv[2] ?? "http://127.0.0.1:3004";
const debugUrl = process.argv[3] ?? "http://127.0.0.1:9225";
const views = { todo: [".todo-heading"], timeline: [".timeline-toolbar", ".inspector"],
  calendar: [".timeline-toolbar", ".inspector"], inbox: [".source-heading", ".scratchpad-panel header", ".task-panel-heading"],
  preferences: [".preferences-card header", ".backup-restore header"] };
const frames = "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))";

async function initialLoad(page, width) {
  const test = await loadingFixture(debugUrl);
  const { browser, ui, fixture, held, errors, release } = test;
  try {
    held.add("/api/auth/session"); held.add("/api/graph"); held.add("/api/preferences");
    await browser.send("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 680 });
    await browser.send("Page.navigate", { url: `${appUrl}/${page}` });
    await ui.wait("Boolean(document.querySelector('.app-header .is-active'))");
    await ui.evaluate(frames);
    const anchors = [".app-header", ".app-nav", ...views[page]];
    const before = await layoutSnapshot(browser, anchors);
    await release("/api/auth/session");
    await waitFor(() => test.pending("/api/graph") && test.pending("/api/preferences"), "initial data requests paused");
    await ui.evaluate(frames);
    assert.deepEqual(await layoutSnapshot(browser, anchors), before, `${page} session resolution at ${width}px`);
    assert.equal(fixture.writes.length, 0);
    await release("/api/graph"); await release("/api/preferences");
    await ui.wait("!document.querySelector('.app-header .is-active')");
    await ui.evaluate(frames);
    // Real task results can expand the calendar tray above the mobile inspector.
    const settledAnchors = page === "calendar" && width < 680 ? anchors.filter((selector) => selector !== ".inspector") : anchors;
    assert.deepEqual(await layoutSnapshot(browser, settledAnchors), before.filter(([selector]) => settledAnchors.includes(selector)), `${page} initial data at ${width}px`);
    assert.deepEqual(errors, []);
    console.log(`PASS: ${page} first-load frame at ${width}px`);
  } finally { await browser.close(); }
}

for (const width of [1440, 390]) {
  for (const page of Object.keys(views)) await initialLoad(page, width);
}

const test = await loadingFixture(debugUrl);
const { browser, ui, fixture, held, failures, errors, release } = test;
try {
  fixture.preferences.calendarEventImportEnabled = true;
  held.add("/api/calendars"); held.add("/api/calendars/import");
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await browser.send("Page.navigate", { url: `${appUrl}/todo` });
  await ui.wait("document.querySelectorAll('.todo-item').length > 0");
  await waitFor(() => test.pending("/api/calendars/import"), "calendar import paused");
  await ui.evaluate("window.retainedRow = document.querySelector('.todo-item'); retainedRow.querySelector('button').focus()");
  const before = await layoutSnapshot(browser, [".todo-heading", ".todo-item"]);
  await browser.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  assert.equal(await ui.evaluate("getComputedStyle(document.querySelector('.todo-heading .is-active')).animationName"), "none");
  await release("/api/calendars");
  await ui.evaluate(frames);
  assert.equal(await ui.evaluate("Boolean(document.querySelector('.todo-heading .is-active'))"), true);
  assert.deepEqual(await layoutSnapshot(browser, [".todo-heading", ".todo-item"]), before);
  await release("/api/calendars/import");
  await ui.wait("!document.querySelector('.todo-heading .is-active')");
  assert.deepEqual(await layoutSnapshot(browser, [".todo-heading", ".todo-item"]), before);
  assert.equal(await ui.evaluate("document.querySelector('.todo-item') === retainedRow && retainedRow.contains(document.activeElement)"), true);

  await browser.send("Page.navigate", { url: `${appUrl}/calendar` });
  await ui.wait("document.querySelectorAll('.calendar-toggles label').length === 1");
  await ui.wait("!document.querySelector('.external-calendar-controls .is-active')");
  const calendarBefore = await layoutSnapshot(browser, [".timeline-toolbar", ".calendar-hint", ".calendar-scroll"]);
  await ui.evaluate("document.querySelector('.calendar-scroll').scrollTop = 400");
  held.add("/api/calendars");
  await ui.click(".external-calendar-controls > button:nth-of-type(2)");
  await waitFor(() => test.pending("/api/calendars"), "calendar refresh paused");
  assert.deepEqual(await layoutSnapshot(browser, [".timeline-toolbar", ".calendar-hint", ".calendar-scroll"]), calendarBefore);
  assert.equal(await ui.evaluate("document.querySelector('.calendar-scroll').scrollTop"), 400);
  await release("/api/calendars");
  await ui.wait("!document.querySelector('.external-calendar-controls .is-active')");
  assert.equal(await ui.evaluate("document.querySelector('.calendar-scroll').scrollTop"), 400);

  await browser.send("Page.navigate", { url: `${appUrl}/inbox` });
  await ui.wait("document.querySelectorAll('.mail-message-list li').length === 12");
  await ui.wait("!document.querySelector('#scratchpad-task').disabled");
  held.add("/api/mailboxes");
  await ui.click(".source-heading button");
  await waitFor(() => test.pending("/api/mailboxes"), "mail refresh paused");
  await ui.evaluate("window.retainedMail = document.querySelector('.mail-message-list'); document.querySelector('.source-content').scrollTop = 200; document.querySelector('#scratchpad-task').focus()");
  const mailBefore = await layoutSnapshot(browser, [".source-heading", ".mail-message-list"]);
  await release("/api/mailboxes");
  await ui.wait("!document.querySelector('.source-heading .is-active')");
  assert.deepEqual(await layoutSnapshot(browser, [".source-heading", ".mail-message-list"]), mailBefore);
  assert.equal(await ui.evaluate("document.querySelector('.mail-message-list') === retainedMail && document.activeElement.id === 'scratchpad-task' && document.querySelector('.source-content').scrollTop === 200"), true);
  failures.add("/api/mailboxes");
  await ui.click(".source-heading button");
  await ui.wait("Boolean(document.querySelector('.mailbox-message'))");
  assert.equal(await ui.evaluate("Boolean(document.querySelector('.source-heading .is-active'))"), false);
  assert.equal(await ui.evaluate("document.querySelectorAll('.mail-message-list li').length"), 12);
  failures.clear(); test.mail.messages = [];
  await ui.click(".source-heading button");
  await ui.wait("document.querySelector('.source-empty')?.textContent === 'No unread inbox mail.'");
  held.add("/api/mailboxes");
  await ui.click(".source-heading button");
  await waitFor(() => test.pending("/api/mailboxes"), "empty mail refresh paused");
  assert.equal(await ui.evaluate("document.querySelector('.source-empty')?.textContent"), "No unread inbox mail.");
  await release("/api/mailboxes");

  await browser.send("Page.navigate", { url: `${appUrl}/preferences` });
  await ui.wait("document.querySelector('.calendar-import-status')?.textContent.includes('Last synchronized')");
  const preferencesBefore = await layoutSnapshot(browser, [".preferences-card", ".account-links", ".backup-restore"]);
  const timestamp = await ui.evaluate("document.querySelector('.calendar-import-status').textContent");
  held.add("/api/calendars/import");
  await ui.click(".calendar-import-toggle input");
  await waitFor(() => test.pending("/api/calendars/import"), "calendar import change paused");
  assert.equal(await ui.evaluate("document.querySelector('.calendar-import-status').textContent"), timestamp);
  assert.deepEqual(await layoutSnapshot(browser, [".preferences-card", ".account-links", ".backup-restore"]), preferencesBefore);
  await release("/api/calendars/import");
  await ui.wait("!document.querySelector('#calendar-import-heading .is-active')");
  assert.deepEqual(await layoutSnapshot(browser, [".preferences-card", ".account-links", ".backup-restore"]), preferencesBefore);

  failures.add("/api/mailboxes");
  await browser.send("Page.navigate", { url: `${appUrl}/inbox` });
  await ui.wait("Boolean(document.querySelector('.mailbox-message'))");
  assert.equal(await ui.evaluate("Boolean(document.querySelector('.source-heading .is-active'))"), false);
  assert.equal(await ui.evaluate("Boolean(document.querySelector('.source-empty'))"), false);
  assert.equal(await ui.evaluate("document.querySelector('.mailbox-add-button').disabled"), false);
  failures.clear();
  await ui.click(".source-heading button");
  await ui.wait("document.querySelector('.source-empty')?.textContent === 'No unread inbox mail.'");
  assert.deepEqual(errors, []);
  console.log("PASS: overlapping calendar loading/import, retained rows, reduced motion, calendar/mail scroll, focus, empty results, failed refresh and retry, import timestamp and settings layout");
} catch (error) {
  console.error(await ui.evaluate("document.body.innerText"), errors);
  throw error;
} finally { await browser.close(); }
