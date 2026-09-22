export default function CalendarEditLock({
  locked,
  onToggle,
}: {
  locked: boolean;
  onToggle: () => void;
}) {
  const label = locked ? "Unlock calendar editing" : "Lock calendar editing";
  return (
    <button
      type="button"
      className="calendar-edit-lock"
      aria-label={label}
      aria-pressed={locked}
      title={label}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d={locked ? "M8 10V7a4 4 0 0 1 8 0v3" : "M9 10V7a4 4 0 0 1 7.5-2"} />
      </svg>
    </button>
  );
}
