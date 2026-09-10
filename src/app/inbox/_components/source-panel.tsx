export default function SourcePanel() {
  return (
    <section
      className="inbox-panel source-panel"
      aria-labelledby="sources-heading"
    >
      <header className="inbox-panel-heading">
        <p className="eyebrow">Capture</p>
        <h2 id="sources-heading">Sources</h2>
      </header>
      <p className="source-intro">Bring incoming work into one place.</p>
      <ul className="source-list">
        <li>
          <span>Gmail</span>
          <small>Coming soon</small>
        </li>
        <li>
          <span>Outlook</span>
          <small>Coming soon</small>
        </li>
      </ul>
    </section>
  );
}
