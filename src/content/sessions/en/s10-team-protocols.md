---
title: "Team Protocols"
session: "s10"
phase: 4
motto: "Teammates need shared communication rules"
order: 10
readingTime: 30
beginnerConcepts:
  - question: "What is a protocol in agent communication?"
    answer: "A structured handshake — one side sends a request with a unique ID, the other responds referencing that ID. Protocols prevent misunderstandings: 'Are you done with task X?' / 'Yes, here is result X.' Rather than free-form messages."
  - question: "What is the shutdown protocol?"
    answer: "A two-step handshake where the lead sends a shutdown_req (with a unique ID), and the teammate either approves (finishes current work and exits) or rejects (still busy, try later). This prevents killing a teammate mid-task and leaving files corrupted."
  - question: "What is plan approval?"
    answer: "Before a teammate starts a high-risk task, it sends its plan to the lead for review. The lead can approve (proceed) or reject (revise the plan). This creates a human-in-the-loop checkpoint for dangerous operations."
---

## The Problem

In the Agent Teams session, teammates work and communicate but lack structured coordination:

**Shutdown**: Killing a thread leaves files half-written and config.json stale. You need a handshake: the lead requests, the teammate approves (finish and exit) or rejects (keep working).

**Plan approval**: When the lead says "refactor the auth module," the teammate starts immediately. For high-risk changes, the lead should review the plan first.

Both share the same structure: one side sends a request with a unique ID, the other responds referencing that ID.

## The Solution

```
Shutdown Protocol            Plan Approval Protocol
==================           ======================

Lead             Teammate    Teammate           Lead
  |                 |           |                 |
  |--shutdown_req-->|           |--plan_req------>|
  | {req_id:"abc"}  |           | {req_id:"xyz"}  |
  |                 |           |                 |
  |<--shutdown_resp-|           |<--plan_resp-----|
  | {req_id:"abc",  |           | {req_id:"xyz",  |
  |  approved:true} |           |  approved:false,|
  |                 |           |  feedback:"..."}|
```

## How It Works

1. Request IDs are short UUIDs. Both request and response carry the same ID.

```python
import uuid

def new_req_id() -> str:
    return uuid.uuid4().hex[:8]

def send_shutdown_request(teammate_name: str) -> str:
    req_id = new_req_id()
    send_message(teammate_name, "lead", json.dumps({
        "type": "shutdown_req",
        "req_id": req_id,
    }))
    return req_id  # caller stores this to match the response

def handle_shutdown_request(msg: dict, name: str) -> None:
    req_id = msg["req_id"]
    # Teammate decides: approve if idle, reject if mid-task
    currently_working = get_status(name) == "WORKING"
    send_message("lead", name, json.dumps({
        "type": "shutdown_resp",
        "req_id": req_id,
        "approved": not currently_working,
        "reason": "finishing current task" if currently_working else "ready to shutdown",
    }))
    if not currently_working:
        update_status(name, "SHUTDOWN")
```

2. Plan approval uses the same pattern, extended with structured plan content.

```python
def request_plan_approval(plan: str, task_id: int) -> str:
    req_id = new_req_id()
    send_message("lead", "self", json.dumps({
        "type": "plan_req",
        "req_id": req_id,
        "task_id": task_id,
        "plan": plan,
    }))
    return req_id

def handle_plan_request(msg: dict) -> dict:
    """Lead reviews and approves/rejects the plan."""
    # Lead's agent loop sees this in its inbox and decides
    req_id = msg["req_id"]
    teammate = msg.get("from")
    # The LLM reviews the plan and calls approve_plan or reject_plan tool
    return {"req_id": req_id, "teammate": teammate, "plan": msg["plan"]}
```

3. The teammate's loop checks message types before acting.

```python
def process_inbox(name: str) -> None:
    messages = drain_inbox(name)
    for msg_raw in messages:
        try:
            msg = json.loads(msg_raw["content"])
            msg_type = msg.get("type", "plain")
        except (json.JSONDecodeError, KeyError):
            msg_type = "plain"
            msg = msg_raw

        if msg_type == "shutdown_req":
            handle_shutdown_request(msg, name)
        elif msg_type == "plan_resp":
            handle_plan_response(msg, name)
        else:
            # Plain task assignment — start working
            start_task(msg_raw["content"], name)
```

## What Changed From Agent Teams

| Component      | Before (Agent Teams) | After (Team Protocols)            |
|----------------|--------------------|-----------------------------------|
| Shutdown       | Kill thread        | Graceful req/resp handshake       |
| Plan review    | None               | Plan request + lead approval      |
| Message format | Free text          | Typed JSON with req_id            |
| Safety         | Low                | Explicit checkpoints for risk     |

## Key Takeaway

Protocols transform free-form communication into structured negotiation. The req_id pattern is the key — it lets you match a response to the request that caused it, even when messages arrive out of order or with delays. The same two-step pattern (send request, await response with matching ID) works for any coordination need.
