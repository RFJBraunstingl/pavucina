import { mailboxSourceLabel } from "@/utils/mailbox";
import type { MailMessage } from "@/types/mailbox/mailbox";

type Props = {
  messages: MailMessage[];
  loading: boolean;
  busy: string | null;
  onAdd: (message: MailMessage) => void;
  onIgnore: (message: MailMessage) => void;
};

export default function MailMessageList(props: Props) {
  if (props.loading) return <p className="source-empty">Loading unread mail…</p>;
  if (!props.messages.length) {
    return <p className="source-empty">No unread inbox mail.</p>;
  }
  return (
    <ul className="mail-message-list">
      {props.messages.map((message) => {
        const key = `${message.connectionId}:${message.id}`;
        const disabled = Boolean(props.busy);
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
                onClick={() => props.onIgnore(message)}
              >
                Ignore
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
