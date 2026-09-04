export const DEFAULT_TASK_COLUMN_WIDTH = 286;
export const MIN_TASK_COLUMN_WIDTH = 200;
export const MAX_TASK_COLUMN_WIDTH = 640;

export function isTaskColumnWidth(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_TASK_COLUMN_WIDTH &&
    value <= MAX_TASK_COLUMN_WIDTH
  );
}

export function resizedTaskColumnWidth(width: number, change: number) {
  return Math.min(
    MAX_TASK_COLUMN_WIDTH,
    Math.max(MIN_TASK_COLUMN_WIDTH, Math.round(width + change)),
  );
}
