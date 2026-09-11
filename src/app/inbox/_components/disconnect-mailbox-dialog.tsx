"use client";

import { useEffect, useRef } from "react";

import type { MailboxConnectionSummary } from "@/types/mailbox";

type Props = {
  connection: MailboxConnectionSummary | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function DisconnectMailboxDialog(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (props.connection && !dialog.current?.open) dialog.current?.showModal();
    if (!props.connection && dialog.current?.open) dialog.current.close();
  }, [props.connection]);

  return (
    <dialog
      ref={dialog}
      className="delete-dialog"
      aria-labelledby="disconnect-mailbox-heading"
      onClose={props.onClose}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          props.onConfirm();
        }}
      >
        <h3 id="disconnect-mailbox-heading">Disconnect mailbox?</h3>
        <p>
          Pavucina will delete its stored connection to {props.connection?.address}.
          {" "}Your provider permission will not be revoked.
        </p>
        <div className="delete-dialog-actions">
          <button type="button" disabled={props.busy} onClick={props.onClose}>
            Cancel
          </button>
          <button type="submit" className="confirm-delete" disabled={props.busy}>
            {props.busy ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
