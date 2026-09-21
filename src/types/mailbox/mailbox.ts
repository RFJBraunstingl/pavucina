import type { OAuthCredentials } from "@/types/auth/oauth";

export type MailboxSource = "gmail" | "outlook";

export type MailboxCredentials = OAuthCredentials;

export type MailboxConnectionDocument = {
  _id: string;
  userId: string;
  source: MailboxSource;
  providerAccountId: string;
  address: string;
  credentials: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MailboxConnectionSummary = {
  id: string;
  source: MailboxSource;
  address: string;
  status: "connected" | "error";
  error?: string;
};

export type MailMessage = {
  connectionId: string;
  source: MailboxSource;
  account: string;
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  preview: string;
};

export type MailTaskOrigin = Pick<
  MailMessage,
  "connectionId" | "source" | "id"
>;

export type MailboxesResponse = {
  available: Record<MailboxSource, boolean>;
  connections: MailboxConnectionSummary[];
  messages: MailMessage[];
};
