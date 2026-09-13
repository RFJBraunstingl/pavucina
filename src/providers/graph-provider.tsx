"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

import { loadGuestGraph, saveGuestGraph } from "@/services/local-graph-store";
import { replaceImportedEventSubgraph } from "@/services/event-service";
import { migrateTaskCompletion } from "@/services/task-completion-service";
import {
  loadRemoteGraph,
  restoreRemoteGraph,
  saveRemoteGraph,
} from "@/services/remote-graph-store";
import { todayIso } from "@/utils/date";
import type { Graph } from "@/types/graph";

const subscribe = () => () => {};

function useGraphState() {
  const { data: session, status } = useSession();
  const [today] = useState(todayIso);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const loadedScope = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const saveGeneration = useRef(0);
  const userId = session?.user.id;
  const scope = status === "authenticated" ? `user:${userId}` : "guest";

  useEffect(() => {
    if (!hydrated || status === "loading") return;

    let cancelled = false;
    loadedScope.current = null;
    lastSaved.current = null;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setGraph(null);
      setSyncError(null);

      if (status === "unauthenticated") {
        const loaded = loadGuestGraph(today);
        const next = loaded ? migrateTaskCompletion(loaded, today) : loaded;
        loadedScope.current = "guest";
        lastSaved.current = loaded ? JSON.stringify(loaded) : null;
        setGraph(next);
        return;
      }

      try {
        let loaded = await loadRemoteGraph();
        if (!loaded) {
          if (cancelled) return;
          loaded = migrateTaskCompletion(loadGuestGraph(today)!, today);
          if (!(await saveRemoteGraph(loaded, true))) {
            loaded = await loadRemoteGraph();
            if (!loaded) throw new Error("Could not load your saved graph");
          }
        }
        if (cancelled) return;
        const next = migrateTaskCompletion(loaded, today);
        loadedScope.current = scope;
        lastSaved.current = JSON.stringify(loaded);
        setGraph(next);
      } catch (error) {
        if (!cancelled) {
          // A failed load still belongs to this account and can be restored.
          loadedScope.current = scope;
          setSyncError(
            error instanceof Error ? error.message : "Could not load your graph",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, status, userId, scope, today, loadAttempt]);

  useEffect(() => {
    if (!hydrated || !graph || loadedScope.current !== scope) return;
    const serialized = JSON.stringify(graph);
    if (serialized === lastSaved.current) return;

    if (status === "unauthenticated") {
      saveGuestGraph(graph);
      lastSaved.current = serialized;
      return;
    }
    if (status !== "authenticated") return;

    const generation = saveGeneration.current;
    const timeout = window.setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          if (
            loadedScope.current !== scope ||
            saveGeneration.current !== generation
          ) return;
          try {
            await saveRemoteGraph(graph);
            if (
              loadedScope.current !== scope ||
              saveGeneration.current !== generation
            ) return;
            lastSaved.current = serialized;
            setSyncError(null);
          } catch (error: unknown) {
            if (loadedScope.current !== scope) return;
            setSyncError(
              error instanceof Error ? error.message : "Could not save your graph",
            );
          }
        });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [graph, hydrated, scope, status, saveAttempt]);

  function retry() {
    if (graph && loadedScope.current === scope) {
      setSaveAttempt((attempt) => attempt + 1);
    } else {
      setLoadAttempt((attempt) => attempt + 1);
    }
  }

  async function persistGraph(next: Graph, restoring: boolean) {
    const action = restoring ? "restore" : "save";
    const serialized = JSON.stringify(next);
    const restoreScope = scope;
    const generation = ++saveGeneration.current;
    if (
      !restoring &&
      loadedScope.current === restoreScope &&
      lastSaved.current === serialized
    ) return;
    try {
      if (status === "unauthenticated") {
        if (!saveGuestGraph(next)) {
          throw new Error(`Could not ${action} your graph`);
        }
      } else if (status === "authenticated") {
        const operation = saveQueue.current
          .catch(() => undefined)
          .then(async () => {
            if (loadedScope.current !== restoreScope) {
              throw new Error(`Your account changed during ${action}`);
            }
            if (restoring) await restoreRemoteGraph(next);
            else await saveRemoteGraph(next);
          });
        saveQueue.current = operation.catch(() => undefined);
        await operation;
      } else {
        throw new Error("Your data is still loading");
      }
      if (loadedScope.current !== restoreScope) {
        throw new Error(`Your account changed during ${action}`);
      }
      lastSaved.current = serialized;
      setGraph((current) =>
        restoring || !current || JSON.stringify(current) === serialized
          ? next
          : current);
      setSyncError(null);
    } catch (error) {
      if (saveGeneration.current === generation) {
        setSaveAttempt((attempt) => attempt + 1);
      }
      const message = error instanceof Error
        ? error.message
        : `Could not ${action} your graph`;
      setSyncError(message);
      throw new Error(message);
    }
  }

  const saveGraphNow = (next: Graph) => persistGraph(next, false);
  const restoreGraph = (next: Graph) => persistGraph(next, true);

  function adoptImportedGraph(remote: Graph, base: Graph) {
    const serializedBase = JSON.stringify(base);
    setGraph((current) => {
      if (!current) return remote;
      if (JSON.stringify(current) === serializedBase) {
        lastSaved.current = JSON.stringify(remote);
        return remote;
      }
      return replaceImportedEventSubgraph(current, remote);
    });
  }

  return {
    graph, setGraph, saveGraphNow, restoreGraph, adoptImportedGraph,
    today, hydrated, syncError, retry,
  };
}

const GraphContext = createContext<ReturnType<typeof useGraphState> | null>(null);

export function GraphProvider({ children }: { children: ReactNode }) {
  return (
    <GraphContext.Provider value={useGraphState()}>{children}</GraphContext.Provider>
  );
}

export function useGraph() {
  const value = useContext(GraphContext);
  if (!value) throw new Error("useGraph must be used inside GraphProvider");
  return value;
}
