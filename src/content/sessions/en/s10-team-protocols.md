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
walkthroughs:
  - title: "The Request-Response Protocol"
    language: "python"
    code: |
      def new_req_id() -> str:
          return uuid.uuid4().hex[:8]

      def send_shutdown_request(teammate_name: str) -> str:
          req_id = new_req_id()
          send_message(teammate_name, "lead", json.dumps({
              "type": "shutdown_req",
              "req_id": req_id,
          }))
          return req_id

      def handle_shutdown_request(msg: dict, name: str) -> None:
          req_id = msg["req_id"]
          currently_working = get_status(name) == "WORKING"
          send_message("lead", name, json.dumps({
              "type": "shutdown_resp",
              "req_id": req_id,
              "approved": not currently_working,
              "reason": "finishing current task" if currently_working else "ready to shutdown",
          }))
          if not currently_working:
              update_status(name, "SHUTDOWN")

      def process_inbox(name: str) -> None:
          messages = drain_inbox(name)
          for msg_raw in messages:
              try:
                  msg = json.loads(msg_raw["content"])
                  msg_type = msg.get("type", "plain")
              except (json.JSONDecodeError, KeyError):
                  msg_type = "plain"
              if msg_type == "shutdown_req":
                  handle_shutdown_request(msg, name)
              else:
                  start_task(msg_raw["content"], name)
    steps:
      - lines: [1, 2]
        annotation: "`new_req_id()` generates an 8-character hex string from a UUID. Short enough to include in messages without bloating them, unique enough to avoid collisions across concurrent agents."
      - lines: [4, 10]
        annotation: "`send_shutdown_request()` sends a typed JSON message with a `req_id` and immediately returns that ID to the caller. The caller stores it to match against the incoming response."
      - lines: [12, 22]
        annotation: "`handle_shutdown_request()` is the teammate's response handler. It echoes back the same `req_id` so the lead can match request to response. If the teammate is idle, it approves and updates its own status to `SHUTDOWN`."
      - lines: [24, 35]
        annotation: "`process_inbox()` is the message dispatcher. It tries to parse each message as typed JSON. If it has a `'type'` field, it routes to the appropriate handler. Unknown or plain messages fall through to `start_task()`."
challenge:
  text: "Implement a plan-approval flow: lead proposes a plan, teammate reviews and approves or rejects."
  hint: "Use `REQUEST`/`RESPONSE` message types with a `\"plan\"` field"
---

## The Problem

In the [Agent Teams](/en/s09-agent-teams) session, teammates work and communicate but lack structured coordination:

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

## What Changed From [Agent Teams](/en/s09-agent-teams)

| Component      | Before (Agent Teams) | After (Team Protocols)            |
|----------------|--------------------|-----------------------------------|
| Shutdown       | Kill thread        | Graceful req/resp handshake       |
| Plan review    | None               | Plan request + lead approval      |
| Message format | Free text          | Typed JSON with req_id            |
| Safety         | Low                | Explicit checkpoints for risk     |

## Key Takeaway

Protocols transform free-form communication into structured negotiation. The req_id pattern is the key — it lets you match a response to the request that caused it, even when messages arrive out of order or with delays. The same two-step pattern (send request, await response with matching ID) works for any coordination need.
