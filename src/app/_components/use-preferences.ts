"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { DEFAULT_USER_PREFERENCES } from "@/services/preferences-service";
import {
  loadRemotePreferences,
  saveRemotePreferences,
} from "@/services/remote-preferences-store";
import type { UserPreferences } from "@/types/preferences";

export function usePreferences() {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const loadedScope = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const userId = session?.user.id;
  const scope = status === "authenticated" ? `github:${userId}` : "guest";

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    loadedScope.current = null;
    lastSaved.current = null;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setPreferences(null);
      setSyncError(null);

      if (status === "unauthenticated") {
        loadedScope.current = "guest";
        lastSaved.current = JSON.stringify(DEFAULT_USER_PREFERENCES);
        setPreferences(DEFAULT_USER_PREFERENCES);
        return;
      }

      try {
        const next = await loadRemotePreferences();
        if (cancelled) return;
        loadedScope.current = scope;
        lastSaved.current = JSON.stringify(next);
        setPreferences(next);
      } catch (error: unknown) {
        if (!cancelled) {
          setSyncError(
            error instanceof Error ? error.message : "Could not load your preferences",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId, scope, loadAttempt]);

  useEffect(() => {
    if (
      !preferences ||
      status !== "authenticated" ||
      loadedScope.current !== scope
    ) {
      return;
    }
    const serialized = JSON.stringify(preferences);
    if (serialized === lastSaved.current) return;
    const saveScope = scope;
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (loadedScope.current !== saveScope) return;
        try {
          await saveRemotePreferences(preferences);
          if (loadedScope.current !== saveScope) return;
          lastSaved.current = serialized;
          setSyncError(null);
        } catch (error: unknown) {
          if (loadedScope.current !== saveScope) return;
          setSyncError(
            error instanceof Error ? error.message : "Could not save your preferences",
          );
        }
      });
  }, [preferences, scope, status, saveAttempt]);

  function retry() {
    if (preferences) setSaveAttempt((attempt) => attempt + 1);
    else setLoadAttempt((attempt) => attempt + 1);
  }

  return { preferences, setPreferences, syncError, retry };
}
