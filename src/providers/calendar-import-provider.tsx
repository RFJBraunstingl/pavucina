"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

import { usePreferences } from "@/app/_components/use-preferences";
import { useGraph } from "./graph-provider";
import {
  setCalendarEventImport,
  syncImportedCalendarEvents,
} from "@/services/remote-calendar-import-store";
import { disconnectCalendar } from "@/services/remote-calendar-store";
import type { CalendarImportResponse } from "@/types/calendar-import";

const HOUR_MS = 60 * 60 * 1_000;

function useCalendarImportState() {
  const { data: session, status } = useSession();
  const { graph, saveGraphNow, adoptImportedGraph } = useGraph();
  const { preferences, setPreferences } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>();
  const inFlight = useRef<Promise<void> | null>(null);
  const startupKey = useRef<string | undefined>(undefined);
  const enabled = preferences?.calendarEventImportEnabled ?? false;

  const apply = useCallback(async (
    operation: () => Promise<CalendarImportResponse>,
  ) => {
    if (!graph || status !== "authenticated") return;
    if (inFlight.current) return inFlight.current;
    const base = graph;
    const pending = (async () => {
      setBusy(true);
      setError(null);
      try {
        await saveGraphNow(base);
        const result = await operation();
        adoptImportedGraph(result.graph, base);
        setLastSyncedAt(result.syncedAt);
        if (result.errors.length) {
          setError(result.errors.map(({ message }) => message).join("; "));
        }
      } catch (value) {
        setError(value instanceof Error ? value.message : "Could not import events");
        throw value;
      } finally {
        setBusy(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = pending;
    return pending;
  }, [adoptImportedGraph, graph, saveGraphNow, status]);

  const syncNow = useCallback(
    () => apply(syncImportedCalendarEvents),
    [apply],
  );

  const disconnect = useCallback(
    (connectionId: string) => apply(() => disconnectCalendar(connectionId)),
    [apply],
  );

  const setEnabled = useCallback(async (next: boolean) => {
    await apply(() => setCalendarEventImport(next));
    startupKey.current = next ? `${session?.user.id}:true` : undefined;
    setPreferences((current) => current
      ? { ...current, calendarEventImportEnabled: next }
      : current);
  }, [apply, session?.user.id, setPreferences]);

  useEffect(() => {
    if (!enabled || status !== "authenticated" || !graph) return;
    const key = `${session?.user.id}:${enabled}`;
    if (startupKey.current === key) return;
    startupKey.current = key;
    void Promise.resolve().then(syncNow).catch(() => undefined);
  }, [enabled, graph, session?.user.id, status, syncNow]);

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncNow().catch(() => undefined);
      }
    }, HOUR_MS);
    return () => window.clearInterval(interval);
  }, [enabled, status, syncNow]);

  return {
    enabled,
    available: status === "authenticated" && Boolean(graph),
    busy,
    error,
    lastSyncedAt,
    syncNow,
    setEnabled,
    disconnect,
  };
}

const CalendarImportContext = createContext<ReturnType<
  typeof useCalendarImportState
> | null>(null);

export function CalendarImportProvider({ children }: { children: ReactNode }) {
  return (
    <CalendarImportContext.Provider value={useCalendarImportState()}>
      {children}
    </CalendarImportContext.Provider>
  );
}

export function useCalendarImport() {
  const value = useContext(CalendarImportContext);
  if (!value) throw new Error("useCalendarImport must be used inside its provider");
  return value;
}
