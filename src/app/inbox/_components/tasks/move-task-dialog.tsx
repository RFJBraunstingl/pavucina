"use client";

import { useEffect, useRef, type FormEvent } from "react";

import type { MoveTaskDialogProps } from "@/types/inbox/inbox-components";

export default function MoveTaskDialog({
  taskId,
  parents,
  onMove,
  onClose,
}: MoveTaskDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (taskId && !dialog.current?.open) dialog.current?.showModal();
    if (!taskId && dialog.current?.open) dialog.current.close();
  }, [taskId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskId) return;
    const parentId = new FormData(event.currentTarget).get("parentId");
    if (typeof parentId === "string" && parentId) onMove(taskId, parentId);
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      className="app-dialog move-task-dialog desktop-transfer"
      aria-labelledby="move-task-heading"
      onClose={onClose}
    >
      <form key={taskId} onSubmit={submit}>
        <h3 id="move-task-heading">Move into timeline</h3>
        <label htmlFor="move-task-parent">Parent task</label>
        <select id="move-task-parent" name="parentId" defaultValue="" required>
          <option value="" disabled>Select a parent</option>
          {parents.map((parent) => (
            <option value={parent.id} key={parent.id}>
              {parent.label}
            </option>
          ))}
        </select>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!parents.length}>Move</button>
        </div>
      </form>
    </dialog>
  );
}
