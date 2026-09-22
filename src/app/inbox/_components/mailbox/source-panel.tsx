"use client";

import DisconnectMailboxDialog from "./disconnect-mailbox-dialog";
import MailboxConnectionPicker from "./mailbox-connection-picker";
import MailMessageList from "./mail-message-list";
import { useMailboxes } from "./use-mailboxes";
import { mailboxSourceLabel } from "@/utils/mailbox";
import type { SourcePanelProps } from "@/types/inbox/inbox-components";

export default function SourcePanel({ onAdd }: SourcePanelProps) {
  const mailboxes = useMailboxes(onAdd);
  const {
    data,
    busy,
    message,
    selectedConnection,
    visibleMessages,
    disconnecting,
  } = mailboxes;

  return (
    <section className="inbox-panel source-panel" aria-labelledby="sources-heading">
      <header className="inbox-panel-heading source-heading">
        <div>
          <p className="eyebrow">Capture</p>
          <h2 id="sources-heading">Mail</h2>
        </div>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void mailboxes.refresh()}
        >
          Refresh
        </button>
      </header>
      <div className="source-content">
        <MailboxConnectionPicker
          connections={data?.connections ?? null}
          available={data?.available}
          busy={Boolean(busy)}
          selectedId={selectedConnection?.id}
          onSelect={mailboxes.setSelectedConnectionId}
          onConnect={(source) => void mailboxes.connect(source)}
        />
        {selectedConnection && (
          <div className="mailbox-account">
            <div>
              <strong>{selectedConnection.address}</strong>
              <small>{mailboxSourceLabel(selectedConnection.source)}</small>
              {selectedConnection.error && <span>{selectedConnection.error}</span>}
            </div>
            {selectedConnection.status === "error" && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void mailboxes.connect(selectedConnection.source)}
              >
                Reconnect
              </button>
            )}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => mailboxes.setDisconnecting(selectedConnection)}
            >
              Disconnect
            </button>
          </div>
        )}
        {message && <p className="mailbox-message" role="status">{message}</p>}
        <MailMessageList
          messages={visibleMessages}
          loading={!data || busy === "refresh"}
          busy={busy}
          onAdd={(mail) => mailboxes.handleMessage(mail, true)}
          onIgnore={(mail) => mailboxes.handleMessage(mail, false)}
        />
      </div>
      <DisconnectMailboxDialog
        connection={disconnecting}
        busy={Boolean(disconnecting && busy === disconnecting.id)}
        onConfirm={() => void mailboxes.confirmDisconnect()}
        onClose={() => mailboxes.setDisconnecting(null)}
      />
    </section>
  );
}
