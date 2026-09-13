import { useState } from "react";
import { useSession } from "next-auth/react";
import { useGraph } from "@/providers/graph-provider";
import { deleteNativeEvent, nativeEventInput, saveNativeEvent } from "@/services/native-event-service";
import type { EventEditorState, EventTimeRange, NativeEventInput } from "@/types/event";

export function useEventEditor(onSelect: (id: string | null) => void) {
  const { graph, setGraph } = useGraph();
  const { data: session, status } = useSession();
  const scope = status === "authenticated" ? session?.user.id : status;
  const [editor, setEditor] = useState<EventEditorState | null>(null);
  const draft = editor?.scope === scope ? editor.draft : null;
  const close = () => setEditor(null);

  function create(range: EventTimeRange) {
    setEditor({ scope, draft: {
      id: crypto.randomUUID(), creating: true,
      values: { ...range, name: "", description: "", location: "",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    } });
  }

  function select(id: string) {
    onSelect(id);
    const event = graph?.nodes.find((node) => node.id === id);
    if (graph && event?.type === "event" && !event.properties.externalOrigin) {
      setEditor({ scope, draft: { id, creating: false, values: nativeEventInput(graph, event) } });
    }
  }

  function save(values: NativeEventInput) {
    if (!graph || !draft) throw new Error("Your workspace is no longer available.");
    setGraph(saveNativeEvent(graph, draft.id, values, draft.creating));
    onSelect(draft.id);
    close();
  }

  function remove() {
    if (!draft || draft.creating) return;
    setGraph((current) => current ? deleteNativeEvent(current, draft.id) : current);
    onSelect(null);
    close();
  }

  return { draft, create, select, save, remove, close };
}
