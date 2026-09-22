import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { removeConflictingChanges, selectedCalendars } from "./calendar-selection-conflicts";
import SyncConflictDialog from "../sync-conflict-dialog";
import {
  applyCalendarSelectionChanges,
  diffCalendarSelections,
} from "@/services/calendar/import/calendar-selection-patch";
import {
  beginCalendarConnection,
  disconnectCalendar,
  loadCalendars,
  saveCalendarSelections,
} from "@/services/calendar/import/storage/remote-calendar-store";
import { GraphConflictError } from "@/services/graph/sync/graph-patch-service";
import {
  calendarAuthProvider,
  calendarRange,
} from "@/utils/calendar/events/external-calendar";
import type { CalendarSelectionChange } from "@/types/calendar/calendar-selection-patch";
import type {
  CalendarSelection,
  CalendarSource,
  CalendarsResponse,
} from "@/types/calendar/events/external-calendar";
import type { SyncConflict } from "@/types/graph/graph-sync";

type PendingSelectionChanges = {
  connectionId: string;
  changes: CalendarSelectionChange[];
};

export function useExternalCalendars(
  days: string[],
  disconnectRemote: (connectionId: string) => Promise<unknown> = disconnectCalendar,
  includeEvents = true,
) {
  const { status } = useSession();
  const range = useMemo(() => calendarRange(days), [days]);
  const [data, setData] = useState<CalendarsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [pending, setPending] = useState<PendingSelectionChanges | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy("refresh");
    setError(null);
    try {
      setData(
        await loadCalendars(range.start, range.end, signal, includeEvents),
      );
    } catch (value) {
      if (value instanceof DOMException && value.name === "AbortError") return;
      setError(
        value instanceof Error ? value.message : "Could not load calendars",
      );
    } finally {
      setBusy((current) => current === "refresh" ? null : current);
    }
  }, [includeEvents, range.end, range.start]);

  useEffect(() => {
    if (status === "loading") return;
    const controller = new AbortController();
    void Promise.resolve().then(() => refresh(controller.signal));
    return () => controller.abort();
  }, [refresh, status]);

  async function runUpdate<T>(key: string, operation: () => Promise<T>) {
    setBusy(key);
    setError(null);
    try {
      const result = await operation();
      setData(
        await loadCalendars(range.start, range.end, undefined, includeEvents),
      );
      return result;
    } catch (value) {
      if (value instanceof GraphConflictError) setConflicts(value.conflicts);
      setError(
        value instanceof Error ? value.message : "Could not update calendars",
      );
    } finally {
      setBusy(null);
    }
  }

  function save(connectionId: string, calendars: CalendarSelection[]) {
    const before = selectedCalendars(data, connectionId);
    setPending({
      connectionId,
      changes: diffCalendarSelections(before, calendars),
    });
    return runUpdate(connectionId, () =>
      saveCalendarSelections(connectionId, calendars, before),
    );
  }

  function disconnect(connectionId: string) {
    return runUpdate(connectionId, () => disconnectRemote(connectionId));
  }

  async function connect(source: CalendarSource) {
    setBusy(source);
    setError(null);
    try {
      await beginCalendarConnection(source);
      await signIn(calendarAuthProvider(source), {
        redirectTo: "/calendar?calendar=return",
      });
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Could not connect calendar",
      );
      setBusy(null);
    }
  }

  async function resolveConflict(keepMine: boolean) {
    const latest = await loadCalendars(
      range.start,
      range.end,
      undefined,
      includeEvents,
    );
    setData(latest);
    if (pending) {
      const before = selectedCalendars(latest, pending.connectionId);
      const changes = keepMine
        ? pending.changes
        : removeConflictingChanges(pending.changes, conflicts);
      const calendars = applyCalendarSelectionChanges(
        before,
        changes,
        keepMine,
      );
      await saveCalendarSelections(
        pending.connectionId,
        calendars,
        before,
      );
      await refresh();
    }
    setConflicts([]);
    setPending(null);
    setError(null);
  }

  const conflictDialog = (
    <SyncConflictDialog conflicts={conflicts} onResolve={resolveConflict} />
  );
  return {
    data,
    error,
    busy,
    refresh,
    save,
    disconnect,
    connect,
    conflictDialog,
  };
}
