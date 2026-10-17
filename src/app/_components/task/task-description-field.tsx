import { useEffect, useMemo, useRef } from "react";

import { useGraph } from "@/providers/graph-provider";
import { setTaskDescription } from "@/services/task/core/task-service";
import { setInboxTaskDescription } from "@/services/inbox/inbox-service";
import { debouncedDescription } from "@/utils/shared/debounced-description";
import type { TaskDescriptionFieldProps } from "@/types/shared/description-field";

export default function TaskDescriptionField({ taskId, ...props }: TaskDescriptionFieldProps) {
  const { graph, setGraph } = useGraph();
  const input = useRef<HTMLTextAreaElement>(null);
  const task = graph?.nodes.find((node) => node.id === taskId) ??
    graph?.inboxNodes?.find((node) => node.id === taskId);
  const value = task?.type === "task" ? task.properties.description ?? "" : "";
  const edit = useMemo(() => debouncedDescription((description) => {
    setGraph((current) => {
      if (!current) return current;
      const inTree = current.nodes.some((node) => node.id === taskId && node.type === "task");
      if (!inTree && !current.inboxNodes?.some((node) => node.id === taskId)) {
        console.warn("Description edit cancelled: the task no longer exists.", taskId);
        return current;
      }
      return inTree
        ? setTaskDescription(current, taskId, description)
        : setInboxTaskDescription(current, taskId, description);
    });
  }), [setGraph, taskId]);

  useEffect(() => {
    if (!edit.pending && input.current && input.current.value !== value) {
      input.current.value = value;
    }
  }, [edit, value]);

  useEffect(() => {
    window.addEventListener("pagehide", edit.flush);
    return () => {
      window.removeEventListener("pagehide", edit.flush);
      edit.flush();
    };
  }, [edit]);

  return (
    <textarea
      {...props}
      ref={input}
      defaultValue={value}
      onChange={(event) => edit.schedule(event.currentTarget.value)}
      onBlur={edit.flush}
    />
  );
}
