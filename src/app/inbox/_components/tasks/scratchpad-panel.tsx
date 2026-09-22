"use client";

import { useState, type FormEvent } from "react";
import ConfirmationDialog from "@/app/_components/common/confirmation-dialog";
import type { TaskNode } from "@/types/graph/graph";
import type { ScratchpadPanelProps } from "@/types/inbox/inbox-components";

export default function ScratchpadPanel(props: ScratchpadPanelProps) {
  const [draft, setDraft] = useState("");
  const [deleting, setDeleting] = useState<TaskNode | null>(null);

  function createTask(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    props.onCreate(draft);
    setDraft("");
  }

  return (
    <section className="inbox-panel scratchpad-panel" aria-labelledby="scratchpad-heading">
      <header className="inbox-panel-heading">
        <p className="eyebrow">Quick capture</p>
        <h2 id="scratchpad-heading">Scratchpad</h2>
      </header>
      <form className="scratchpad-form" onSubmit={createTask}>
        <label className="sr-only" htmlFor="scratchpad-task">New task</label>
        <input
          id="scratchpad-task"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a task and press Enter"
          autoComplete="off"
          autoFocus
        />
        <button type="submit">Add</button>
      </form>
      <p id="inbox-drag-help" className="sr-only">
        Drag onto a timeline task to make this task its child.
      </p>
      {props.nodes.length ? (
        <ul className="scratchpad-list">
          {props.nodes.map((node) => (
            <li
              className={props.draggingId === node.id ? "is-dragging" : undefined}
              key={node.id}
            >
              <button
                type="button"
                className="inbox-drag-handle desktop-transfer"
                aria-label={`Move ${node.properties.name}`}
                aria-describedby="inbox-drag-help"
                title="Drag into the timeline"
                onPointerDown={(event) => props.onDragStart(event, node.id)}
                onPointerMove={props.onDragMove}
                onPointerUp={props.onDragEnd}
                onPointerCancel={props.onDragCancel}
              >
                <span aria-hidden="true">⠿</span>
              </button>
              <input
                key={node.properties.name}
                aria-label={`Scratchpad task: ${node.properties.name}`}
                defaultValue={node.properties.name}
                onBlur={(event) => {
                  if (event.currentTarget.value.trim()) {
                    props.onRename(node.id, event.currentTarget.value);
                  } else {
                    event.currentTarget.value = node.properties.name;
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
              <button
                type="button"
                className="inbox-move desktop-transfer"
                onClick={() => props.onMoveRequest(node.id)}
              >
                Move…
              </button>
              <button
                type="button"
                className="inbox-delete"
                aria-label={`Delete ${node.properties.name}`}
                onClick={() => setDeleting(node)}
              >
                <span aria-hidden="true">×</span>
              </button>
              <textarea
                rows={2}
                aria-label={`Description for ${node.properties.name}`}
                placeholder="Add a description"
                value={node.properties.description ?? ""}
                onChange={(event) =>
                  props.onDescriptionChange(node.id, event.currentTarget.value)
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="scratchpad-empty">Nothing captured yet.</p>
      )}
      <ConfirmationDialog
        open={Boolean(deleting)}
        title="Delete scratchpad task?"
        message={
          <>
            <strong>{deleting?.properties.name}</strong> will be permanently deleted.
          </>
        }
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          props.onDelete(deleting.id);
          setDeleting(null);
        }}
      />
    </section>
  );
}
