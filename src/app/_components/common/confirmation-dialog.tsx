"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmationDialog(props: Props) {
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
