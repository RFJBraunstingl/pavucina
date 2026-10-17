import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { waitFor } from "./chrome-smoke-client.mjs";
import { deleteTask } from "../src/services/task/core/task-service.ts";

export async function checkDescriptions(browser, fixture, ui, ids, appUrl) {
  const description = (id) => [...fixture.graph.nodes, ...fixture.graph.inboxNodes ?? []]
    .find((node) => node.id === id)?.properties.description;
  await ui.evaluate("[...document.querySelectorAll('.calendar-event-body')].find(button => button.textContent.includes('Scheduled task')).click()");
  await ui.wait("Boolean(document.querySelector('.inspector textarea'))");
  await ui.evaluate("document.querySelector('.inspector textarea').focus()");
  const writes = fixture.writes.length;
  await browser.send("Input.insertText", { text: "First " });
  await delay(250);
  await browser.send("Input.insertText", { text: "and second" });
  await delay(250);
  assert.equal(fixture.writes.length, writes);
  assert.equal(description(ids.task), undefined);
  await waitFor(() => description(ids.task) === "First and second", "debounced description saved");
  assert.equal(fixture.writes.length, writes + 1);

  await browser.send("Input.insertText", { text: " before switching" });
  await ui.evaluate("[...document.querySelectorAll('.calendar-event-body')].find(button => button.textContent.includes('Other task')).click()");
  await waitFor(() => description(ids.task)?.endsWith("before switching"), "task switch flushes description");
  assert.equal(description(ids.other), undefined);
  assert.equal(await ui.evaluate("document.querySelector('.inspector textarea').value"), "");

  await ui.click('a[href="/inbox"]');
  await ui.wait("Boolean(document.querySelector('.scratchpad-list textarea'))");
  await ui.evaluate("document.querySelector('.scratchpad-list textarea').focus()");
  await browser.send("Input.insertText", { text: "Scratchpad notes" });
  await ui.click('a[href="/calendar"]');
  await waitFor(() => description(ids.inbox) === "Scratchpad notes", "navigation flushes scratchpad description");
  await ui.wait("Boolean(document.querySelector('.calendar-days'))");
  assert.equal(await ui.evaluate("location.pathname"), "/calendar");
  assert.equal(new URL(appUrl).origin, await ui.evaluate("location.origin"));
}

export async function checkDescriptionAccountChange(browser, fixture, ui, taskId) {
  const description = () => fixture.graph.nodes.find((node) => node.id === taskId)?.properties.description;
  const before = description();
  const writes = fixture.writes.length;
  await ui.evaluate("document.querySelector('.inspector textarea').focus()");
  await browser.send("Input.insertText", { text: " private pending edit" });
  fixture.userId = crypto.randomUUID();
  await ui.evaluate("document.dispatchEvent(new Event('visibilitychange'))");
  await delay(1500);
  assert.equal(description(), before, "pending descriptions must not cross account boundaries");
  assert.equal(fixture.writes.length, writes);
}

export async function checkDescriptionDeletion(browser, fixture, ui, taskId) {
  const writes = fixture.writes.length;
  await ui.evaluate("document.querySelector('.inspector textarea').focus()");
  await browser.send("Input.insertText", { text: " discarded draft" });
  fixture.edit(deleteTask(fixture.graph, taskId));
  await ui.evaluate("window.dispatchEvent(new Event('focus'))");
  await ui.wait("!document.querySelector('.inspector textarea')");
  await delay(1000);
  assert.equal(fixture.graph.nodes.some((node) => node.id === taskId), false);
  assert.equal(fixture.writes.length, writes, "deleted tasks must not receive pending descriptions");
}
