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
walkthroughs:
  - title: "Teammate Mailbox Pattern"
    language: "python"
    code: |
      TEAM_DIR = Path(".team")
      INBOX_DIR = TEAM_DIR / "inbox"

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

      def teammate_loop(name: str, role: str) -> None:
          while True:
              inbox_messages = drain_inbox(name)
              if not inbox_messages:
                  threading.Event().wait(timeout=2)
                  continue
              update_status(name, "WORKING")
              result = run_agent(inbox_messages, name, role)
              send_message("lead", name, result)
              update_status(name, "IDLE")
    steps:
      - lines: [1, 2]
        annotation: "All team state lives in a `.team/` directory. Each teammate gets a JSONL file as their inbox — a simple, crash-safe, concurrent-friendly communication channel."
      - lines: [4, 9]
        annotation: "`send_message()` appends a JSON line to the recipient's inbox file. Opening with `'a'` (append) means concurrent writers can't corrupt each other — each `json.dumps` call is one atomic line."
      - lines: [11, 17]
        annotation: "`drain_inbox()` reads all pending messages and then truncates the file to empty. This read-and-truncate pattern is the key: messages are consumed once and not replayed on the next polling cycle."
      - lines: [19, 28]
        annotation: "`teammate_loop()` is the teammate's runtime. It polls its inbox every 2 seconds. When work arrives, it updates its status to `WORKING`, runs an agent loop to handle the messages, then sends the result back to lead and returns to `IDLE`."
diagram:
  title: "Agent Team Communication Flow"
  nodes:
    - { id: "lead", label: "Lead Agent", x: 300, y: 50, type: "agent" }
    - { id: "roster", label: "Team Roster", x: 100, y: 50, type: "data" }
    - { id: "alice", label: "Alice (Frontend)", x: 150, y: 200, type: "agent" }
    - { id: "bob", label: "Bob (Backend)", x: 450, y: 200, type: "agent" }
    - { id: "inbox_a", label: "alice.jsonl", x: 150, y: 310, type: "data" }
    - { id: "inbox_b", label: "bob.jsonl", x: 450, y: 310, type: "data" }
    - { id: "inbox_l", label: "lead.jsonl", x: 300, y: 310, type: "data" }
  edges:
    - { from: "lead", to: "roster", label: "read" }
    - { from: "lead", to: "inbox_a", label: "send task", animated: true }
    - { from: "lead", to: "inbox_b", label: "send task", animated: true }
    - { from: "alice", to: "inbox_a", label: "drain" }
    - { from: "bob", to: "inbox_b", label: "drain" }
    - { from: "alice", to: "inbox_l", label: "send result", animated: true }
    - { from: "bob", to: "inbox_l", label: "send result", animated: true }
    - { from: "lead", to: "inbox_l", label: "drain" }
  steps:
    - title: "1. Lead Reads Roster"
      description: "The lead agent reads the team roster to see who's available and what each teammate specializes in."
      activeNodes: ["lead", "roster"]
      activeEdges: [0]
    - title: "2. Lead Delegates Tasks"
      description: "The lead sends task messages to each teammate's mailbox. Alice gets the frontend work, Bob gets the backend work."
      activeNodes: ["lead", "inbox_a", "inbox_b"]
      activeEdges: [1, 2]
    - title: "3. Teammates Drain Inboxes"
      description: "Each teammate polls their inbox, reads all pending messages, and truncates the file. They switch to WORKING status."
      activeNodes: ["alice", "bob", "inbox_a", "inbox_b"]
      activeEdges: [3, 4]
    - title: "4. Teammates Return Results"
      description: "After completing their work, each teammate sends results to the lead's mailbox and returns to IDLE."
      activeNodes: ["alice", "bob", "inbox_l"]
      activeEdges: [5, 6]
    - title: "5. Lead Collects Results"
      description: "The lead drains its own inbox to read the results from all teammates and synthesize the final output."
      activeNodes: ["lead", "inbox_l"]
      activeEdges: [7]
challenges:
  - tier: "warmup"
    text: "Compare [Subagents](/en/s04-subagent) to [Agent Teams](/en/s09-agent-teams) teammates. List 3 specific scenarios where you'd use each. What's the key factor in choosing?"
    hint: "Subagents for one-off tasks with no memory needed. Teammates for ongoing work with identity and communication."
  - tier: "build"
    text: "Spawn two teammates with different specialties and have them collaborate on a task through the mailbox."
    hint: "Give them complementary system prompts like 'frontend expert' and 'backend expert'."
  - tier: "stretch"
    text: "Add a health monitoring system: the lead agent pings each teammate every 10 seconds. If a teammate doesn't respond within 5 seconds, mark it as UNRESPONSIVE and reassign its tasks."
    hint: "Use a special 'ping' message type and track last response time per teammate."
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

## What Changed From [Background Tasks](/en/s08-background-tasks)

| Component      | Before (Background Tasks) | After (Agent Teams)            |
|----------------|-----------------------|--------------------------------|
| Agents         | One main + bg threads | Lead + named teammates         |
| Communication  | Queue (one-way)       | Mailboxes (bidirectional)      |
| Identity       | None                  | Name, role, lifecycle status   |
| Coordination   | None                  | Roster + send/drain pattern    |

## Key Takeaway

The mailbox pattern is what makes agent teams work. Each teammate has a private inbox on disk — durable, concurrent-safe, and transparent. The lead delegates by sending a message; the teammate drains its inbox and responds. No shared memory, no locks needed — just files.
