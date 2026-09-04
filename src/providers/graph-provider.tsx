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
import {
  loadRemoteGraph,
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
        const next = loadGuestGraph(today);
        loadedScope.current = "guest";
        lastSaved.current = next ? JSON.stringify(next) : null;
        setGraph(next);
        return;
      }

      try {
        let next = await loadRemoteGraph();
        if (!next) {
          if (cancelled) return;
          next = loadGuestGraph(today)!;
          if (!(await saveRemoteGraph(next, true))) {
            next = await loadRemoteGraph();
            if (!next) throw new Error("Could not load your saved graph");
          }
        }
        if (cancelled) return;
        loadedScope.current = scope;
        lastSaved.current = JSON.stringify(next);
        setGraph(next);
      } catch (error) {
        if (!cancelled) {
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

    const timeout = window.setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          if (loadedScope.current !== scope) return;
          try {
            await saveRemoteGraph(graph);
            if (loadedScope.current !== scope) return;
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

  return { graph, setGraph, today, hydrated, syncError, retry };
}

const GraphContext = createContext<ReturnType<typeof useGraphState> | null>(null);

export function GraphProvider({ children }: { children: ReactNode }) {
  return (
    <GraphContext.Provider value={useGraphState()}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const value = useContext(GraphContext);
  if (!value) throw new Error("useGraph must be used inside GraphProvider");
  return value;
}
