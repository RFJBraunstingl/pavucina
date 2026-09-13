# Preferences

Preferences controls scheduling behavior, account links, data backups, and
access to Pavucina's legal information.

## Scheduling mode

- **Leaf tasks only** allows only tasks without children to own a schedule.
  Parent dates are calculated from their descendants.
- **All tasks** allows every task to keep and display its own schedule.
- Switching to leaf-only scheduling requires confirmation because dates and
  times stored directly on parent tasks are removed.

## Connected accounts

- Sign in with GitHub, Google, or Microsoft to synchronize a workspace.
- Link additional sign-in providers so they open the same workspace.
- If the account being linked already owns another workspace, Pavucina asks
  before replacing that workspace and its connected integrations.

Mailbox and calendar connections are managed from the Inbox and Calendar pages,
not from Preferences.

## Calendar event import

Calendar connections are read-only overlays by default. Authenticated users can
opt in to storing events in the knowledge graph. The setting imports every
calendar exposed by each connected Google or Outlook account, regardless of its
display toggle, and synchronizes at app startup, hourly while the app is open,
and on manual refresh. Turning the setting off deletes the imported events and
their revision history. Calendar credentials and sync cursors are never included
in workspace backups.

## Backup and restore

- Download graph nodes (including imported events), relationships, scratchpad
  items, and settings as a ZIP file.
- Restore a previous ZIP backup after confirming that it will replace the
  current tasks, relationships, and settings.
- Backups do not contain sign-in identities or mailbox and calendar credentials.

## Legal information

Preferences links to the Privacy Policy, Terms of Service, and Imprint.

[← Documentation index](index.md)
