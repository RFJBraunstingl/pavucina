"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { GraphSyncController } from "@/services/graph-sync-controller";
import { todayIso } from "@/utils/date";
import SyncConflictDialog from "@/app/_components/sync-conflict-dialog";
import type { Graph } from "@/types/graph";
import type { GraphSyncView } from "@/types/graph-sync-controller";

function useGraphState() {
  const { data: session, status } = useSession();
  const [today] = useState(todayIso);
  const [state, setState] = useState<GraphSyncView>({ graph: null, error: null, conflicts: [] });
  const [hydrated, setHydrated] = useState(false);
  const controller = useRef<GraphSyncController | null>(null);
  const scope = status === "authenticated" ? `user:${session?.user.id}` : "guest";
  useEffect(() => {
    if (status === "loading") return;
    const sync = new GraphSyncController(scope, setState);
    controller.current = sync;
    void Promise.resolve().then(() => { setState({ graph: null, error: null, conflicts: [] }); setHydrated(true); return sync.open(today); });
    const refresh = () => { if (document.visibilityState === "visible") void sync.flush().catch(() => undefined); };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { sync.active = false; window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [scope, status, today]);
  useEffect(() => {
    if (!controller.current?.hasPending) return;
    const timer = window.setTimeout(() => void controller.current?.flush().catch(() => undefined), 500);
    return () => window.clearTimeout(timer);
  }, [state.graph]);
  const setGraph = (next: Graph | null | ((current: Graph | null) => Graph | null)) => controller.current?.change(next);
  const saveGraphNow = async (next: Graph) => { controller.current?.change(next); await controller.current?.flush(); };
  return {
    graph: state.graph, setGraph, today, hydrated, syncError: state.error,
    retry: () => void (state.graph ? controller.current?.flush() : controller.current?.open(today))?.catch(() => undefined),
    saveGraphNow,
    restoreGraph: async (graph: Graph) => { if (!controller.current) throw new Error("Workspace is loading"); await controller.current.restore(graph); },
    adoptImportedGraph: async () => { await controller.current?.flush(); },
    conflicts: state.conflicts,
    resolveConflict: async (keepMine: boolean) => { await controller.current?.resolve(keepMine); },
  };
}
const GraphContext = createContext<ReturnType<typeof useGraphState> | null>(null);
export function GraphProvider({ children }: { children: ReactNode }) {
  const value = useGraphState();
  return <GraphContext.Provider value={value}>{children}
    <SyncConflictDialog conflicts={value.conflicts} onResolve={value.resolveConflict} />
  </GraphContext.Provider>;
}
export function useGraph() {
  const value = useContext(GraphContext);
  if (!value) throw new Error("useGraph must be used inside GraphProvider");
  return value;
}
