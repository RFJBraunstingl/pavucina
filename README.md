# Pavucina
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