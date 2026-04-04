---
title: "TodoWrite"
session: "s03"
phase: 2
motto: "An agent without a plan drifts"
order: 3
readingTime: 20
beginnerConcepts:
  - question: "What is a TodoManager?"
    answer: "A simple class that keeps a list of tasks with statuses (pending, in_progress, done). It forces the model to write down its plan before executing, so it doesn't lose track of what to do next."
  - question: "Why only one task in_progress at a time?"
    answer: "It forces sequential focus. The model must finish or update the current task before moving on. This prevents the agent from starting 5 things and finishing none."
  - question: "What's a nag reminder?"
    answer: "A small text injection (<reminder>) added to the conversation if the model hasn't updated its todo list in 3+ rounds. It nudges the model to stay on track without the user having to intervene."
  - question: "How is this different from a regular checklist?"
    answer: "A regular checklist is static text the model might ignore. TodoWrite is a tool the model actively calls to update statuses. The harness tracks rounds and injects reminders, making it a feedback loop, not just a note."
walkthroughs:
  - title: "The TodoManager Class"
    language: "python"
    code: |
      class TodoManager:
          def update(self, items: list) -> str:
              validated, in_progress_count = [], 0
              for item in items:
                  status = item.get("status", "pending")
                  if status == "in_progress":
                      in_progress_count += 1
                  validated.append({"id": item["id"], "text": item["text"],
                                    "status": status})
              if in_progress_count > 1:
                  raise ValueError("Only one task can be in_progress")
              self.items = validated
              return self.render()

      if rounds_since_todo >= 3 and messages:
          last = messages[-1]
          if last["role"] == "user" and isinstance(last.get("content"), list):
              last["content"].insert(0, {
                  "type": "text",
                  "text": "<reminder>Update your todos.</reminder>",
              })
    steps:
      - lines: [1, 2]
        annotation: "TodoManager is a simple class. The update() method is the only write operation — the model calls it with the full list of items every time it wants to change anything."
      - lines: [3, 9]
        annotation: "Each item is validated and re-packed with only the fields we care about. Extra fields the model might hallucinate are silently stripped."
      - lines: [10, 12]
        annotation: "The one-in-progress constraint is enforced here. If the model tries to set two tasks in_progress simultaneously, it gets an error and must retry with a corrected list."
      - lines: [13, 13]
        annotation: "self.render() formats the todo list as readable text (e.g., '[ ] task A, [>] task B') that gets returned as the tool_result — the model sees its own updated list immediately."
      - lines: [15, 21]
        annotation: "The nag reminder injects a <reminder> text block at the front of the last user message if 3+ rounds have passed without a todo update. It nudges the model without requiring user intervention."
---

## The Problem

On multi-step tasks, the model loses track. It repeats work, skips steps, or wanders off. Long conversations make this worse -- the system prompt fades as tool results fill the context. A 10-step refactoring might complete steps 1-3, then the model starts improvising because it forgot steps 4-10.

## The Solution

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> | Tools   |
| prompt |      |       |      | + todo  |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
                          |
              +-----------+-----------+
              | TodoManager state     |
              | [ ] task A            |
              | [>] task B  <- doing  |
              | [x] task C            |
              +-----------------------+
                          |
              if rounds_since_todo >= 3:
                inject <reminder> into tool_result
```

## How It Works

1. TodoManager stores items with statuses. Only one item can be `in_progress` at a time.

```python
class TodoManager:
    def update(self, items: list) -> str:
        validated, in_progress_count = [], 0
        for item in items:
            status = item.get("status", "pending")
            if status == "in_progress":
                in_progress_count += 1
            validated.append({"id": item["id"], "text": item["text"],
                              "status": status})
        if in_progress_count > 1:
            raise ValueError("Only one task can be in_progress")
        self.items = validated
        return self.render()
```

2. The `todo` tool goes into the dispatch map like any other tool.

```python
TOOL_HANDLERS = {
    # ...base tools...
    "todo": lambda **kw: TODO.update(kw["items"]),
}
```

3. A nag reminder injects a nudge if the model goes 3+ rounds without calling `todo`.

```python
if rounds_since_todo >= 3 and messages:
    last = messages[-1]
    if last["role"] == "user" and isinstance(last.get("content"), list):
        last["content"].insert(0, {
            "type": "text",
            "text": "<reminder>Update your todos.</reminder>",
        })
```

The "one in_progress at a time" constraint forces sequential focus. The nag reminder creates accountability.

## What Changed From [Tool Use](/en/s02-tool-use)

| Component      | Before (Tool Use) | After (TodoWrite)          |
|----------------|------------------|----------------------------|
| Tools          | 4                | 5 (+todo)                  |
| Planning       | None             | TodoManager with statuses  |
| Nag injection  | None             | `<reminder>` after 3 rounds|
| Agent loop     | Simple dispatch  | + rounds_since_todo counter|

## Key Takeaway

Planning is not optional for multi-step work. The TodoWrite pattern gives the model a structured way to track its own progress, with the harness enforcing accountability through nag reminders. The loop barely changes -- one new tool, one counter, one injection point.
