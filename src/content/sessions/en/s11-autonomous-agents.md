---
title: "Autonomous Agents"
session: "s11"
phase: 4
motto: "Teammates scan the board and claim tasks themselves"
order: 11
readingTime: 30
beginnerConcepts:
  - question: "What is task claiming?"
    answer: "When a teammate atomically changes a task's status from 'pending' to 'in_progress' and writes its own name as the assignee. Because each task is a separate JSON file, two agents can't claim the same task simultaneously — one will win, the other retries."
  - question: "What is identity re-injection?"
    answer: "After context compression (Context Compact session) wipes the conversation history, the agent might forget who it is. The harness injects an <identity> block at the start of the compressed context: 'You are Alice, a backend specialist, working on task 3.' This restores the agent's sense of self."
  - question: "What is an idle cycle?"
    answer: "When a teammate finds no ready tasks, it waits briefly (sleeps 2 seconds) and then checks again. This polling loop is the mechanism that lets teammates work indefinitely without the lead assigning each task individually."
walkthroughs:
  - title: "Idle Cycle and Autonomous Task Claiming"
    language: "python"
    code: |
      def claim_task(name: str) -> dict | None:
          ready = get_ready_tasks()
          if not ready:
              return None
          task = ready[0]
          task_path = Path(".tasks") / f"task_{task['id']}.json"
          current = json.loads(task_path.read_text())
          if current["status"] != "pending":
              return None  # someone else claimed it
          current["status"] = "in_progress"
          current["assignee"] = name
          task_path.write_text(json.dumps(current, indent=2))
          return current

      def autonomous_teammate(name: str, role: str) -> None:
          system = build_system_with_identity(name, role)
          while True:
              process_inbox(name)
              if get_status(name) == "SHUTDOWN":
                  break
              task = claim_task(name)
              if task is None:
                  update_status(name, "IDLE")
                  time.sleep(2)
                  continue
              update_status(name, "WORKING")
              history = [{"role": "user", "content":
                  f"Work on task {task['id']}: {task['title']}"}]
              run_agent_with_identity(history, system, name, task["id"])
              complete_task(task["id"])
    steps:
      - lines: [1, 4]
        annotation: "`claim_task()` first finds all ready tasks. If none exist, it returns `None` immediately — the caller will put the agent into idle mode."
      - lines: [5, 9]
        annotation: "The optimistic concurrency check: re-read the task file and verify it's still `'pending'`. Two agents racing for the same task — one will find it already `'in_progress'` here and back off."
      - lines: [10, 13]
        annotation: "The claim is atomic at the file level. Setting status + assignee in one `write_text()` call means no other agent can partially observe the transition. The claimant returns the full task dict."
      - lines: [15, 20]
        annotation: "The outer loop checks inbox first on every iteration. This ensures shutdown requests are processed promptly even if the agent is in the middle of a long idle cycle."
      - lines: [21, 30]
        annotation: "The idle cycle: if no ready task is available, update status to `IDLE` and sleep 2 seconds. Otherwise, claim the task, run the full agent loop on it, then complete it and loop back to check for more."
challenge:
  text: "Set up 3 autonomous agents with an empty task board, then add 5 tasks. Watch them claim and complete."
  hint: "Each agent's `idle_cycle` will automatically scan and claim"
---

## The Problem

In the [Agent Teams](/en/s09-agent-teams) through [Team Protocols](/en/s10-team-protocols) sessions, teammates only work when explicitly told to. The lead must spawn each one with a specific prompt. 10 unclaimed tasks on the board? The lead assigns each one manually. Doesn't scale.

True autonomy: teammates scan the task board themselves, claim unclaimed tasks, work on them, then look for more.

One subtlety: after context compression ([Context Compact](/en/s06-context-compact) session), the agent might forget who it is. Identity re-injection fixes this.

## The Solution

```
Teammate lifecycle with idle cycle:

+-------+
| spawn |
+---+---+
    |
    v
+-------+   tool_use     +-------+
| WORK  | <------------- |  LLM  |
+---+---+                +-------+
    |                       ^
    | done or no tasks      |
    v                       |
+-------+   poll tasks      |
| IDLE  | --check_ready()---+
+-------+   (wait 2s)
    |
    | shutdown_req received
    v
+----------+
| SHUTDOWN |
+----------+
```

## How It Works

1. Claiming a task is atomic — write owner + status together.

```python
def claim_task(name: str) -> dict | None:
    """Find and claim the first ready task. Returns the task or None."""
    tasks_dir = Path(".tasks")
    ready = get_ready_tasks()  # reads all task files
    if not ready:
        return None

    task = ready[0]
    task_path = tasks_dir / f"task_{task['id']}.json"

    # Atomic claim: read current state, update only if still pending
    current = json.loads(task_path.read_text())
    if current["status"] != "pending":
        return None  # someone else claimed it

    current["status"] = "in_progress"
    current["assignee"] = name
    task_path.write_text(json.dumps(current, indent=2))
    return current
```

2. The teammate loop polls for tasks and works through them.

```python
def autonomous_teammate(name: str, role: str) -> None:
    system = build_system_with_identity(name, role)

    while True:
        # Check inbox for shutdown requests
        process_inbox(name)
        if get_status(name) == "SHUTDOWN":
            break

        task = claim_task(name)
        if task is None:
            # No ready tasks — idle cycle
            update_status(name, "IDLE")
            time.sleep(2)
            continue

        update_status(name, "WORKING")
        history = [{
            "role": "user",
            "content": f"Work on task {task['id']}: {task['title']}\n{task.get('description','')}"
        }]
        run_agent_with_identity(history, system, name, task["id"])
        complete_task(task["id"])
```

3. Identity re-injection wraps the hard_compact function from the [Context Compact](/en/s06-context-compact) session.

```python
def build_identity_block(name: str, role: str, task_id: int) -> str:
    return (
        f"<identity>\n"
        f"You are {name}, a {role}.\n"
        f"You are currently working on task {task_id}.\n"
        f"After completing it, claim another ready task from .tasks/.\n"
        f"</identity>"
    )

def hard_compact_with_identity(messages: list, name: str, role: str, task_id: int) -> list:
    # Regular hard compact...
    compacted = hard_compact(messages)
    # Prepend identity to the summary
    identity = build_identity_block(name, role, task_id)
    first_msg = compacted[0]
    first_msg["content"] = identity + "\n\n" + first_msg["content"]
    return compacted
```

## What Changed From [Team Protocols](/en/s10-team-protocols)

| Component      | Before (Team Protocols) | After (Autonomous Agents)           |
|----------------|------------------------|-------------------------------------|
| Task assignment| Lead sends explicitly   | Teammates claim autonomously        |
| Idle state     | Wait for message        | Poll ready tasks every 2s           |
| Identity       | No special handling     | Re-injected after compression       |
| Lead role      | Coordinator + assigner  | Coordinator only (board-level view) |

## Key Takeaway

Autonomous task claiming is what separates a team from a relay race. Each teammate is a self-directed agent that scans the board, claims what it can do, works, and loops. The lead's job shrinks to creating tasks and handling protocols. Identity re-injection is the glue that keeps the agent coherent across compression boundaries.
