import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import type { TimelineFilterFieldProps } from "@/types/timeline-filter";

export default function TimelineFilterField({
  level,
  onChange,
}: TimelineFilterFieldProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = new Set(level.selectedIds);
  const label = level.depth === 0 ? "Top-level tasks" : `Level ${level.depth + 1} tasks`;
  const summary = selected.size === 0
    ? "All tasks"
    : selected.size === 1
      ? level.options.find(({ id }) => selected.has(id))?.name
      : `${selected.size} selected`;

  function toggle(taskId: string, checked: boolean) {
    if (checked) selected.add(taskId);
    else selected.delete(taskId);
    onChange(level.options.flatMap(({ id }) => selected.has(id) ? [id] : []));
  }

  function closeOnBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  function closeOnEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setOpen(false);
    button.current?.focus();
  }

  return (
    <div className="timeline-filter-field" onBlur={closeOnBlur} onKeyDown={closeOnEscape}>
      <span className="timeline-filter-label" id={`${id}-label`}>{label}</span>
      <button
        ref={button}
        type="button"
        className="timeline-filter-trigger"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={!level.options.length}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{level.options.length ? summary : "No tasks"}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {open && (
        <fieldset className="timeline-filter-options" id={`${id}-options`}>
          <legend className="sr-only">{label}</legend>
          <div className="timeline-filter-option-actions">
            <button
              type="button"
              disabled={selected.size === level.options.length}
              onClick={() => onChange(level.options.map(({ id }) => id))}
            >Select all</button>
            <button
              type="button"
              disabled={!selected.size}
              onClick={() => onChange([])}
            >Clear</button>
          </div>
          <div className="timeline-filter-option-list">
            {level.options.map((option) => (
              <div className="timeline-filter-option" key={option.id}>
                <input
                  type="checkbox"
                  aria-label={`Select ${option.name}`}
                  checked={selected.has(option.id)}
                  onChange={(event) => toggle(option.id, event.target.checked)}
                />
                <button
                  type="button"
                  aria-pressed={selected.has(option.id)}
                  onClick={() => toggle(option.id, !selected.has(option.id))}
                >
                  <span>{option.name}</span>
                  {option.parentName && <small>{option.parentName}</small>}
                </button>
              </div>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
