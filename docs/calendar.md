# Calendar

The Calendar combines date-based planning with a concrete 24-hour schedule. It
shows seven days on desktop and one day on mobile, and supports read-only
overlays from Google Calendar and Outlook Calendar.

## Planning tasks

- Review date-ranged or untimed tasks in the planning tray above the calendar.
- Review incomplete overdue tasks in the tray's separate overdue section.
- Drag a tray task into the calendar to assign its day and time.
- View only tasks with a valid single-day time slot in the calendar grid.
- Move through weeks on desktop or individual days on mobile, and return to
  today at any time.
- Hide completed tasks with **Hide done**.

## Adjusting scheduled work

- Drag tasks and native events between days and times. Moving a native event
  preserves its full duration, including events spanning midnight.
- Drag either edge to change the start or end. Multi-day events expose handles
  only at their actual start and end, including an end at midnight.
- Moves snap in 30-minute steps and edge adjustments in 15-minute steps.
  Arrow keys on a block or edge provide the same adjustments. Events retain a
  minimum duration of 15 minutes when resizing; imported events remain read-only.
- Select a task to edit its name, description, dates, and times; mark it done or
  reopen it; or delete it in the inspector.
- On mobile, task and event gestures are locked by default so the day can be scrolled
  safely. Use the lock button to enable or disable dragging and resizing;
  deliberate inspector edits remain available while locked.

## Creating events

- Unlock editing on mobile, then tap free time to create a native Pavucina event.
  Desktop editing is always unlocked; hovering over free time previews the event
  with a plus, and one click opens its form.
- Focus the calendar and press **Enter** for keyboard access, then enter the
  date and time in the form.
- Suggestions fill free gaps of up to one hour. In longer gaps, the start snaps
  to a quarter hour and the suggested duration stops at one hour, the next visible
  timed item, or midnight. Hidden calendars and all-day entries do not block suggestions.
- Enter a title, start/end dates and times, and optionally a location and
  description. The time zone is shown in the form. You can choose longer or
  overlapping times, including events spanning midnight.
- Select a native event to edit it or delete it with confirmation. These
  deliberate edits remain available while locked. Cancel and Escape discard the
  draft; hovering never saves an event.
- Native events appear independently of calendar-import settings and are saved
  with the workspace, including backups and revision history. Importing,
  disconnecting, or disabling external calendars does not remove native events.
- Native events do not send invitations or write to Google or Outlook. They
  currently support timed, non-recurring events and editing through the form.

## External calendars

- Connect multiple Google or Outlook calendar accounts with separate read-only
  OAuth permissions.
- Choose which personal, secondary, or shared calendars to use.
- Assign a color to every selected calendar so its appointments remain distinct
  from Pavucina tasks.
- Toggle selected calendars from the toolbar without disconnecting them.
- Display timed appointments in the weekly grid and all-day appointments above
  it.
- Open an appointment in its source calendar by selecting it. External events
  remain read-only and never become Pavucina tasks.
- Refresh appointments manually; they also reload when the week or a calendar
  setting changes.

By default, external events are fetched only for display. Authenticated users
can explicitly enable **Calendar event import** in Preferences. Import stores
events from every calendar available through the connected accounts as
first-class graph nodes, including calendars currently hidden from view. Each
event is linked to date nodes by separate start and end relationships and keeps
only its core details: name, description, location, dates, times, all-day
status, time zone, calendar display details, source link, update time, and
provider identifiers. Attendees and complete provider payloads are not stored.

Import covers roughly 30 days in the past and one year ahead. It uses Google
sync tokens and Microsoft Graph delta links, runs when the app opens and hourly
while it remains open, and can be refreshed manually. The current device time
zone determines imported dates and times. Disabling import deletes all imported
events and their history; disconnecting one account deletes that account's
imported events.

[← Documentation index](index.md)
