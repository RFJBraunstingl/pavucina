# Pavucina

Checkout the app here: [https://pavucina.rfj.dev](https://pavucina.rfj.dev)

Pavucina is a task management application where tasks are stored hierarchically in a knowledge graph.
The knowledge graph is a directed graph where nodes represent objects (such as tasks, dates, ...) and edges represent relationships between objects such as task X -(is Planned to be done by)-> date Y.

## Data model
- tasks are nodes in the knowledge graph
- imported calendar events are first-class, read-only event nodes
- event nodes use separate start-date and end-date relationships to date nodes
- marking a task as done also marks all of its descendants as done
- tasks have a variable set of properties (only the property "name" is mandatory)
- properties can have data types such as
  - short text
  - long text
  - date
  - time
  - boolean
  - single select
  - multi select
- the user can configure the properties used by tasks (TODO)
- some recommended properties are set by default:
  - description (long text)
  - planned done date (date)
  - planned start date (date)
  - planned start time (time)
  - planned end time (time)
  - completion and reopening history (relationships to date nodes)
- tasks are represented as json objects internally and stored in a data store
- task properties can be either represented as properties or as edges to nodes
- pavucina makes an educated guess about the type of properties based on the data type
  - some properties are nodes by default:
    - dates
    - select items
  - some properties are properties by default:
    - times
    - short text
    - long text

## Timeline view
- page which shows an editable timeline
- a time line consists of tasks and their child task along the vertical axis and a timeline on the x axis
- tasks along the vertical axis are displayed with their name
- tasks are indented based on their position in the hierarchy
- a new child task can be added by clicking on a plus icon at the task

## Calendar view
- page which shows an editable calendar
- tasks are displayed in the calendar with their planned start date and time and their planned end date and time
- tasks can be "scheduled" by dragging them to a new position in the calendar
- connected Google and Outlook calendars can be shown as temporary read-only overlays
- users can explicitly opt in to storing calendar events as read-only graph nodes; import uses provider sync cursors and covers about 30 days in the past and one year ahead

## ToDo list view
- shows a checklist of tasks for the current day
- tasks are displayed in a list with their name and their planned start date and time
- tasks can be marked as done or reopened with an action button

## Storage

Guest workspaces use IndexedDB, with one record per node or relationship.
Valid legacy localStorage data migrates automatically; the original is left intact.
Signed-in workspaces use standalone MongoDB. Edits send field and item changes,
and saves write only changed records before publishing a small atomic commit marker.
Independent edits merge; conflicting edits offer **Keep mine** or **Use saved**.
Pending edits persist in an account-scoped browser outbox across reloads.

`graph_records` and `graph_commits` hold graph revisions. Legacy `nodes` and
`edges` collections remain readable for migration and native history. Other
collections hold users, account links, settings, mailboxes, and calendar connections.
Imported calendar payload history is pruned; deletion markers remain for synchronization.
Preferences and calendar selections also update incrementally.

Full snapshots are used for initial loads, workspace creation, and explicit backup
restores. Invalid saved graphs still allow access to Preferences and backup import.
See [synchronization](docs/synchronization.md) for limits, migration, and checks.

## OAuth login

1. Copy `.env.example` to `.env.local` and replace the placeholder values.
2. Create a GitHub OAuth App with callback URL
   `http://localhost:3000/api/auth/callback/github`.
3. Create Google OAuth credentials, enable the Google Calendar API, enable the Google Mail API, and add
   authorized redirect URIs `http://localhost:3000/api/auth/callback/google`,
   `http://localhost:3000/api/auth/callback/gmail`, and
   `http://localhost:3000/api/auth/callback/google-calendar`.
4. Register a Microsoft Entra application for personal Microsoft accounts and
   accounts in any organizational directory. Add redirect URIs
   `http://localhost:3000/api/auth/callback/microsoft-entra-id`,
   `http://localhost:3000/api/auth/callback/outlook`, and
   `http://localhost:3000/api/auth/callback/outlook-calendar`, then copy its
   client ID and secret into the Microsoft variables in `.env.local`.
5. Start MongoDB with `docker compose up -d`.
6. Start Pavucina with `npm run dev`.

Only the provider name and immutable provider account ID are kept in the identity
mapping. Profile fields and provider tokens are not persisted. Provider accounts
use separate workspaces unless explicitly linked in Preferences. Microsoft login
requests identity access only; mailbox and calendar permissions are granted
separately when their respective connections are added.

## ToDo
- filter tasks by level
  - have one select field with all task levels and a second multi select with all tasks of that level
  - when the level changes, the filter is cleared and the multi select is populated with all tasks of that level
  - only selected tasks and their children are displayed
- implement configurability of task schema
- implement reasoning usecase
- implement ML usecase

## Why build this?
I thought it's interesting and I want to submit this as my project to the Knowledge Graph lecture at TU Vienna.

## Why the name?
Pavucina means "spiderweb" in Slovak - I don't speak the language myself, so I hope I don't use it completely wrong :)
If you imagine the task graph which organises the task data you can think of it as a spiderweb - a complex network of 
interconnected tasks with a root in the middle and branching out in all directions. 

It's meant to be an homage to my wife - her Grandmother is from Slovakia and Pavucina is one of the few words she picked up as a kid.

## License

Pavucina is available under the [Functional Source License 1.1 with an
Apache 2.0 Future License](LICENSE.md). Each version converts to Apache 2.0 two
years after it is made available.

This is the same model that [Sentry](https://sentry.io) uses as of this writing and basically means you are free to use, modify, and self-host the code as you wish. You are just not allowed to host Pavucina for other people and take money for it.
