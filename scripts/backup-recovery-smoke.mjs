// Run against a running app and Chrome with --remote-debugging-port=9223:
// node --experimental-strip-types scripts/backup-recovery-smoke.mjs [app URL] [Chrome URL]
// Every API request is mocked inside a new, disposable browser context.
import assert from "node:assert/strict";
import { incrementalFixture } from "./incremental-browser-fixture.mjs";
import { createSeedGraph } from "../src/data/seed-graph.ts";
import { createBackupArchive } from "../src/services/backup-service.ts";
import { DEFAULT_USER_PREFERENCES } from "../src/services/preferences-service.ts";
import { todayIso } from "../src/utils/date.ts";
import { connectChrome, waitFor } from "./chrome-smoke-client.mjs";

const appUrl = process.argv[2] ?? "http://127.0.0.1:3000";
const debugUrl = process.argv[3] ?? "http://127.0.0.1:9223";
const restoredGraph = createSeedGraph(todayIso());
const archive = Buffer.from(createBackupArchive(restoredGraph, DEFAULT_USER_PREFERENCES)).toString("base64");
let userId = crypto.randomUUID();
let graph = { invalid: true };
const fixture = incrementalFixture(restoredGraph);
let graphStatus = 200;
let restoreStatus = 201;
let preferencesStatus = 200;
let holdRestore = false;
let releaseRestore;
let completedRestores = 0;
const writes = [];
const mockErrors = [];
const requests = [];

const browser = await connectChrome(debugUrl, (event) => {
  if (event.method === "Runtime.exceptionThrown") mockErrors.push(event.params);
  if (event.method !== "Fetch.requestPaused") return;
  void respond(event.params).catch((error) => mockErrors.push(error));
});

async function respond({ requestId, request }) {
  const path = new URL(request.url).pathname;
  requests.push(`${request.method} ${path}`);
  const requestUserId = userId;
  fixture.userId = userId;
  if (path === "/api/calendars") return fixture.respond(browser, { requestId, request });
  if (path === "/api/graph/changes" || (path === "/api/graph" && request.method === "PATCH")) {
    if (request.method === "PATCH") writes.push({ method: "PATCH", userId });
    await fixture.respond(browser, { requestId, request });
    graph = fixture.graph;
    return;
  }
  let status = 200;
  let value = {};
  if (path === "/api/auth/session") {
    value = userId ? { user: { id: userId }, expires: "2099-01-01T00:00:00.000Z" } : null;
  } else if (path === "/api/preferences") {
    value = new URL(request.url).searchParams.has("after")
      ? { revision: 0, fields: Object.fromEntries(Object.entries(DEFAULT_USER_PREFERENCES).map(([key, after]) => [key, { after }])) }
      : DEFAULT_USER_PREFERENCES;
    if (request.method === "PUT") status = preferencesStatus;
  } else if (path === "/api/account-links") {
    value = { accounts: [], request: null };
  } else if (path === "/api/graph") {
    if (request.method === "GET") {
      value = graph.invalid ? graph : fixture.snapshot;
      status = graphStatus;
    } else {
      writes.push({ method: request.method, graph: JSON.parse(request.postData), userId: requestUserId });
      if (request.method === "POST" && holdRestore) {
        await new Promise((resolve) => { releaseRestore = resolve; });
      }
      status = request.method === "POST" ? restoreStatus : 201;
      if (status === 201 && userId === requestUserId) { graph = JSON.parse(request.postData); graphStatus = 200; fixture.edit(graph, true); }
    }
  }
  if (status >= 400) value = { error: "Could not restore your graph" };
  await browser.send("Fetch.fulfillRequest", {
    requestId, responseCode: status,
    responseHeaders: [{ name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(value)).toString("base64"),
  });
  if (path === "/api/graph" && request.method === "POST") completedRestores++;
}

const evaluate = (expression) => browser.evaluate(expression);
const wait = (expression) => waitFor(() => evaluate(expression), expression);
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
async function upload(base64 = archive) {
  await evaluate(`(() => {
    const input = document.querySelector('input[type="file"]');
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from(atob(${JSON.stringify(base64)}), c => c.charCodeAt(0))], 'backup.zip'));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
}
async function confirm() {
  await upload();
  await wait("Boolean(document.querySelector('.backup-restore dialog[open]'))");
  await click(".backup-restore .dialog-danger");
}
async function openRecovery(status = 200) {
  userId = crypto.randomUUID();
  graph = { invalid: true };
  graphStatus = status;
  await browser.send("Page.navigate", { url: `${appUrl}/preferences` });
  await wait("Boolean(document.querySelector('.sync-error')) && Boolean(document.querySelector('.backup-actions'))");
}

try {
  await browser.send("Runtime.enable");
  await browser.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await browser.send("Page.navigate", { url: `${appUrl}/todo` });
  await wait("document.body.innerText.includes('The saved graph is invalid')");
  await click('a[href="/preferences"]');
  await wait("Boolean(document.querySelector('.backup-actions'))");
  assert.equal(await evaluate("document.querySelector('.backup-actions button').disabled"), true);
  assert.equal(await evaluate("document.querySelector('.schedule-mode-options').disabled"), true);
  assert.equal(await evaluate("document.querySelector('.calendar-import-toggle input').disabled"), true);
  assert.equal(await evaluate("document.querySelector('.startup-page-options select').disabled"), false);
  assert.equal(await evaluate("document.body.innerText.includes('Load or restore your graph')"), true);
  assert.equal(writes.length, 0);

  await upload(Buffer.from("invalid zip").toString("base64"));
  await wait("document.querySelector('.backup-message')?.textContent.includes('Invalid backup')");
  await upload();
  await wait("Boolean(document.querySelector('.backup-restore dialog[open]'))");
  await click(".backup-restore dialog button");
  await wait("!document.querySelector('.backup-restore dialog[open]')");
  assert.equal(writes.length, 0);

  await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  restoreStatus = 500;
  await confirm();
  await wait("document.querySelector('.backup-message')?.textContent.includes('Could not restore your graph')");
  assert.equal(await evaluate("document.querySelector('.backup-actions button').disabled"), true);
  restoreStatus = 201;
  await confirm();
  await wait("document.querySelector('.backup-message')?.textContent === 'Backup restored.'");
  assert.deepEqual(graph, restoredGraph);
  assert.equal(await evaluate("Boolean(document.querySelector('.sync-error'))"), false);
  assert.equal(await evaluate("document.querySelector('.schedule-mode-options').disabled"), false);
  await click('a[href="/todo"]');
  await wait("Boolean(document.querySelector('.completion-button'))");
  await click(".completion-button");
  await waitFor(() => writes.some(({ method }) => method === "PATCH"), "edits persist after restore");

  await openRecovery(500);
  preferencesStatus = 500;
  await confirm();
  await wait("document.querySelector('.backup-message')?.textContent.includes('Graph restored, but settings')");
  preferencesStatus = 200;

  await openRecovery();
  holdRestore = true;
  await confirm();
  await waitFor(() => Boolean(releaseRestore), "restore request pending");
  const previousUser = userId;
  const graphLoads = requests.filter((request) => request === "GET /api/graph").length;
  userId = crypto.randomUUID();
  await evaluate("document.dispatchEvent(new Event('visibilitychange'))");
  await waitFor(() => requests.filter((request) => request === "GET /api/graph").length > graphLoads, "new account graph load");
  await wait("document.querySelector('.sync-error')?.textContent.includes('The saved graph is invalid')");
  const completedBeforeRelease = completedRestores;
  releaseRestore();
  await waitFor(() => completedRestores > completedBeforeRelease, "old account restore completes");
  await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  await wait("document.querySelector('.sync-error')?.textContent.includes('The saved graph is invalid')");
  assert.equal(writes.at(-1).userId, previousUser);
  assert.equal(await evaluate("document.querySelector('.backup-actions button').disabled"), true);
  holdRestore = false;
  await confirm();
  await wait("document.querySelector('.backup-message')?.textContent === 'Backup restored.'");

  await browser.send("Page.navigate", { url: `${appUrl}/preferences` });
  await wait("Boolean(document.querySelector('.backup-actions'))");
  assert.equal(await evaluate("document.querySelector('.backup-actions button').disabled"), false);
  userId = null;
  await browser.send("Page.navigate", { url: `${appUrl}/preferences` });
  await wait("Boolean(document.querySelector('.backup-actions'))");
  await confirm();
  await wait("document.querySelector('.backup-message')?.textContent === 'Backup restored.'");
  await browser.send("Page.navigate", { url: `${appUrl}/todo` });
  await wait("Boolean(document.querySelector('.completion-button'))");
  assert.deepEqual(mockErrors, []);
  console.log("PASS: recovery navigation, disabled controls, ZIP validation, cancellation, failed requests, restore, autosave, account switch, guest restore");
} catch (error) {
  console.error(await evaluate("document.body.innerText"), mockErrors, requests);
  throw error;
} finally {
  await browser.close();
}
