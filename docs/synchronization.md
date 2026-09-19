# Synchronization

Graph edits use guarded field changes, item creation/deletion, and explicit moves.
`PATCH /api/graph` accepts a mutation UUID, base generation/revision, and operations.
Retries reuse the UUID. Independent fields merge; conflicting fields require a
choice between **Keep mine** and **Use saved** without dropping unrelated edits.
`GET /api/graph/changes` returns paginated changed records and deletion markers.
Preferences and calendar selections use their own field/item patches.

MongoDB stores changed entity revisions in `graph_records`, then publishes one
small `graph_commits` document. Unpublished records are invisible; a unique sequence
index arbitrates concurrent writers. This works on standalone MongoDB without
transactions. A rebuildable `graph_current` projection keeps normal reads proportional
to the current graph instead of its history. Native history remains; obsolete imported
payloads are removed. Abandoned unpublished records older than 24 hours are cleaned by
scheduled maintenance.

Valid legacy MongoDB graphs migrate on first load. Original native revisions remain.
Guest data migrates from localStorage to per-record IndexedDB without deleting the
original. Pending graph and preference edits are stored by account and browser tab,
survive reload, and retry on reconnect/focus. Keep the tab open until saving finishes;
clearing browser data removes unsent edits. Invalid graphs can be recovered through
Preferences → Import backup.

Full snapshots remain for initial load, workspace creation, and explicit restore.
Restore starts a new generation, so stale edits cannot silently overwrite it.
Older clients attempting whole-graph autosave receive HTTP 426 and must reload.

## Limits

The former 10 MiB total graph limit is removed. The defaults are now 10 MiB per
mutation and 100 MiB per creation/restore snapshot, with 1 MiB additional backup
envelope allowance. Set `NEXT_PUBLIC_MAX_MUTATION_MIB` and
`NEXT_PUBLIC_MAX_SNAPSHOT_MIB` before building to change these limits (whole MiB,
1–1024), rebuild, and ensure any reverse proxy accepts the corresponding body size.
An individual MongoDB record must still fit within 16 MiB. The application still
holds the graph in memory and validates it as a whole; incremental writes do not
remove browser memory or CPU constraints.

## Maintenance

Set `MAINTENANCE_SECRET`, then call the protected endpoint daily. Next.js does not
provide a durable scheduler for a standalone server, so use the host or platform
scheduler. For a cron daemon configured for Europe/Vienna:

```cron
CRON_TZ=Europe/Vienna
0 2 * * * curl --fail --silent --show-error -X POST -H "Authorization: Bearer <maintenance-secret>" https://pavucina.example/api/maintenance/graph
```

The endpoint deletes abandoned unpublished revisions and obsolete projection
generations in bounded batches. Call it again when the response reports
`"hasMore": true`.

## Checks

Run `npm test`, `npm run lint`, and `npm run build`. With local standalone MongoDB:

```sh
node --conditions=react-server --experimental-strip-types --import ./scripts/register-typescript.mjs scripts/incremental-mongo-smoke.mjs
```

The Mongo check uses a dedicated test database and removes its random user's data.
With the app and an isolated Chrome instance using `--remote-debugging-port=9225`:

```sh
node --experimental-strip-types scripts/incremental-browser-smoke.mjs http://127.0.0.1:3004 http://127.0.0.1:9225
```

Browser checks mock API requests in a disposable context and exercise actual
IndexedDB, offline reload, duplicate retry, conflicts, mobile input, and recovery.
