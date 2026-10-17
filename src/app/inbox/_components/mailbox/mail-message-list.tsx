import { mailboxSourceLabel } from "@/utils/mailbox";
import type { MailMessageListProps } from "@/types/inbox/inbox-components";

export default function MailMessageList(props: MailMessageListProps) {
  if (!props.messages.length) {
    if (!props.loaded) return null;
    return <p className="source-empty">No unread inbox mail.</p>;
  }
  return (
    <ul className="mail-message-list">
      {props.messages.map((message) => {
        const key = `${message.connectionId}:${message.id}`;
        const disabled = props.disabled || Boolean(props.busy);
        return (
          <li key={key}>
            <div className="mail-message-meta">
              <span>{mailboxSourceLabel(message.source)}</span>
              <small title={message.account}>{message.account}</small>
              <time dateTime={message.receivedAt}>
                {message.receivedAt.slice(0, 16).replace("T", " ")} UTC
              </time>
            </div>
            <strong>{message.subject}</strong>
            <small className="mail-sender">{message.sender}</small>
            {message.preview && <p>{message.preview}</p>}
            <div className="mail-message-actions">
              <button
                type="button"
                disabled={disabled}
                onClick={() => props.onArchive(message)}
              >
                Archive
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => props.onAdd(message)}
              >
                Add to scratchpad
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
