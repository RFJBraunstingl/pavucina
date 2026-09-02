# Pavucina

Checkout the app here: [https://pavucina.com](https://pavucina.com)

Pavucina is a task management application where tasks are stored hierarchically in a knowledge graph.
The knowledge graph is a directed acyclic graph where nodes represent tasks and edges represent dependencies between task
as well as other relationships such as assignments to people, deadlines, etc.

## Data model
- tasks are nodes in the knowledge graph
- tasks have a variable set of properties (only the property "name" is mandatory)
- properties can have data types such as
  - short text
  - long text
  - date
  - time
  - boolean
  - single select
  - multi select
- the user can configure the properties used by tasks
- some recommended properties are set by default:
  - description (long text)
  - planned done date (date)
  - planned start date (date)
  - planned start time (time)
  - planned end time (time)
  - done (boolean)
  - actual done date (date)
  - actual done time (time)
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

## Calender view
- page which shows an editable calendar
- tasks are displayed in the calendar with their planned start date and time and their planned end date and time
- tasks can be "scheduled" by dragging them to a new position in the calendar

## ToDo list view
- shows a checklist of tasks for the current day
- tasks are displayed in a list with their name and their planned start date and time
- tasks can be marked as done by clicking on a checkbox

## Storage
- pavucina can store the graph data in localStorage without an account (this also means the data is not synchronized)
- if the user is logged in, the data is stored in a MongoDB database backend
- in general the data consists of nodes and edges
- nodes are stored as JSON objects due to their dynamic schema
- edges are stored as graph object which holds all relation types and the IDs of referenced nodes

Authenticated graphs preserve every saved version. Each GitHub user has one
`github_<id>_graph_versions` collection and one `github_<id>_nodes` collection.
The latest version is selected directly from the versions collection; there is no
separate head, user, account, profile, or session collection.

Authenticated timeline preferences are stored in one shared `preferences`
collection with one document per user and a unique index on `userId`.

## GitHub login

1. Copy `.env.example` to `.env.local` and replace the placeholder values.
2. Create a GitHub OAuth App with callback URL
   `http://localhost:3000/api/auth/callback/github`.
3. Start MongoDB with `docker compose up -d`.
4. Start Pavucina with `npm run dev`.

Only the immutable numeric GitHub ID is kept as application identity. GitHub
profile fields and provider tokens are not persisted.

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