import { useCallback, useEffect, useMemo, useState } from "react";
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

export function useExternalCalendars(days: string[]) {
  const { status } = useSession();
  const range = useMemo(() => calendarRange(days), [days]);
  const [data, setData] = useState<CalendarsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy("refresh");
    setError(null);
    try {
      setData(await loadCalendars(range.start, range.end, signal));
    } catch (value) {
      if (value instanceof DOMException && value.name === "AbortError") return;
      setError(value instanceof Error ? value.message : "Could not load calendars");
    } finally {
      setBusy((current) => current === "refresh" ? null : current);
    }
  }, [range.end, range.start]);

  useEffect(() => {
    if (status === "loading") return;
    const controller = new AbortController();
    void Promise.resolve().then(() => refresh(controller.signal));
    return () => controller.abort();
  }, [refresh, status]);

  async function update(key: string, operation: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await operation();
      setData(await loadCalendars(range.start, range.end));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not update calendars");
    } finally {
      setBusy(null);
    }
  }

  function save(connectionId: string, calendars: CalendarSelection[]) {
    return update(connectionId, () => saveCalendarSelections(connectionId, calendars));
  }

  function disconnect(connectionId: string) {
    return update(connectionId, () => disconnectCalendar(connectionId));
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

  return { data, error, busy, refresh, save, disconnect, connect };
}
