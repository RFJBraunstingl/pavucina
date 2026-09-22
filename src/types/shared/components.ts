import type { ReactNode } from "react";

export type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export type SyncStatusProps = {
  error: string | null;
  onRetry: () => void;
};

export type GraphLoadingProps = SyncStatusProps & { label: string };
