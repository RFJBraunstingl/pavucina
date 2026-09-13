"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import DisconnectMailboxDialog from "./disconnect-mailbox-dialog";
import MailboxConnectionPicker from "./mailbox-connection-picker";
import MailMessageList from "./mail-message-list";
import {
  beginMailboxConnection,
  disconnectMailbox,
  loadMailboxes,
  markRemoteMessageRead,
} from "@/services/remote-mailbox-store";
import { mailboxSourceLabel } from "@/utils/mailbox";
import type {
  MailboxConnectionSummary,
  MailboxesResponse,
  MailMessage,
  MailboxSource,
} from "@/types/mailbox";

export default function SourcePanel({
  onAdd,
}: {
  onAdd: (message: MailMessage) => void;
}) {
  const { status } = useSession();
  const [data, setData] = useState<MailboxesResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>();
  const [disconnecting, setDisconnecting] =
    useState<MailboxConnectionSummary | null>(null);
  const selectedConnection = data?.connections.find(
    ({ id }) => id === selectedConnectionId,
  ) ?? data?.connections[0];
  const visibleMessages = selectedConnection
    ? data?.messages.filter(
        ({ connectionId }) => connectionId === selectedConnection.id,
      ) ?? []
    : [];

  const refresh = useCallback(async () => {
    setBusy("refresh");
    setMessage(null);
    try {
      setData(await loadMailboxes());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load mailboxes",
      );
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    if (status !== "loading") void Promise.resolve().then(refresh);
  }, [refresh, status]);

  async function connect(source: MailboxSource) {
    setBusy(source);
    setMessage(null);
    try {
      await beginMailboxConnection(source);
      await signIn(source, { redirectTo: "/inbox?mailbox=return" });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not connect mailbox",
      );
      setBusy(null);
    }
  }

  function handleMessage(mail: MailMessage, add: boolean) {
    setMessage(null);
    if (add) onAdd(mail);
    setData((current) => current && ({
      ...current,
      messages: current.messages.filter(
        (item) =>
          item.connectionId !== mail.connectionId || item.id !== mail.id,
      ),
    }));
    void markRemoteMessageRead(mail.connectionId, mail.id).catch((error) => {
      setMessage(
        error instanceof Error ? error.message : "Could not update message",
      );
    });
  }

  async function confirmDisconnect() {
    if (!disconnecting) return;
    setBusy(disconnecting.id);
    try {
      await disconnectMailbox(disconnecting.id);
      setData((current) => current && ({
        ...current,
        connections: current.connections.filter(
          ({ id }) => id !== disconnecting.id,
        ),
        messages: current.messages.filter(
          ({ connectionId }) => connectionId !== disconnecting.id,
        ),
      }));
      setDisconnecting(null);
      setMessage("Mailbox disconnected.");
      setBusy(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not disconnect mailbox",
      );
      setBusy(null);
    }
  }

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
          onClick={() => void refresh()}
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
          onSelect={setSelectedConnectionId}
          onConnect={(source) => void connect(source)}
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
                onClick={() => void connect(selectedConnection.source)}
              >
                Reconnect
              </button>
            )}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => setDisconnecting(selectedConnection)}
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
          onAdd={(mail) => handleMessage(mail, true)}
          onIgnore={(mail) => handleMessage(mail, false)}
        />
      </div>
      <DisconnectMailboxDialog
        connection={disconnecting}
        busy={Boolean(disconnecting && busy === disconnecting.id)}
        onConfirm={() => void confirmDisconnect()}
        onClose={() => setDisconnecting(null)}
      />
    </section>
  );
}
