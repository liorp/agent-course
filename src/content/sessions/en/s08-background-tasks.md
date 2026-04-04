---
title: "Background Tasks"
session: "s08"
phase: 3
motto: "Run slow operations in the background; the agent keeps thinking"
order: 8
readingTime: 20
beginnerConcepts:
  - question: "What is a blocking operation?"
    answer: "A command that makes the program wait until it finishes before doing anything else. 'npm install' can take 2 minutes. With blocking execution, the agent sits idle the entire time — wasting wall-clock time and user patience."
  - question: "What is a daemon thread?"
    answer: "A background thread that runs independently of the main program. When set as daemon=True in Python, it automatically stops when the main program exits, so you don't need to manage cleanup."
  - question: "How does the agent learn a background task finished?"
    answer: "The background thread pushes a result into a shared queue. Before each LLM call, the agent drains that queue and injects any completed results as messages. The model reads them on its next turn."
---

## The Problem

Some commands take minutes: `npm install`, `pytest`, `docker build`. With a blocking loop, the model sits idle waiting. If the user asks "install dependencies and while that runs, create the config file," the agent does them sequentially, not in parallel.

## The Solution

```
Main thread                Background thread
+-----------------+        +-----------------+
| agent loop      |        | subprocess runs |
| ...             |        | ...             |
| [LLM call] <---+------- | enqueue(result) |
|  ^drain queue   |        +-----------------+
+-----------------+

Timeline:
Agent --[spawn A]--[spawn B]--[other work]--[drain]--
             |          |                       ^
             v          v                       |
          [A runs]   [B runs]      (parallel)   |
             |          |                       |
             +----------+----- results injected-+
```

## How It Works

1. A shared queue collects completed background task results.

```python
import threading
import subprocess
import queue

bg_queue: queue.Queue = queue.Queue()
bg_counter = {"n": 0}

def run_in_background(command: str, label: str = "") -> str:
    bg_counter["n"] += 1
    task_id = bg_counter["n"]
    label = label or f"bg-{task_id}"

    def worker():
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True,
                text=True, timeout=300,
            )
            output = (result.stdout + result.stderr).strip()
            status = "done" if result.returncode == 0 else "failed"
        except subprocess.TimeoutExpired:
            output = "Timeout after 300s"
            status = "failed"
        bg_queue.put({
            "task_id": task_id,
            "label": label,
            "status": status,
            "output": output[:5000],
        })

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return f"Background task {task_id} ({label}) started. You'll be notified when done."
```

2. Before each LLM call, drain the queue and inject completed results.

```python
def drain_bg_queue(messages: list) -> list:
    results = []
    while not bg_queue.empty():
        completed = bg_queue.get_nowait()
        results.append({
            "type": "text",
            "text": (
                f"<background_complete>\n"
                f"Task {completed['task_id']} ({completed['label']}): "
                f"{completed['status']}\n"
                f"{completed['output']}\n"
                f"</background_complete>"
            ),
        })
    if results:
        messages.append({"role": "user", "content": results})
    return messages
```

3. The main loop calls `drain_bg_queue` before each LLM call.

```python
def agent_loop(messages: list):
    while True:
        messages = drain_bg_queue(messages)  # inject any completions
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

## What Changed From Tasks

| Component      | Before (Tasks)     | After (Background Tasks)             |
|----------------|--------------------|--------------------------------------|
| Execution      | Sequential only    | Parallel background tasks            |
| Waiting        | Blocks agent loop  | Agent continues while bg runs        |
| Notification   | N/A                | Queue drain before each LLM call     |
| Tool           | None               | `run_in_background(command, label)`  |

## Key Takeaway

Background tasks are a concurrency pattern for the agent harness. The model doesn't need to understand threads — it just calls `run_in_background` and receives a notification when the task completes. The queue drain is the key: it's a single injection point that feeds completions back into the conversation at exactly the right moment.
