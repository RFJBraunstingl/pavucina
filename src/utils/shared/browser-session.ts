const TAB_ID_KEY = "pavucina.tab";

export function browserTabId() {
  const tabId = sessionStorage.getItem(TAB_ID_KEY) ?? crypto.randomUUID();
  sessionStorage.setItem(TAB_ID_KEY, tabId);
  return tabId;
}
