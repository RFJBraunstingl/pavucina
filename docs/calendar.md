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

- Drag tasks between days and times.
- Drag either edge of a task to change its start or end time.
- Select a task to edit its name, description, dates, and times; mark it done or
  reopen it; or delete it in the inspector.
- On mobile, task gestures are locked by default so the day can be scrolled
  safely. Use the lock button to enable or disable dragging and resizing;
  deliberate inspector edits remain available while locked.

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
