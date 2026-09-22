"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import SyncConflictDialog from "@/app/_components/sync/sync-conflict-dialog";
import { listenForSyncRefresh } from "@/app/_components/sync/sync-refresh";
import { GraphSyncController } from "@/services/graph/sync/controller/graph-sync-controller";
import { todayIso } from "@/utils/shared/temporal/date";
import type { Graph } from "@/types/graph/graph";
import type { GraphSyncView } from "@/types/graph/graph-sync-controller";

const INITIAL_VIEW: GraphSyncView = {
  graph: null,
  error: null,
  conflicts: [],
};

function useGraphState() {
  const { data: session, status } = useSession();
  const [today] = useState(todayIso);
  const [view, setView] = useState<GraphSyncView>(INITIAL_VIEW);
  const [hydrated, setHydrated] = useState(false);
  const controller = useRef<GraphSyncController | null>(null);
  const scope = status === "authenticated" ? `user:${session?.user.id}` : "guest";

  useEffect(() => {
    if (status === "loading") return;
    const sync = new GraphSyncController(scope, setView);
    controller.current = sync;
    void Promise.resolve().then(() => {
      setView(INITIAL_VIEW);
      setHydrated(true);
      return sync.open(today);
    });
    const stopRefreshListeners = listenForSyncRefresh(sync);
    return () => {
      sync.active = false;
      stopRefreshListeners();
    };
  }, [scope, status, today]);

  useEffect(() => {
    if (!controller.current?.hasPending) return;
    const timer = window.setTimeout(
      () => void controller.current?.flush().catch(() => undefined),
      500,
    );
    return () => window.clearTimeout(timer);
  }, [view.graph]);

  function setGraph(
    next: Graph | null | ((current: Graph | null) => Graph | null),
  ) {
    controller.current?.change(next);
  }

  async function saveGraphNow(next: Graph) {
    controller.current?.change(next);
    await controller.current?.flush();
  }

  function retry() {
    const sync = controller.current;
    if (!sync) return;
    const request = view.graph ? sync.flush() : sync.open(today);
    void request.catch(() => undefined);
  }

  async function restoreGraph(graph: Graph) {
    if (!controller.current) throw new Error("Workspace is loading");
    await controller.current.restore(graph);
  }

  return {
    graph: view.graph,
    setGraph,
    today,
    hydrated,
    syncError: view.error,
    retry,
    saveGraphNow,
    restoreGraph,
    adoptImportedGraph: async () => {
      await controller.current?.flush();
    },
    conflicts: view.conflicts,
    resolveConflict: async (keepMine: boolean) => {
      await controller.current?.resolve(keepMine);
    },
  };
}

const GraphContext = createContext<ReturnType<typeof useGraphState> | null>(null);

export function GraphProvider({ children }: { children: ReactNode }) {
  const value = useGraphState();
  return (
    <GraphContext.Provider value={value}>
      {children}
      <SyncConflictDialog
        conflicts={value.conflicts}
        onResolve={value.resolveConflict}
      />
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const value = useContext(GraphContext);
  if (!value) throw new Error("useGraph must be used inside GraphProvider");
  return value;
}
