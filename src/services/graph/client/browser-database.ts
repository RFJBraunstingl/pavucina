import type { GraphPatch, GraphSnapshot } from "@/types/graph/graph-sync.ts";
import { equalValue } from "@/utils/shared/field-changes.ts";
import { recordKey } from "../sync/graph-record-service.ts";

let opening: Promise<IDBDatabase> | undefined;
export function browserDatabase() {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pavucina.workspace", 1);
    request.onupgradeneeded = () => {
      const records = request.result.createObjectStore("records", { keyPath: "key" });
      records.createIndex("scope", "scope");
      request.result.createObjectStore("meta");
    };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); opening = undefined; }; resolve(request.result); };
    request.onerror = () => { opening = undefined; reject(request.error); };
    request.onblocked = () => reject(new Error("Close other Pavucina tabs to upgrade browser storage."));
  });
  return opening;
}
export function idbRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
export function idbCompletion(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error("Browser storage failed"));
  });
}
export async function readBrowserGraph(scope: string) {
  const transaction = (await browserDatabase()).transaction(["records", "meta"], "readonly");
  const meta = await idbRequest(transaction.objectStore("meta").get(scope));
  if (!meta) return null;
  const rows = await idbRequest(transaction.objectStore("records").index("scope").getAll(scope));
  return { snapshot: { revision: meta.revision, records: rows.map((row) => row.record) } as GraphSnapshot,
    patches: (meta.patches ?? []) as GraphPatch[] };
}
export async function writeBrowserGraph(scope: string, snapshot: GraphSnapshot, patches: GraphPatch[]) {
  const transaction = (await browserDatabase()).transaction(["records", "meta"], "readwrite");
  const completed = idbCompletion(transaction);
  const store = transaction.objectStore("records");
  const previous = new Map((await idbRequest(store.index("scope").getAll(scope))).map((row) => [row.key, row.record]));
  for (const record of snapshot.records) {
    const key = `${scope}:${recordKey(record)}`;
    if (!equalValue(previous.get(key), record)) store.put({ key, scope, record });
    previous.delete(key);
  }
  for (const key of previous.keys()) store.delete(key);
  transaction.objectStore("meta").put({ revision: snapshot.revision, patches }, scope);
  await completed;
}

export async function readBrowserValue<T>(key: string): Promise<T | undefined> {
  return idbRequest((await browserDatabase()).transaction("meta", "readonly").objectStore("meta").get(key));
}
export async function writeBrowserValue(key: string, value: unknown) {
  const transaction = (await browserDatabase()).transaction("meta", "readwrite");
  const completed = idbCompletion(transaction);
  transaction.objectStore("meta").put(value, key);
  await completed;
}
