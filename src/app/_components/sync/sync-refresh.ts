type SyncController = {
  flush: () => Promise<void>;
};

export function listenForSyncRefresh(controller: SyncController) {
  const refresh = () => {
    if (document.visibilityState === "visible") {
      void controller.flush().catch(() => undefined);
    }
  };
  window.addEventListener("focus", refresh);
  window.addEventListener("online", refresh);
  return () => {
    window.removeEventListener("focus", refresh);
    window.removeEventListener("online", refresh);
  };
}
