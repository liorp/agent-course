---
title: "Tasks"
session: "s07"
phase: 3
motto: "Break big goals into small tasks, order them, persist to disk"
order: 7
readingTime: 25
beginnerConcepts:
  - question: "What is a task graph (DAG)?"
    answer: "A Directed Acyclic Graph where each task can list other tasks it depends on (blockedBy). Task 4 can't start until tasks 2 and 3 are done. This models real-world dependencies between work items."
  - question: "Why persist tasks to disk instead of memory?"
    answer: "Context compression (Context Compact session) can wipe the in-memory todo list. Tasks saved as JSON files on disk survive compression, crashes, and even multi-agent handoffs — any agent can pick up where another left off."
  - question: "What does 'ready' mean for a task?"
    answer: "A task is ready when its status is 'pending' AND all tasks in its blockedBy list are 'completed'. The TaskManager computes ready tasks automatically so the agent just asks 'what can I do now?'"
walkthroughs:
  - title: "Task CRUD and Dependency Resolution"
    language: "python"
    code: |
      class TaskManager:
          def __init__(self, tasks_dir: str = ".tasks"):
              self.dir = Path(tasks_dir)
              self.dir.mkdir(exist_ok=True)

          def _load_all(self) -> list:
              tasks = []
              for f in sorted(self.dir.glob("task_*.json")):
                  tasks.append(json.loads(f.read_text()))
              return tasks

          def create(self, title: str, blocked_by: list = None) -> dict:
              tasks = self._load_all()
              new_id = max((t["id"] for t in tasks), default=0) + 1
              task = {"id": new_id, "title": title,
                      "status": "pending", "blockedBy": blocked_by or []}
              path = self.dir / f"task_{new_id}.json"
              path.write_text(json.dumps(task, indent=2))
              return task

          def ready(self) -> list:
              tasks = self._load_all()
              done_ids = {t["id"] for t in tasks if t["status"] == "completed"}
              return [
                  t for t in tasks
                  if t["status"] == "pending"
                  and all(dep in done_ids for dep in t.get("blockedBy", []))
              ]
    steps:
      - lines: [1, 4]
        annotation: "Each `TaskManager` instance points to a `.tasks/` directory. `mkdir(exist_ok=True)` means the first call creates the directory automatically — no setup step required."
      - lines: [6, 10]
        annotation: "`_load_all()` reads every `task_*.json` file on disk. Because tasks are files, they survive context compression, agent crashes, and even handoffs between different agents."
      - lines: [12, 19]
        annotation: "`create()` auto-increments the ID by finding the current maximum. Each task is written as a standalone JSON file — `task_1.json`, `task_2.json`, etc. The `blockedBy` list is stored directly in the file."
      - lines: [21, 27]
        annotation: "`ready()` is the dependency resolver. It first collects all completed task IDs into a set (`done_ids`), then filters for tasks that are `pending` AND have all their `blockedBy` IDs in that set. This is the core of the DAG traversal."
challenge:
  text: "Create a task graph with 5+ tasks and at least 2 dependency chains. Run get_ready_tasks to see what can execute."
  hint: "Use add_dependency to link tasks, then check which have all deps satisfied"
---

## The Problem

The [TodoWrite](/en/s03-todo-write) session's TodoManager is a flat checklist in memory: no ordering, no dependencies, no status beyond done-or-not. Real goals have structure — task B depends on task A, tasks C and D can run in parallel, task E waits for both C and D.

Without explicit relationships, the agent can't tell what's ready, what's blocked, or what can run concurrently. And because the list lives only in memory, context compression ([Context Compact](/en/s06-context-compact) session) wipes it clean.

## The Solution

Promote the checklist into a **task graph** persisted to disk. Each task is a JSON file with status and dependencies (`blockedBy`). The graph answers three questions at any moment:

- **What's ready?** — tasks with `pending` status and empty `blockedBy`
- **What's blocked?** — tasks waiting on unfinished dependencies
- **What's done?** — `completed` tasks, whose completion automatically unblocks dependents

```
.tasks/
  task_1.json  {"id":1, "status":"completed"}
  task_2.json  {"id":2, "blockedBy":[1], "status":"pending"}
  task_3.json  {"id":3, "blockedBy":[1], "status":"pending"}
  task_4.json  {"id":4, "blockedBy":[2,3], "status":"pending"}

Task graph (DAG):
  1 --> 2 --> 4
  1 --> 3 --> 4

When task 1 completes: 2 and 3 become ready.
When 2 and 3 complete: 4 becomes ready.
```

## How It Works

1. Each task is a JSON file. The TaskManager reads all files and builds the graph in memory.

```python
import json
from pathlib import Path

class TaskManager:
    def __init__(self, tasks_dir: str = ".tasks"):
        self.dir = Path(tasks_dir)
        self.dir.mkdir(exist_ok=True)

    def _load_all(self) -> list:
        tasks = []
        for f in sorted(self.dir.glob("task_*.json")):
            tasks.append(json.loads(f.read_text()))
        return tasks

    def create(self, title: str, blocked_by: list = None) -> dict:
        tasks = self._load_all()
        new_id = max((t["id"] for t in tasks), default=0) + 1
        task = {"id": new_id, "title": title,
                "status": "pending", "blockedBy": blocked_by or []}
        path = self.dir / f"task_{new_id}.json"
        path.write_text(json.dumps(task, indent=2))
        return task

    def complete(self, task_id: int) -> str:
        path = self.dir / f"task_{task_id}.json"
        task = json.loads(path.read_text())
        task["status"] = "completed"
        path.write_text(json.dumps(task, indent=2))
        return f"Task {task_id} completed."

    def ready(self) -> list:
        tasks = self._load_all()
        done_ids = {t["id"] for t in tasks if t["status"] == "completed"}
        return [
            t for t in tasks
            if t["status"] == "pending"
            and all(dep in done_ids for dep in t.get("blockedBy", []))
        ]
```

2. The agent gets three tools: `create_task`, `complete_task`, and `list_ready_tasks`.

```python
TASK_MANAGER = TaskManager()

TOOL_HANDLERS = {
    # ...base tools...
    "create_task": lambda **kw: str(TASK_MANAGER.create(
        kw["title"], kw.get("blocked_by", []))),
    "complete_task": lambda **kw: TASK_MANAGER.complete(kw["task_id"]),
    "list_ready_tasks": lambda **kw: json.dumps(TASK_MANAGER.ready(), indent=2),
}
```

3. The agent's workflow becomes: create the task graph, then work through ready tasks one by one.

```
Agent: "I need to refactor auth module."

1. create_task("Read current auth code")            -> id=1
2. create_task("Write new AuthManager",  blocked_by=[1]) -> id=2
3. create_task("Update tests", blocked_by=[2])      -> id=3
4. create_task("Update docs",  blocked_by=[2])      -> id=4

list_ready_tasks() -> [task 1]

[works on task 1]
complete_task(1)

list_ready_tasks() -> [task 2]
...
```

## What Changed From [Context Compact](/en/s06-context-compact)

| Component      | Before (Context Compact) | After (Tasks)                    |
|----------------|----------------------|----------------------------------|
| Planning       | In-memory checklist  | Disk-persisted task graph        |
| Dependencies   | None                 | blockedBy list                   |
| Parallelism    | Sequential only      | Explicit parallel-ready detection|
| Survives       | Nothing              | Compression, crashes, handoffs   |

## Key Takeaway

Persisting tasks to disk is what makes the agent's plans durable. The task graph encodes not just *what* to do but *in what order* and *what can run in parallel*. Combined with the [Context Compact](/en/s06-context-compact) session's compression, the agent can work on truly large goals across many turns without losing track.
