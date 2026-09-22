import { changedGraphRecords, mergeRecords } from "../src/services/graph/sync/graph-record-service.ts";
import { applyGraphOperations, GraphConflictError } from "../src/services/graph/sync/graph-patch-service.ts";
import { applyPreferencesPatch } from "../src/services/preferences/settings-patch-service.ts";
import { DEFAULT_USER_PREFERENCES } from "../src/services/preferences/preferences-service.ts";
import { changedFields } from "../src/utils/shared/field-changes.ts";

export function incrementalFixture(graph) {
  const fixture = { userId: crypto.randomUUID(), graph, invalid: false, failWrites: false, loseAcknowledgement: false,
    writes: [], connections: [], preferences: { ...DEFAULT_USER_PREFERENCES }, preferenceRevision: 0,
    snapshot: { revision: { generation: crypto.randomUUID(), sequence: 1 }, records: changedGraphRecords([], graph) } };
  const mutations = new Set(), fieldRevisions = {};
  fixture.edit = (next, replacement = false) => {
    const revision = { generation: replacement ? crypto.randomUUID() : fixture.snapshot.revision.generation, sequence: fixture.snapshot.revision.sequence + 1 };
    const changes = changedGraphRecords(replacement ? [] : fixture.snapshot.records, next).map((record) => ({ ...record, sequence: revision.sequence }));
    fixture.snapshot = { revision, records: mergeRecords(replacement ? [] : fixture.snapshot.records, changes) };
    fixture.graph = next;
    fixture.changes = [...fixture.changes ?? [], ...changes];
  };
  fixture.respond = async (browser, { requestId, request }) => {
    const url = new URL(request.url), path = url.pathname;
    let value = {}, status = 200;
    try {
      if (path === "/api/auth/session") value = fixture.userId ? { user: { id: fixture.userId }, expires: "2099-01-01T00:00:00Z" } : null;
      if (path === "/api/account-links") value = { accounts: [], request: null };
      if (path === "/api/calendars") value = { available: {}, connections: fixture.userId ? fixture.connections : [], events: [] };
      if (path === "/api/preferences") {
        if (request.method !== "GET") {
          const before = fixture.preferences;
          fixture.preferences = request.method === "PATCH" ? applyPreferencesPatch(before, JSON.parse(request.postData)) : JSON.parse(request.postData);
          fixture.preferenceRevision++;
          for (const key of Object.keys(changedFields(before, fixture.preferences))) fieldRevisions[key] = fixture.preferenceRevision;
        }
        const after = Number(url.searchParams.get("after") ?? -1);
        value = url.searchParams.has("after") ? { revision: fixture.preferenceRevision, fields: Object.fromEntries(Object.entries(fixture.preferences)
          .filter(([key]) => after < 0 || (fieldRevisions[key] ?? 0) > after).map(([key, after]) => [key, { after }])) } : fixture.preferences;
      }
      if (path === "/api/graph") {
        if (request.method !== "GET") {
          const body = JSON.parse(request.postData);
          fixture.writes.push({ method: request.method, body });
          if (fixture.failWrites) throw new Error("Simulated offline save");
          if (request.method === "PATCH") {
            if (!mutations.has(body.mutationId)) {
              fixture.edit(applyGraphOperations(fixture.graph, body.operations)); mutations.add(body.mutationId);
            }
          } else { fixture.edit(body, true); fixture.invalid = false; }
          if (fixture.loseAcknowledgement) { fixture.loseAcknowledgement = false; throw new Error("Simulated lost acknowledgement"); }
          value = { revision: fixture.snapshot.revision };
        } else value = fixture.invalid ? { invalid: true } : fixture.snapshot;
      }
      if (path === "/api/graph/changes") {
        if (url.searchParams.get("generation") !== fixture.snapshot.revision.generation) { status = 409; value = { reset: true }; }
        else {
          const changes = new Map((fixture.changes ?? []).filter((record) => record.sequence > Number(url.searchParams.get("after"))).map((record) => [`${record.collection}:${record.id}`, record]));
          value = { revision: fixture.snapshot.revision, records: [...changes.values()], nextOffset: null };
        }
      }
    } catch (error) { status = error instanceof GraphConflictError ? 409 : 500; value = { error: error.message, ...(error instanceof GraphConflictError && { conflicts: error.conflicts }) }; }
    await browser.send("Fetch.fulfillRequest", { requestId, responseCode: status,
      responseHeaders: [{ name: "content-type", value: "application/json" }], body: Buffer.from(JSON.stringify(value)).toString("base64") });
  };
  return fixture;
}
