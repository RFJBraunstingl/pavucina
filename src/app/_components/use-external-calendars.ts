import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import SyncConflictDialog from "./sync-conflict-dialog";
import { GraphConflictError } from "@/services/graph-patch-service";
import { diffCalendarSelections, applyCalendarSelectionChanges } from "@/services/calendar-selection-patch";
import type { CalendarSelectionChange } from "@/types/calendar-selection-patch";
import type { SyncConflict } from "@/types/graph-sync";
import { signIn, useSession } from "next-auth/react";

import {
  beginCalendarConnection,
  disconnectCalendar,
  loadCalendars,
  saveCalendarSelections,
} from "@/services/remote-calendar-store";
import { calendarAuthProvider, calendarRange } from "@/utils/external-calendar";
import type {
  CalendarSelection,
  CalendarSource,
  CalendarsResponse,
} from "@/types/external-calendar";

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
  const [pending, setPending] = useState<{ id: string; changes: CalendarSelectionChange[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy("refresh");
    setError(null);
    try {
      setData(await loadCalendars(range.start, range.end, signal, includeEvents));
    } catch (value) {
      if (value instanceof DOMException && value.name === "AbortError") return;
      setError(value instanceof Error ? value.message : "Could not load calendars");
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

  async function update<T>(key: string, operation: () => Promise<T>) {
    setBusy(key);
    setError(null);
    try {
      const result = await operation();
      setData(await loadCalendars(range.start, range.end, undefined, includeEvents));
      return result;
    } catch (value) {
      if (value instanceof GraphConflictError) setConflicts(value.conflicts);
      setError(value instanceof Error ? value.message : "Could not update calendars");
    } finally {
      setBusy(null);
    }
  }

  function save(connectionId: string, calendars: CalendarSelection[]) {
    const before = data?.connections.find(({ id }) => id === connectionId)?.calendars.filter((calendar) => calendar.selected)
      .map(({ id, name, color, visible }) => ({ id, name, color, visible })) ?? [];
    setPending({ id: connectionId, changes: diffCalendarSelections(before, calendars) });
    return update(connectionId, () => saveCalendarSelections(connectionId, calendars, before));
  }

  function disconnect(connectionId: string) {
    return update(connectionId, () => disconnectRemote(connectionId));
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
      setError(value instanceof Error ? value.message : "Could not connect calendar");
      setBusy(null);
    }
  }

  async function resolveConflict(keepMine: boolean) {
    const latest = await loadCalendars(range.start, range.end, undefined, includeEvents);
    setData(latest);
    if (pending) {
      const before = latest.connections.find(({ id }) => id === pending.id)?.calendars.filter((calendar) => calendar.selected)
        .map(({ id, name, color, visible }) => ({ id, name, color, visible })) ?? [];
      const changes = keepMine ? pending.changes : pending.changes.flatMap((change) => {
        const affected = conflicts.filter((conflict) => conflict.id === change.id);
        if (!affected.length) return [change];
        if (change.kind !== "update" || affected.some(({ field }) => field === "calendar deselected")) return [];
        return [{ ...change, fields: Object.fromEntries(Object.entries(change.fields)
          .filter(([key]) => !affected.some(({ field }) => field === key))) }];
      });
      await saveCalendarSelections(pending.id, applyCalendarSelectionChanges(before, changes, keepMine), before);
      await refresh();
    }
    setConflicts([]); setPending(null); setError(null);
  }
  const conflictDialog = createElement(SyncConflictDialog, { conflicts, onResolve: resolveConflict });
  return { data, error, busy, refresh, save, disconnect, connect, conflictDialog };
}
