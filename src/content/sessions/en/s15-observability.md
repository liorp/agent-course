---
title: "Observability & Debugging"
session: "s15"
phase: 5
motto: "When the agent derails at 2am, logs are your only witness"
order: 15
readingTime: 25
prerequisites:
  - "s01-the-agent-loop"
  - "s06-context-compact"
  - "s13-agent-evals"
whatYouBuild: "A structured logging and tracing system that records every LLM call, tool execution, and decision point — with replay capability for debugging."
beginnerConcepts:
  - question: "What is structured logging?"
    answer: "Instead of printing plain text like 'tool called', you log JSON objects with fields: timestamp, event type, tool name, input, output, duration, token count. This makes logs searchable and analyzable."
  - question: "What is a trace?"
    answer: "A trace follows one agent task from start to finish — every LLM call, tool execution, and decision. Think of it like a flight recorder for your agent. When something goes wrong, you replay the trace to see exactly what happened."
  - question: "What is replay debugging?"
    answer: "Recording all LLM responses so you can re-run the agent without making real API calls. This lets you reproduce bugs deterministically and test fixes cheaply — no tokens spent during replay."
walkthroughs:
  - title: "Agent Tracing System"
    language: "python"
    code: |
      @dataclass
      class TraceEvent:
          timestamp: str
          event_type: str  # "llm_call", "tool_exec", "error", "compact"
          data: dict
          duration_ms: int = 0
          tokens: int = 0

      class AgentTracer:
          def __init__(self, task_id: str):
              self.task_id = task_id
              self.events: list[TraceEvent] = []
              self.trace_file = Path(f".traces/{task_id}.jsonl")
              self.trace_file.parent.mkdir(exist_ok=True)

          def record(self, event_type: str, data: dict,
                     duration_ms: int = 0, tokens: int = 0):
              event = TraceEvent(
                  timestamp=datetime.utcnow().isoformat(),
                  event_type=event_type, data=data,
                  duration_ms=duration_ms, tokens=tokens,
              )
              self.events.append(event)
              with open(self.trace_file, "a") as f:
                  f.write(json.dumps(asdict(event)) + "\n")

          def replay(self) -> list[TraceEvent]:
              lines = self.trace_file.read_text().strip().split("\n")
              return [TraceEvent(**json.loads(l)) for l in lines]
    steps:
      - lines: [1, 7]
        annotation: "`TraceEvent` captures one thing that happened. The `event_type` categorizes it (LLM call, tool execution, error, compression). `duration_ms` and `tokens` enable performance analysis — which tools are slow? Which calls are expensive?"
      - lines: [9, 14]
        annotation: "`AgentTracer` is initialized per task. Traces are stored as JSONL files in `.traces/` — one line per event. JSONL is append-friendly and grep-friendly, perfect for debugging."
      - lines: [16, 24]
        annotation: "`record()` is called at every decision point in the agent loop. It both keeps events in memory (for live analysis) and appends to disk (for post-mortem debugging). The dual write ensures traces survive crashes."
      - lines: [26, 28]
        annotation: "`replay()` reads back all events from disk. This is the foundation for replay debugging — feed recorded LLM responses back into the agent loop instead of making real API calls."
challenges:
  - tier: "warmup"
    text: "Add `tracer.record()` calls to the agent loop from s01. Run a task and inspect the `.traces/` JSONL file. What patterns do you notice?"
    hint: "Record events at: before LLM call, after LLM response, before tool exec, after tool exec."
  - tier: "build"
    text: "Build a `trace_summary()` function that reads a trace file and prints: total turns, total tokens, total duration, most-used tool, and any errors."
    hint: "Group events by event_type using collections.Counter"
  - tier: "stretch"
    text: "Implement full replay debugging: record LLM responses during a live run, then create a MockClient that serves recorded responses. Verify the agent produces identical tool calls."
    hint: "Replace `client.messages.create` with a function that pops from a list of recorded responses."
---

## The Problem

You have a 30-turn agent session. It called 15 tools, compressed context twice ([Context Compact](/en/s06-context-compact)), and eventually produced the wrong output. Where did it go wrong? Turn 7? Turn 22? Was it a bad tool result or a bad LLM decision?

Print statements do not scale here. A `print("calling tool")` line tells you nothing about *which* tool, *what* input it received, *how long* it took, or *what* the LLM was thinking when it chose that tool. Multiply this across an autonomous agent team ([Autonomous Agents](/en/s11-autonomous-agents)) and you are flying blind.

The [Agent Evals](/en/s13-agent-evals) session taught you to measure whether agents succeed. This session teaches you to understand *why* they fail.

## The Solution

Structured tracing: wrap every decision point in the agent loop with a recorder that captures timestamped, typed events. Store them as JSONL — one JSON object per line, append-only, grep-friendly. Every LLM call, tool execution, error, and context compression becomes a searchable event.

Three capabilities emerge from this:

1. **Post-mortem analysis** — read the trace file after a failure and see exactly what happened, in order.
2. **Performance profiling** — which tools are slow? Which LLM calls burn the most tokens?
3. **Replay debugging** — re-run the agent using recorded LLM responses, no API calls needed.

## The Tracing System

The core is two pieces: a `TraceEvent` dataclass and an `AgentTracer` that writes events to disk.

```python
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

@dataclass
class TraceEvent:
    timestamp: str
    event_type: str  # "llm_call", "tool_exec", "error", "compact"
    data: dict
    duration_ms: int = 0
    tokens: int = 0

class AgentTracer:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.events: list[TraceEvent] = []
        self.trace_file = Path(f".traces/{task_id}.jsonl")
        self.trace_file.parent.mkdir(exist_ok=True)

    def record(self, event_type: str, data: dict,
               duration_ms: int = 0, tokens: int = 0):
        event = TraceEvent(
            timestamp=datetime.utcnow().isoformat(),
            event_type=event_type, data=data,
            duration_ms=duration_ms, tokens=tokens,
        )
        self.events.append(event)
        with open(self.trace_file, "a") as f:
            f.write(json.dumps(asdict(event)) + "\n")

    def replay(self) -> list[TraceEvent]:
        """Read all events back from disk."""
        lines = self.trace_file.read_text().strip().split("\n")
        return [TraceEvent(**json.loads(line)) for line in lines]
```

Every event has a type, a timestamp, a data payload, and optional performance fields. The JSONL format means you can `grep "error" .traces/task_42.jsonl` and immediately find failures.

## Integrating with the Agent Loop

Here is the agent loop from [The Agent Loop](/en/s01-the-agent-loop), now instrumented with tracing at every decision point.

```python
import time

def agent_loop(prompt: str, tools: list, task_id: str) -> str:
    tracer = AgentTracer(task_id)
    messages = [{"role": "user", "content": prompt}]

    while True:
        # Record the LLM call
        t0 = time.time()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            tools=tools,
            messages=messages,
        )
        duration = int((time.time() - t0) * 1000)
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        tracer.record("llm_call", {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "stop_reason": response.stop_reason,
        }, duration_ms=duration, tokens=tokens_used)

        # Check for end_turn
        if response.stop_reason == "end_turn":
            final = next(b.text for b in response.content if hasattr(b, "text"))
            tracer.record("end_turn", {"response_length": len(final)})
            return final

        # Process tool calls
        for block in response.content:
            if block.type == "tool_use":
                t0 = time.time()
                try:
                    result = execute_tool(block.name, block.input)
                    tool_duration = int((time.time() - t0) * 1000)
                    tracer.record("tool_exec", {
                        "tool": block.name,
                        "input": block.input,
                        "output_preview": str(result)[:200],
                    }, duration_ms=tool_duration)
                except Exception as e:
                    tracer.record("error", {
                        "tool": block.name,
                        "input": block.input,
                        "error": str(e),
                    })
                    result = f"Error: {e}"

                messages.append({"role": "assistant", "content": response.content})
                messages.append({
                    "role": "user",
                    "content": [{"type": "tool_result",
                                 "tool_use_id": block.id,
                                 "content": str(result)}],
                })
```

Four tracing points: before/after LLM calls, after tool executions, and on errors. The `output_preview` field truncates tool output to 200 characters — enough to debug, not enough to bloat the trace file.

## Trace Analysis

Raw JSONL files are useful for grep, but structured analysis reveals patterns across an entire run.

```python
from collections import Counter

def trace_summary(task_id: str) -> dict:
    tracer = AgentTracer(task_id)
    events = tracer.replay()

    summary = {
        "total_events": len(events),
        "total_tokens": sum(e.tokens for e in events),
        "total_duration_ms": sum(e.duration_ms for e in events),
        "turns": sum(1 for e in events if e.event_type == "llm_call"),
        "errors": [e.data for e in events if e.event_type == "error"],
    }

    # Tool usage stats
    tool_events = [e for e in events if e.event_type == "tool_exec"]
    tool_names = [e.data["tool"] for e in tool_events]
    summary["tool_counts"] = dict(Counter(tool_names))
    summary["slowest_tool_calls"] = sorted(
        [{"tool": e.data["tool"], "duration_ms": e.duration_ms} for e in tool_events],
        key=lambda x: x["duration_ms"], reverse=True,
    )[:5]

    return summary

def print_trace_summary(task_id: str):
    s = trace_summary(task_id)
    print(f"Turns: {s['turns']}  |  Tokens: {s['total_tokens']}  |  Duration: {s['total_duration_ms']}ms")
    print(f"Tools used: {s['tool_counts']}")
    if s["errors"]:
        print(f"ERRORS ({len(s['errors'])}):")
        for err in s["errors"]:
            print(f"  - {err['tool']}: {err['error']}")
    print("Slowest calls:")
    for call in s["slowest_tool_calls"]:
        print(f"  {call['tool']}: {call['duration_ms']}ms")
```

This immediately answers debugging questions: Did the agent burn tokens on a loop? Did a tool consistently fail? Was one tool call responsible for most of the latency?

## Replay Debugging

The most powerful capability: record LLM responses during a live run, then replay them without spending tokens.

```python
class RecordingClient:
    """Wraps the real client and records every response."""
    def __init__(self, real_client, tracer: AgentTracer):
        self.real_client = real_client
        self.tracer = tracer

    def create(self, **kwargs):
        response = self.real_client.messages.create(**kwargs)
        # Store the full response for replay
        self.tracer.record("llm_response", {
            "content": [block_to_dict(b) for b in response.content],
            "stop_reason": response.stop_reason,
            "usage": {"input": response.usage.input_tokens,
                      "output": response.usage.output_tokens},
        })
        return response


class ReplayClient:
    """Serves recorded responses instead of calling the API."""
    def __init__(self, task_id: str):
        tracer = AgentTracer(task_id)
        events = tracer.replay()
        self.responses = [
            e.data for e in events if e.event_type == "llm_response"
        ]
        self.index = 0

    def create(self, **kwargs):
        if self.index >= len(self.responses):
            raise RuntimeError("Replay exhausted — agent took a different path")
        data = self.responses[self.index]
        self.index += 1
        return MockResponse(data)
```

The workflow: run once with `RecordingClient` to capture the trace. When a bug surfaces, swap in `ReplayClient` and re-run. The agent receives identical LLM responses, so it makes identical tool calls. Now you can add print statements, step through with a debugger, or test a fix — all without spending a single token.

If the agent diverges during replay (different tool call than expected), the replay raises an error. That divergence itself is a signal: it means your fix changed the agent's behavior at that exact point.

## What Changed From [Guardrails](/en/s14-guardrails)

| Component       | Before (Guardrails)            | After (Observability)                      |
|-----------------|--------------------------------|--------------------------------------------|
| Error handling  | Block dangerous actions        | Record every action for analysis           |
| Failure mode    | Prevent bad outcomes           | Diagnose why bad outcomes happened         |
| Logging         | Ad-hoc print statements        | Structured JSONL with typed events         |
| Debugging       | Re-run and hope to reproduce   | Replay exact LLM responses deterministically |
| Performance     | Not tracked                    | Duration and token counts per event        |
| Scope           | Single-turn validation         | Full trace across all turns                |

## Key Takeaway

An agent without observability is a black box. Structured tracing turns it into a glass box — every LLM call, tool execution, and error is recorded with timestamps and performance data. Replay debugging eliminates the most frustrating part of agent development: non-reproducible failures. Record once, replay forever, fix with confidence. This is the foundation for running agents in production, where the 2am failure needs to be debugged at 9am from a trace file alone.
