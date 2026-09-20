import json
import re
from zipfile import BadZipFile, ZipFile

NAME_RELATION = "pavucina:nameToken"
DESCRIPTION_RELATION = "pavucina:descriptionToken"
TOKEN_PATTERN = re.compile(r"[^\W_]+", re.UNICODE)
MAX_BACKUP_BYTES = 101 * 1024 * 1024
BACKUP_FILES = {"nodes.json", "edges.json", "inbox.json", "settings.json"}


def node_entity(node_id):
    return f"node:{node_id}"


def load_graph_export(path):
    try:
        if not path.is_file() or not 0 < path.stat().st_size <= MAX_BACKUP_BYTES:
            raise ValueError("Backup ZIP is empty or too large")
        with ZipFile(path) as archive:
            files = [entry for entry in archive.infolist() if entry.filename in BACKUP_FILES]
            names = [entry.filename for entry in files]
            if len(names) != len(set(names)):
                raise ValueError("Backup ZIP contains duplicate files")
            if sum(entry.file_size for entry in files) > MAX_BACKUP_BYTES:
                raise ValueError("Backup ZIP content is too large")
            nodes = _read_list(archive, "nodes.json", required=True)
            edges = _read_list(archive, "edges.json", required=True)
            inbox = _read_list(archive, "inbox.json", required=False)
    except (BadZipFile, OSError) as error:
        raise ValueError(f"Could not read backup ZIP: {error}") from error

    graph_ids = _validate_nodes(nodes, "nodes.json")
    inbox_ids = _validate_nodes(inbox, "inbox.json", tasks_only=True)
    if graph_ids & inbox_ids:
        raise ValueError("Node IDs must be unique across nodes.json and inbox.json")
    _validate_edges(edges, graph_ids)
    return nodes, edges, inbox


def build_labeled_triples(nodes, edges, inbox):
    triples = {
        (node_entity(edge["sourceId"]), edge["type"], node_entity(edge["targetId"]))
        for edge in edges
    }
    for task in [*graph_tasks(nodes), *inbox]:
        properties = task["properties"]
        _add_text_triples(triples, task["id"], NAME_RELATION, properties["name"])
        _add_text_triples(
            triples,
            task["id"],
            DESCRIPTION_RELATION,
            properties.get("description", ""),
        )
    return sorted(triples)


def graph_tasks(nodes):
    return [node for node in nodes if node["type"] == "task"]


def task_details(nodes, edges, task_id):
    tasks = {task["id"]: task for task in graph_tasks(nodes)}
    parents = {
        edge["targetId"]: edge["sourceId"]
        for edge in edges
        if edge["type"] == "child"
    }
    task = tasks[task_id]
    names = [task["properties"]["name"]]
    seen = {task_id}
    parent_id = parents.get(task_id)
    while parent_id in tasks and parent_id not in seen:
        seen.add(parent_id)
        names.insert(0, tasks[parent_id]["properties"]["name"])
        parent_id = parents.get(parent_id)
    return {"id": task_id, "name": names[-1], "path": " › ".join(names)}


def _read_list(archive, name, required):
    try:
        raw = archive.read(name)
    except KeyError:
        if required:
            raise ValueError(f"Backup is missing {name}") from None
        return []
    try:
        value = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"{name} is not valid JSON") from error
    if not isinstance(value, list):
        raise ValueError(f"{name} must contain a JSON array")
    return value


def _validate_nodes(nodes, source, tasks_only=False):
    ids = set()
    for node in nodes:
        valid = (
            isinstance(node, dict)
            and isinstance(node.get("id"), str)
            and node["id"]
            and isinstance(node.get("type"), str)
            and isinstance(node.get("properties"), dict)
        )
        if not valid or (tasks_only and node.get("type") != "task"):
            raise ValueError(f"{source} contains an invalid node")
        if node["id"] in ids:
            raise ValueError(f"{source} contains duplicate node IDs")
        if node["type"] == "task":
            name = node["properties"].get("name")
            description = node["properties"].get("description")
            if not isinstance(name, str) or not name.strip():
                raise ValueError(f"{source} contains a task without a name")
            if description is not None and not isinstance(description, str):
                raise ValueError(f"{source} contains a task with an invalid description")
        ids.add(node["id"])
    return ids


def _validate_edges(edges, graph_ids):
    for edge in edges:
        valid = isinstance(edge, dict) and all(
            isinstance(edge.get(key), str) and edge[key]
            for key in ("type", "sourceId", "targetId")
        )
        if not valid:
            raise ValueError("edges.json contains an invalid relationship")
        if edge["sourceId"] not in graph_ids or edge["targetId"] not in graph_ids:
            raise ValueError("edges.json contains a relationship with a missing endpoint")


def _add_text_triples(triples, task_id, relation, value):
    tokens = set(TOKEN_PATTERN.findall(value.casefold()))
    if value.strip() and not tokens:
        tokens.add(value.casefold().strip())
    triples.update(
        (node_entity(task_id), relation, f"token:{token}") for token in tokens
    )
