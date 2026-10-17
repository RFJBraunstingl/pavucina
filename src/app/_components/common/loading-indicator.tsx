import type { LoadingIndicatorProps } from "@/types/shared/components";

export default function LoadingIndicator({ active, label }: LoadingIndicatorProps) {
  return (
    <span className="loading-indicator" role="status">
      <span
        className={`loading-indicator-icon${active ? " is-active" : ""}`}
        aria-hidden="true"
      />
      <span className="sr-only">{active ? label : ""}</span>
    </span>
  );
}
