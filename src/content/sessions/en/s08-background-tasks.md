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
walkthroughs:
  - title: "The Background Runner and Notification Queue"
    language: "python"
    code: |
      bg_queue: queue.Queue = queue.Queue()
      bg_counter = {"n": 0}

      def run_in_background(command: str, label: str = "") -> str:
          bg_counter["n"] += 1
          task_id = bg_counter["n"]
          label = label or f"bg-{task_id}"

          def worker():
              result = subprocess.run(
                  command, shell=True, capture_output=True,
                  text=True, timeout=300,
              )
              output = (result.stdout + result.stderr).strip()
              status = "done" if result.returncode == 0 else "failed"
              bg_queue.put({"task_id": task_id, "label": label,
                            "status": status, "output": output[:5000]})

          t = threading.Thread(target=worker, daemon=True)
          t.start()
          return f"Background task {task_id} ({label}) started."

      def drain_bg_queue(messages: list) -> list:
          results = []
          while not bg_queue.empty():
              completed = bg_queue.get_nowait()
              results.append({"type": "text", "text": (
                  f"<background_complete>\nTask {completed['task_id']} "
                  f"({completed['label']}): {completed['status']}\n"
                  f"{completed['output']}\n</background_complete>"
              )})
          if results:
              messages.append({"role": "user", "content": results})
          return messages
    steps:
      - lines: [1, 2]
        annotation: "`bg_queue` is a thread-safe Queue shared between the main thread and all worker threads. `bg_counter` uses a dict (not an int) so worker closures can increment it by reference."
      - lines: [4, 7]
        annotation: "`run_in_background()` is the tool the model calls. It increments the counter, assigns an ID and label, then immediately returns a 'started' message — the model doesn't wait for the result."
      - lines: [9, 17]
        annotation: "The `worker()` closure captures `task_id` and `label` from the outer scope. It runs the subprocess, captures stdout+stderr, determines success/failure from `returncode`, and pushes the result into `bg_queue`."
      - lines: [19, 21]
        annotation: "`daemon=True` means this thread automatically dies when the main program exits. No cleanup code needed. `t.start()` launches it immediately — the main thread is already free to do other work."
      - lines: [23, 34]
        annotation: "`drain_bg_queue()` is called before each LLM call. It empties the queue and injects completed results as a user message. The model sees them on its next turn and can react — all without any polling or waiting."
challenge:
  text: "Start a long-running background task (like `sleep 30 && echo done`) and keep chatting with the agent while it runs."
  hint: "The notification will inject into the next `tool_result` automatically"
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

## What Changed From [Tasks](/en/s07-task-system)

| Component      | Before (Tasks)     | After (Background Tasks)             |
|----------------|--------------------|--------------------------------------|
| Execution      | Sequential only    | Parallel background tasks            |
| Waiting        | Blocks agent loop  | Agent continues while bg runs        |
| Notification   | N/A                | Queue drain before each LLM call     |
| Tool           | None               | `run_in_background(command, label)`  |

## Key Takeaway

Background tasks are a concurrency pattern for the agent harness. The model doesn't need to understand threads — it just calls `run_in_background` and receives a notification when the task completes. The queue drain is the key: it's a single injection point that feeds completions back into the conversation at exactly the right moment.
