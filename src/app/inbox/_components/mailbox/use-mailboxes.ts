import { useCallback, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import {
  beginMailboxConnection,
  disconnectMailbox,
  loadMailboxes,
  markRemoteMessageRead,
} from "@/services/mailbox/remote-mailbox-store";
import type {
  MailboxConnectionSummary,
  MailboxesResponse,
  MailMessage,
  MailboxSource,
} from "@/types/mailbox/mailbox";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useMailboxes(onAdd: (message: MailMessage) => void) {
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
      setMessage(errorMessage(error, "Could not load mailboxes"));
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
      setMessage(errorMessage(error, "Could not connect mailbox"));
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
      setMessage(errorMessage(error, "Could not update message"));
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
    } catch (error) {
      setMessage(errorMessage(error, "Could not disconnect mailbox"));
    } finally {
      setBusy(null);
    }
  }

  return {
    data,
    busy,
    message,
    selectedConnection,
    visibleMessages,
    disconnecting,
    setSelectedConnectionId,
    setDisconnecting,
    refresh,
    connect,
    handleMessage,
    confirmDisconnect,
  };
}
