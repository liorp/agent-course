---
title: "Context Compact"
session: "s06"
phase: 2
motto: "Context will fill up; you need a way to make room"
order: 6
readingTime: 20
beginnerConcepts:
  - question: "What is a context window?"
    answer: "The total amount of text (tokens) the model can 'see' at once — including your prompt, conversation history, tool results, and all previous messages. Claude's context window is large but finite."
  - question: "Why does context fill up?"
    answer: "Every tool call appends its result to the messages array. Reading a 1000-line file adds ~4000 tokens. After 30 file reads and 20 bash commands, you can easily hit 100,000+ tokens and approach the limit."
  - question: "What is micro-compaction?"
    answer: "A technique where tool results older than 3 turns are replaced with a short summary like '[Previous: used read_file]'. This silently trims stale detail while keeping recent context intact."
walkthroughs:
  - title: "The Three-Layer Compression Strategy"
    language: "python"
    code: |
      def count_tokens(messages: list) -> int:
          text = json.dumps(messages)
          return len(text) // 4  # rough estimate: 4 chars ≈ 1 token

      def maybe_compact(messages: list) -> list:
          tokens = count_tokens(messages)
          if tokens > 80000:
              return hard_compact(messages)
          if tokens > 50000:
              return mid_compact(messages)
          return micro_compact(messages)

      def hard_compact(messages: list) -> list:
          summary_prompt = (
              "Summarize the conversation so far. Include: "
              "what the user asked, what tools you used, "
              "what you found, what's left to do. Be dense."
          )
          summary_messages = messages + [{"role": "user", "content": summary_prompt}]
          response = client.messages.create(
              model=MODEL, system=SYSTEM,
              messages=summary_messages, max_tokens=2000,
          )
          summary = response.content[0].text
          return [
              {"role": "user", "content": f"<context_summary>\n{summary}\n</context_summary>"},
              {"role": "assistant", "content": "Understood. Continuing from the summary."},
          ]
    steps:
      - lines: [1, 3]
        annotation: "Token counting is intentionally rough — dividing JSON length by 4 gives a fast approximation. The exact count doesn't matter; what matters is triggering compression before hitting the hard API limit."
      - lines: [5, 11]
        annotation: "`maybe_compact()` is the single decision point. It's called before every LLM call in the agent loop. The three thresholds create a progressive escalation: micro at all times, mid at 50k, hard at 80k."
      - lines: [13, 28]
        annotation: "`hard_compact()` uses the LLM itself to write its own summary. It appends a summary request to the existing messages, calls the API, and replaces the entire history with the resulting summary — reducing potentially 80k+ tokens down to ~2000."
      - lines: [25, 28]
        annotation: "The compacted history is just two messages: a user message with the summary wrapped in `<context_summary>` tags, and a brief assistant acknowledgement. The next LLM call starts fresh from this minimal context."
challenges:
  - tier: "warmup"
    text: "If the rough token estimate is `len(json.dumps(messages)) // 4`, how accurate is it? Try counting the exact tokens for a few messages using the API's `usage` field and compare."
    hint: "The estimate is usually within 20% — good enough for triggering compression thresholds."
  - tier: "build"
    text: "Fill the context window by giving the agent many tasks in sequence. Watch the compression kick in. Add a log message that prints which layer triggered and how many tokens were saved."
    hint: "Check the token count before and after compaction and print the difference."
  - tier: "stretch"
    text: "Implement a fourth compression layer: semantic deduplication. Before hard compaction, detect if the agent read the same file multiple times and keep only the most recent version."
    hint: "Track file paths in tool results and remove older read_file results for the same path."
---

## The Problem

The context window is finite. A single `read_file` on a 1000-line file costs ~4000 tokens. After reading 30 files and running 20 bash commands, you hit 100,000+ tokens. The agent cannot work on large codebases without compression.

## The Solution

Three layers, increasing in aggressiveness:

```
Every turn:
+------------------+
| Tool call result |
+------------------+
        |
        v
[Layer 1: micro_compact]        (silent, every turn)
  Replace tool_result > 3 turns old
  with "[Previous: used {tool_name}]"
        |
        v
[Check: tokens > 50000?]
   |               |
  yes              no
   |               |
   v               +--- continue normally
[Layer 2: mid_compact]
  Summarize assistant messages
  Keep only last 5 tool results
   |
   v
[Check: tokens > 80000?]
   |               |
  yes              no
   |               +--- continue
   v
[Layer 3: hard_compact]
  Call LLM to write a dense summary
  Replace entire history with summary
  Inject <identity> reminder
```

## How It Works

1. **Layer 1 — Micro compaction** runs silently every turn. Tool results older than 3 turns become one-line placeholders.

```python
def micro_compact(messages: list) -> list:
    compacted = []
    for i, msg in enumerate(messages):
        if msg["role"] == "user" and isinstance(msg["content"], list):
            age = len(messages) - i
            if age > 6:  # older than 3 turns (user+assistant pairs)
                new_content = []
                for block in msg["content"]:
                    if block.get("type") == "tool_result":
                        tool_name = block.get("_tool_name", "tool")
                        new_content.append({
                            "type": "tool_result",
                            "tool_use_id": block["tool_use_id"],
                            "content": f"[Previous: used {tool_name}]",
                        })
                    else:
                        new_content.append(block)
                compacted.append({**msg, "content": new_content})
                continue
        compacted.append(msg)
    return compacted
```

2. **Layer 2 — Mid compaction** triggers when token count exceeds 50,000. It keeps the system prompt, the most recent 5 tool results in full, and summarizes the rest.

```python
def count_tokens(messages: list) -> int:
    text = json.dumps(messages)
    return len(text) // 4  # rough estimate: 4 chars ≈ 1 token

def maybe_compact(messages: list) -> list:
    tokens = count_tokens(messages)
    if tokens > 80000:
        return hard_compact(messages)
    if tokens > 50000:
        return mid_compact(messages)
    return micro_compact(messages)
```

3. **Layer 3 — Hard compaction** asks the LLM itself to write a dense summary of what happened, then replaces the entire history with that summary plus an identity reminder.

```python
def hard_compact(messages: list) -> list:
    summary_prompt = (
        "Summarize the conversation so far. Include: "
        "what the user asked, what tools you used, "
        "what you found, what's left to do. Be dense."
    )
    summary_messages = messages + [{"role": "user", "content": summary_prompt}]
    response = client.messages.create(
        model=MODEL, system=SYSTEM,
        messages=summary_messages, max_tokens=2000,
    )
    summary = response.content[0].text
    return [
        {"role": "user", "content": f"<context_summary>\n{summary}\n</context_summary>"},
        {"role": "assistant", "content": "Understood. Continuing from the summary."},
    ]
```

## What Changed From [Skills](/en/s05-skill-loading)

| Component      | Before (Skills)  | After (Context Compact)        |
|----------------|------------------|--------------------------------|
| Context        | Grows forever    | Three-layer compression        |
| Old results    | Full content     | One-line placeholders          |
| Token limit    | Hit and crash    | Soft limit at 50k, hard at 80k |
| History        | Unbounded        | Compacted on demand            |

## Key Takeaway

Context compression is what makes long-running agents practical. The three-layer strategy is progressive: do the cheapest thing first (micro), escalate only when needed (mid), and as a last resort ask the model to summarize itself (hard). The loop code barely changes — just wrap `messages` through `maybe_compact()` before each LLM call.
