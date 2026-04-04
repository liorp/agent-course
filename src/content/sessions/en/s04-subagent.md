---
title: "Subagents"
session: "s04"
phase: 2
motto: "Break big tasks down; each subtask gets a clean context"
order: 4
readingTime: 20
beginnerConcepts:
  - question: "What is a subagent?"
    answer: "A child agent spawned by the parent with a fresh, empty messages array. It does its work, returns a short summary, and its entire conversation history is discarded. The parent stays clean."
  - question: "Why not just keep everything in one conversation?"
    answer: "Context is finite and expensive. If the parent asks 'what testing framework does this project use?', the child might read 5 files to find the answer. The parent only needs the one-line answer, not the 5 file contents."
  - question: "Can subagents spawn their own subagents?"
    answer: "In this design, no. The child gets all base tools except the 'task' tool, preventing recursive spawning. This keeps the architecture simple and avoids runaway agent chains."
  - question: "What happens to the subagent's work?"
    answer: "The subagent's side effects (files written, commands run) persist on disk. Only the conversation history is discarded. The parent gets a text summary of what was done."
walkthroughs:
  - title: "The spawn_subagent Function"
    language: "python"
    code: |
      def run_subagent(prompt: str) -> str:
          sub_messages = [{"role": "user", "content": prompt}]
          for _ in range(30):  # safety limit
              response = client.messages.create(
                  model=MODEL, system=SUBAGENT_SYSTEM,
                  messages=sub_messages,
                  tools=CHILD_TOOLS, max_tokens=8000,
              )
              sub_messages.append({"role": "assistant",
                                   "content": response.content})
              if response.stop_reason != "tool_use":
                  break
              results = []
              for block in response.content:
                  if block.type == "tool_use":
                      handler = TOOL_HANDLERS.get(block.name)
                      output = handler(**block.input)
                      results.append({"type": "tool_result",
                          "tool_use_id": block.id,
                          "content": str(output)[:50000]})
              sub_messages.append({"role": "user", "content": results})
          return "".join(
              b.text for b in response.content if hasattr(b, "text")
          ) or "(no summary)"
    steps:
      - lines: [1, 2]
        annotation: "The subagent starts with a completely fresh messages list containing only the delegated prompt. Nothing from the parent's history leaks in — true context isolation."
      - lines: [3, 3]
        annotation: "The safety limit caps the subagent at 30 iterations. Without this, a confused subagent could loop forever and consume unbounded API calls."
      - lines: [4, 8]
        annotation: "The subagent calls the same API but uses CHILD_TOOLS — the base tools without the 'task' tool. This prevents a child from recursively spawning more children."
      - lines: [11, 11]
        annotation: "The exit condition is identical to the parent loop. When the model stops requesting tool calls, the subagent is done and falls through to return its summary."
      - lines: [13, 21]
        annotation: "The inner tool loop is also identical to the parent. The subagent can call any child tool — read files, write files, run bash — and accumulate results just like the main agent."
      - lines: [22, 24]
        annotation: "Only the final text blocks from the last response are returned. The entire sub_messages history (potentially 30+ turns) is discarded. The parent receives a one-paragraph summary."
---

## The Problem

As the agent works, its messages array grows. Every file read, every bash output stays in context permanently. "What testing framework does this project use?" might require reading 5 files, but the parent only needs the answer: "pytest."

## The Solution

```
Parent agent                     Subagent
+------------------+             +------------------+
| messages=[...]   |             | messages=[]      | <-- fresh
|                  |  dispatch   |                  |
| tool: task       | ----------> | while tool_use:  |
|   prompt="..."   |             |   call tools     |
|                  |  summary    |   append results |
|   result = "..." | <---------- | return last text |
+------------------+             +------------------+

Parent context stays clean. Subagent context is discarded.
```

## How It Works

1. The parent gets a `task` tool. The child gets all base tools except `task` (no recursive spawning).

```python
PARENT_TOOLS = CHILD_TOOLS + [
    {"name": "task",
     "description": "Spawn a subagent with fresh context.",
     "input_schema": {
         "type": "object",
         "properties": {"prompt": {"type": "string"}},
         "required": ["prompt"],
     }},
]
```

2. The subagent starts with `messages=[]` and runs its own loop. Only the final text returns to the parent.

```python
def run_subagent(prompt: str) -> str:
    sub_messages = [{"role": "user", "content": prompt}]
    for _ in range(30):  # safety limit
        response = client.messages.create(
            model=MODEL, system=SUBAGENT_SYSTEM,
            messages=sub_messages,
            tools=CHILD_TOOLS, max_tokens=8000,
        )
        sub_messages.append({"role": "assistant",
                             "content": response.content})
        if response.stop_reason != "tool_use":
            break
        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input)
                results.append({"type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(output)[:50000]})
        sub_messages.append({"role": "user", "content": results})
    return "".join(
        b.text for b in response.content if hasattr(b, "text")
    ) or "(no summary)"
```

The child's entire message history (possibly 30+ tool calls) is discarded. The parent receives a one-paragraph summary as a normal `tool_result`.

## What Changed From [TodoWrite](/en/s03-todo-write)

| Component      | Before (TodoWrite) | After (Subagents)         |
|----------------|------------------|---------------------------|
| Tools          | 5                | 5 (base) + task (parent)  |
| Context        | Single shared    | Parent + child isolation  |
| Subagent       | None             | `run_subagent()` function |
| Return value   | N/A              | Summary text only         |

## Key Takeaway

Context isolation is the key insight. The subagent pattern lets the parent delegate messy, exploratory work without polluting its own context. The parent thinks in high-level goals; the child handles the details. Side effects persist on disk, but conversation noise is discarded.
