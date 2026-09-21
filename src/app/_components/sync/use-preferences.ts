"use client";
import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { PreferencesSyncController } from "@/services/preferences/preferences-sync-controller";
import SyncConflictDialog from "./sync-conflict-dialog";
import type { UserPreferences } from "@/types/preferences/preferences";
import type { PreferencesView } from "@/types/preferences/preferences-sync";

function usePreferencesState() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<PreferencesView>({ preferences: null, error: null, conflicts: [] });
  const controller = useRef<PreferencesSyncController | null>(null);
  const scope = status === "authenticated" ? `user:${session?.user.id}` : "guest";
  useEffect(() => {
    if (status === "loading") return;
    const sync = new PreferencesSyncController(scope, setState);
    controller.current = sync;
    void Promise.resolve().then(() => sync.open());
    const refresh = () => { if (document.visibilityState === "visible") void sync.flush().catch(() => undefined); };
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh);
    return () => { sync.active = false; window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [scope, status]);
  return { preferences: state.preferences, syncError: state.error,
    setPreferences: (next: UserPreferences | null | ((current: UserPreferences | null) => UserPreferences | null)) => controller.current?.change(next),
    retry: () => void controller.current?.flush().catch(() => undefined),
    restorePreferences: async (next: UserPreferences) => { if (!controller.current) throw new Error("Settings are loading"); await controller.current.restore(next); },
    conflicts: state.conflicts, resolveConflict: async (keep: boolean) => { await controller.current?.resolve(keep); },
  };
}
const PreferencesContext = createContext<ReturnType<typeof usePreferencesState> | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const value = usePreferencesState();
  return createElement(PreferencesContext.Provider, { value }, children,
    createElement(SyncConflictDialog, { conflicts: value.conflicts, onResolve: value.resolveConflict }));
}
export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}
