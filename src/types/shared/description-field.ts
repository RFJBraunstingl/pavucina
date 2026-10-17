import type { TextareaHTMLAttributes } from "react";

export type TaskDescriptionFieldProps = Pick<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "rows" | "placeholder" | "aria-label" | "disabled"
> & { taskId: string };
