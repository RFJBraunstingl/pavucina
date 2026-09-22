import { useRef } from "react";

type TaskDeleteControlProps = {
  taskName: string;
  onDelete: () => void;
};

export default function TaskDeleteControl({
  taskName,
  onDelete,
}: TaskDeleteControlProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="delete-task"
        aria-label={`Delete ${taskName}`}
        title="Delete task"
        onClick={() => dialog.current?.showModal()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        className="app-dialog"
        aria-labelledby="delete-dialog-heading"
      >
        <form method="dialog">
          <h3 id="delete-dialog-heading">Delete task?</h3>
          <p>
            <strong>{taskName}</strong> and all of its child tasks will be
            permanently deleted.
          </p>
          <div className="dialog-actions">
            <button type="submit" autoFocus>Cancel</button>
            <button
              type="submit"
              className="dialog-danger"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
