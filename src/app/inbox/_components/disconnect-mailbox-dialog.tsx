"use client";

import ConfirmationDialog from "../../_components/confirmation-dialog";
import type { MailboxConnectionSummary } from "@/types/mailbox";

type Props = {
  connection: MailboxConnectionSummary | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function DisconnectMailboxDialog(props: Props) {
  return (
    <ConfirmationDialog
      open={Boolean(props.connection)}
      title="Disconnect mailbox?"
      message={
        <>
          Pavucina will delete its stored connection to {props.connection?.address}.
          {" "}Your provider permission will not be revoked.
        </>
      }
      confirmLabel="Disconnect"
      busy={props.busy}
      busyLabel="Disconnecting…"
      onConfirm={props.onConfirm}
      onClose={props.onClose}
    />
  );
}
