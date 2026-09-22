"use client";

import { useEffect, useId, useRef } from "react";
import type { ConfirmationDialogProps } from "@/types/shared/components";

export default function ConfirmationDialog(props: ConfirmationDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (props.open && !dialog.current?.open) dialog.current?.showModal();
    if (!props.open && dialog.current?.open) dialog.current.close();
  }, [props.open]);

  return (
    <dialog
      ref={dialog}
      className="app-dialog"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          props.onConfirm();
        }}
      >
        <h3 id={headingId}>{props.title}</h3>
        <p>{props.message}</p>
        <div className="dialog-actions">
          <button
            type="button"
            disabled={props.busy}
            autoFocus
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="dialog-danger"
            disabled={props.busy}
          >
            {props.busy ? props.busyLabel ?? props.confirmLabel : props.confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
