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

import SyncConflictDialog from "./sync-conflict-dialog";
import { listenForSyncRefresh } from "./sync-refresh";
import { PreferencesSyncController } from "@/services/preferences/preferences-sync-controller";
import type { UserPreferences } from "@/types/preferences/preferences";
import type { PreferencesView } from "@/types/preferences/preferences-sync";

const INITIAL_VIEW: PreferencesView = {
  preferences: null,
  error: null,
  conflicts: [],
};

function usePreferencesState() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<PreferencesView>(INITIAL_VIEW);
  const controller = useRef<PreferencesSyncController | null>(null);
  const scope = status === "authenticated" ? `user:${session?.user.id}` : "guest";

  useEffect(() => {
    if (status === "loading") return;
    const sync = new PreferencesSyncController(scope, setView);
    controller.current = sync;
    void Promise.resolve().then(() => sync.open());
    const stopRefreshListeners = listenForSyncRefresh(sync);
    return () => {
      sync.active = false;
      stopRefreshListeners();
    };
  }, [scope, status]);

  function setPreferences(
    next:
      | UserPreferences
      | null
      | ((current: UserPreferences | null) => UserPreferences | null),
  ) {
    controller.current?.change(next);
  }

  async function restorePreferences(next: UserPreferences) {
    if (!controller.current) throw new Error("Settings are loading");
    await controller.current.restore(next);
  }

  return {
    preferences: view.preferences,
    syncError: view.error,
    setPreferences,
    retry: () => void controller.current?.flush().catch(() => undefined),
    restorePreferences,
    conflicts: view.conflicts,
    resolveConflict: async (keepMine: boolean) => {
      await controller.current?.resolve(keepMine);
    },
  };
}

const PreferencesContext = createContext<
  ReturnType<typeof usePreferencesState> | null
>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const value = usePreferencesState();
  return (
    <PreferencesContext.Provider value={value}>
      {children}
      <SyncConflictDialog
        conflicts={value.conflicts}
        onResolve={value.resolveConflict}
      />
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return value;
}
