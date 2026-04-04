---
title: "Agent Teams"
session: "s09"
phase: 4
motto: "When the task is too big for one, delegate to teammates"
order: 9
readingTime: 25
beginnerConcepts:
  - question: "What makes a teammate different from a subagent?"
    answer: "A subagent is disposable — spawn, work, return summary, die. A teammate has a persistent identity, a lifecycle (IDLE, WORKING, SHUTDOWN), and a mailbox it checks between tasks. Teammates remember their role across invocations."
  - question: "What is an agent mailbox?"
    answer: "An append-only JSONL file on disk (e.g., .team/inbox/alice.jsonl). Any agent can write a message to Alice's inbox. When Alice's turn comes, she drains the file — reads all messages, then truncates it. Like email, but for agents."
  - question: "What is a team roster?"
    answer: "A JSON file (.team/config.json) listing all teammates, their names, roles, and current statuses. The lead agent reads this to know who's available and what each teammate specializes in."
---

## The Problem

Subagents are disposable: spawn, work, return summary, die. No identity, no memory between invocations. Background tasks run shell commands but can't make LLM-guided decisions.

Real teamwork needs: (1) persistent agents that outlive a single prompt, (2) identity and lifecycle management, (3) a communication channel between agents.

## The Solution

```
Teammate lifecycle:
  spawn -> WORKING -> IDLE -> WORKING -> ... -> SHUTDOWN

Communication:
  .team/
    config.json           <- team roster + statuses
    inbox/
      alice.jsonl         <- append-only, drain-on-read
      bob.jsonl
      lead.jsonl

          +--------+    send("alice","bob","...")    +--------+
          | lead   | -----------------------------> |  bob   |
          +--------+                                +--------+
               ^                                        |
               |           inbox/lead.jsonl             |
               +----------------------------------------+
```

## How It Works

1. The team config stores roster and statuses.

```python
import json, threading
from pathlib import Path

TEAM_DIR = Path(".team")
INBOX_DIR = TEAM_DIR / "inbox"
TEAM_DIR.mkdir(exist_ok=True)
INBOX_DIR.mkdir(exist_ok=True)

def init_team(teammates: list) -> None:
    config = {
        "teammates": [
            {"name": t["name"], "role": t["role"], "status": "IDLE"}
            for t in teammates
        ]
    }
    (TEAM_DIR / "config.json").write_text(json.dumps(config, indent=2))
    for t in teammates:
        (INBOX_DIR / f"{t['name']}.jsonl").touch()

def get_roster() -> list:
    config = json.loads((TEAM_DIR / "config.json").read_text())
    return config["teammates"]
```

2. Mailboxes are append-only JSONL files. Drain means read-and-truncate.

```python
def send_message(to: str, from_: str, content: str) -> str:
    inbox = INBOX_DIR / f"{to}.jsonl"
    msg = {"from": from_, "content": content}
    with open(inbox, "a") as f:
        f.write(json.dumps(msg) + "\n")
    return f"Message sent to {to}."

def drain_inbox(name: str) -> list:
    inbox = INBOX_DIR / f"{name}.jsonl"
    if not inbox.exists() or inbox.stat().st_size == 0:
        return []
    lines = inbox.read_text().strip().split("\n")
    inbox.write_text("")  # truncate after reading
    return [json.loads(l) for l in lines if l]
```

3. Each teammate runs its own agent loop in a thread.

```python
def teammate_loop(name: str, role: str) -> None:
    system = f"You are {name}, a {role}. Check your inbox for tasks."
    while True:
        inbox_messages = drain_inbox(name)
        if not inbox_messages:
            # IDLE: wait for work
            threading.Event().wait(timeout=2)
            continue

        update_status(name, "WORKING")
        history = [{"role": "user", "content":
            "\n".join(m["content"] for m in inbox_messages)}]
        # run agent loop with history
        result = run_agent(history, system)
        send_message("lead", name, result)
        update_status(name, "IDLE")
```

## What Changed From Background Tasks

| Component      | Before (Background Tasks) | After (Agent Teams)            |
|----------------|-----------------------|--------------------------------|
| Agents         | One main + bg threads | Lead + named teammates         |
| Communication  | Queue (one-way)       | Mailboxes (bidirectional)      |
| Identity       | None                  | Name, role, lifecycle status   |
| Coordination   | None                  | Roster + send/drain pattern    |

## Key Takeaway

The mailbox pattern is what makes agent teams work. Each teammate has a private inbox on disk — durable, concurrent-safe, and transparent. The lead delegates by sending a message; the teammate drains its inbox and responds. No shared memory, no locks needed — just files.
