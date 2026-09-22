import { useState } from "react";

import { MAILBOX_SOURCES, mailboxSourceLabel } from "@/utils/mailbox";
import type { MailboxConnectionPickerProps } from "@/types/inbox/inbox-components";

export default function MailboxConnectionPicker(props: MailboxConnectionPickerProps) {
  const [adding, setAdding] = useState(false);
  const connections = props.connections ?? [];
  const selected = connections.find(({ id }) => id === props.selectedId)
    ?? connections[0];
  const label = selected
    ? `${selected.address} · ${mailboxSourceLabel(selected.source)}`
    : props.connections
      ? "No connections configured"
      : "Loading connections…";

  return (
    <div className="mailbox-picker">
      <div className="mailbox-picker-row">
        {connections.length > 1 ? (
          <select
            aria-label="Mail connection"
            value={selected?.id}
            disabled={props.busy}
            onChange={(event) => props.onSelect(event.target.value)}
          >
            {connections.map((connection) => (
              <option value={connection.id} key={connection.id}>
                {connection.address} · {mailboxSourceLabel(connection.source)}
              </option>
            ))}
          </select>
        ) : (
          <div
            className={`mailbox-picker-value ${selected ? "selected" : ""}`}
            aria-live="polite"
          >
            {label}
          </div>
        )}
        <button
          type="button"
          className="mailbox-add-button"
          aria-label="Add mail connection"
          aria-expanded={adding}
          disabled={props.busy}
          onClick={() => setAdding((current) => !current)}
        >
          +
        </button>
      </div>
      {adding && (
        <div className="source-actions" aria-label="Mail providers">
          {MAILBOX_SOURCES.map((source) => (
            <button
              type="button"
              key={source}
              disabled={props.busy || props.available?.[source] === false}
              onClick={() => props.onConnect(source)}
            >
              {props.available?.[source] === false
                ? `${mailboxSourceLabel(source)} unavailable`
                : `Add ${mailboxSourceLabel(source)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
