import { unzipSync, zipSync } from "fflate";

import { isGraph } from "./graph-service.ts";
import { isUserPreferences } from "./preferences-service.ts";
import type { Graph } from "@/types/graph";
import type { UserPreferences } from "@/types/preferences";

const FILE_NAMES = ["nodes.json", "edges.json", "settings.json"] as const;
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeJson(value: unknown) {
  return encoder.encode(JSON.stringify(value));
}

function invalidBackup(message: string): never {
  throw new Error(`Invalid backup: ${message}`);
}

export function createBackupArchive(
  graph: Graph,
  preferences: UserPreferences,
) {
  return zipSync({
    "nodes.json": encodeJson(graph.nodes),
    "edges.json": encodeJson(graph.relationships),
    "settings.json": encodeJson(preferences),
  });
}

export function readBackupArchive(archive: Uint8Array) {
  if (!archive.length || archive.byteLength > MAX_BACKUP_BYTES) {
    invalidBackup("file is empty or too large");
  }

  const seen = new Set<string>();
  let uncompressedBytes = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(archive, {
      filter: ({ name, originalSize }) => {
        if (!FILE_NAMES.includes(name as (typeof FILE_NAMES)[number])) return false;
        if (seen.has(name)) invalidBackup(`duplicate ${name}`);
        seen.add(name);
        uncompressedBytes += originalSize;
        if (uncompressedBytes > MAX_BACKUP_BYTES) invalidBackup("content is too large");
        return true;
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid backup:")) {
      throw error;
    }
    invalidBackup("could not read ZIP file");
  }

  if (FILE_NAMES.some((name) => !files[name])) {
    invalidBackup(`expected ${FILE_NAMES.join(", ")}`);
  }

  let nodes: unknown;
  let relationships: unknown;
  let preferences: unknown;
  try {
    nodes = JSON.parse(decoder.decode(files["nodes.json"]));
    relationships = JSON.parse(decoder.decode(files["edges.json"]));
    preferences = JSON.parse(decoder.decode(files["settings.json"]));
  } catch {
    invalidBackup("JSON content could not be read");
  }

  const graph: unknown = { version: 1, nodes, relationships };
  if (!isGraph(graph)) invalidBackup("nodes or edges are invalid");
  if (!isUserPreferences(preferences)) invalidBackup("settings are invalid");
  return { graph, preferences };
}
