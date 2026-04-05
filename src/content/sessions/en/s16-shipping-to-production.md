---
title: "Shipping to Production"
session: "s16"
phase: 5
motto: "A demo agent is easy; a reliable agent is engineering"
order: 16
readingTime: 30
prerequisites:
  - "s01-the-agent-loop"
  - "s13-agent-evals"
  - "s14-guardrails"
  - "s15-observability"
whatYouBuild: "A production-ready agent deployment with streaming responses, retry logic, cost tracking, model routing, and health monitoring."
beginnerConcepts:
  - question: "What is streaming?"
    answer: "Instead of waiting for the entire LLM response at once, streaming delivers tokens as they're generated — like watching someone type. This makes the agent feel responsive even on long generations and lets you show real-time progress."
  - question: "What is model routing?"
    answer: "Using different models for different tasks. Fast, cheap models (Haiku) for simple decisions like 'which tool to call next.' Powerful, expensive models (Opus) for complex reasoning like 'design the architecture.' This cuts costs 60-80% without sacrificing quality."
  - question: "What is exponential backoff?"
    answer: "A retry strategy where you wait longer between each attempt: 1s, 2s, 4s, 8s. This prevents hammering a failing API and gives it time to recover. Most production systems use this for all external API calls."
walkthroughs:
  - title: "Production Agent with Streaming and Retries"
    language: "python"
    code: |
      def agent_loop_production(messages: list, tracer: AgentTracer):
          while True:
              response = call_with_retry(messages)
              tracer.record("llm_call", {
                  "tokens": response.usage.input_tokens + response.usage.output_tokens,
                  "model": response.model,
              })
              messages.append({"role": "assistant", "content": response.content})
              if response.stop_reason != "tool_use":
                  return

              for block in response.content:
                  if block.type == "tool_use":
                      verdict = guardrail.check(block.name, block.input)
                      if verdict == "DENIED":
                          result = "Error: Tool call denied by guardrail"
                      elif verdict == "COST_CAP_EXCEEDED":
                          result = "Error: Cost cap exceeded"
                      elif verdict == "NEEDS_APPROVAL":
                          result = human_approve(block)
                      else:
                          result = execute_tool(block)
                      tracer.record("tool_exec", {"tool": block.name})
                      messages.append(tool_result(block.id, result))

      def call_with_retry(messages, max_retries=4):
          for attempt in range(max_retries):
              try:
                  return client.messages.create(
                      model=select_model(messages),
                      messages=messages, tools=TOOLS, max_tokens=8000,
                  )
              except anthropic.RateLimitError:
                  wait = 2 ** attempt
                  time.sleep(wait)
          raise RuntimeError("API unavailable after retries")

      def select_model(messages) -> str:
          token_count = count_tokens(messages)
          if token_count < 2000:
              return "claude-haiku-4-5-20251001"
          return "claude-sonnet-4-6-20250610"
    steps:
      - lines: [1, 10]
        annotation: "The production loop integrates everything: tracer records every call, guardrail checks every tool, retries handle failures. This is the Agent Loop after it grew up."
      - lines: [12, 24]
        annotation: "Tool execution now goes through the guardrail first. Each verdict maps to a different action: deny, cap, approve with human, or auto-execute. The tracer records every tool call for post-mortem analysis."
      - lines: [26, 35]
        annotation: "`call_with_retry()` implements exponential backoff for rate limits. Each retry waits 2^attempt seconds (1s, 2s, 4s, 8s). After 4 failures, it raises — don't retry forever."
      - lines: [37, 41]
        annotation: "`select_model()` routes cheap tasks to Haiku and expensive ones to Sonnet. This simple heuristic (based on context size) can cut costs 60-80%. Production systems use more sophisticated routing."
challenges:
  - tier: "warmup"
    text: "Calculate the cost difference: running 100 agent tasks where each uses 10k input + 2k output tokens. Compare all-Sonnet vs. routing 70% to Haiku."
    hint: "Check current pricing at docs.anthropic.com. Haiku is roughly 10-20x cheaper per token."
  - tier: "build"
    text: "Add streaming to the agent loop: use `client.messages.stream()` and print tokens as they arrive. Show a spinner during tool execution."
    hint: "Use `with client.messages.stream(...) as stream: for text in stream.text_stream: print(text, end='', flush=True)`"
  - tier: "stretch"
    text: "Build a health dashboard: a simple HTTP endpoint that reports active agents, total tokens used today, error rate, and average response time. Use data from the tracer."
    hint: "Use `http.server` or Flask. Read from .traces/ directory to compute metrics."
---

## The Problem

You built an agent. It has a [loop](/en/s01-the-agent-loop), [tools](/en/s02-tool-use), [planning](/en/s03-todo-write), [subagents](/en/s04-subagent), [skills](/en/s05-skill-loading), [context management](/en/s06-context-compact), [tasks](/en/s07-task-system), [background execution](/en/s08-background-tasks), [teams](/en/s09-agent-teams), [protocols](/en/s10-team-protocols), [autonomy](/en/s11-autonomous-agents), [isolation](/en/s12-worktree-task-isolation), [evals](/en/s13-agent-evals), [guardrails](/en/s14-guardrails), and [observability](/en/s15-observability). You demo it and it looks incredible. Then you ship it.

The first user hits a rate limit and gets a stack trace. The second user waits 45 seconds staring at a blank screen while the model generates a long response. The third user runs a loop that burns $200 in tokens before anyone notices. The fourth user's request fails silently — no error, no log, just a blank result.

The gap between "works on my laptop" and "reliable in production" is enormous. Demo agents break on rate limits, cost explosions, silent failures, and slow responses. Every one of these is a solved problem in traditional engineering. You just have to apply the solutions to your agent harness.

## The Solution

Layer production concerns onto the existing harness. You don't rewrite the [agent loop](/en/s01-the-agent-loop) — you wrap it with the infrastructure it needs to survive real traffic:

```
Streaming      →  Responsive UX, no blank screens
Retries        →  Survive rate limits and transient failures
Model routing  →  Cut costs 60-80% without losing quality
Cost tracking  →  Know what you're spending, stop before you overspend
Health monitor →  See problems before users report them
```

Each of these is a small, independent addition. Together they turn a demo into a service.

## Streaming Responses

The biggest UX problem with agents is latency. A complex response takes 10-30 seconds to generate. Without streaming, the user stares at nothing. With streaming, they see tokens arrive in real time — the agent feels alive.

```python
import anthropic

client = anthropic.Anthropic()

def stream_response(messages: list) -> anthropic.types.Message:
    """Stream tokens to stdout as they arrive, return the full message."""
    with client.messages.stream(
        model="claude-sonnet-4-6-20250610",
        messages=messages,
        tools=TOOLS,
        max_tokens=8000,
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
        print()  # newline after streaming completes
    return stream.get_final_message()
```

The `stream.text_stream` iterator yields each token as it arrives from the API. The `flush=True` ensures tokens appear immediately rather than buffering. When the stream ends, `get_final_message()` returns the complete `Message` object — same shape as `client.messages.create()`, so the rest of your loop doesn't change.

For tool calls, streaming still works. The model streams its text reasoning, then emits tool_use blocks. You can show a spinner while tools execute:

```python
import itertools, threading, sys

def spinner_context(message="Working"):
    """Show a spinner during tool execution."""
    done = threading.Event()
    def spin():
        for char in itertools.cycle("|/-\\"):
            if done.is_set():
                break
            sys.stdout.write(f"\r{message} {char}")
            sys.stdout.flush()
            done.wait(0.1)
        sys.stdout.write("\r" + " " * 40 + "\r")
    thread = threading.Thread(target=spin)
    thread.start()
    return done
```

## Retry with Exponential Backoff

Rate limits are not errors — they're normal traffic signals. The Anthropic API returns `429 Too Many Requests` when you exceed your rate limit. The correct response is to wait and retry, not crash.

```python
import anthropic
import time

def call_with_retry(messages: list, max_retries: int = 4) -> anthropic.types.Message:
    for attempt in range(max_retries):
        try:
            return client.messages.create(
                model=select_model(messages),
                messages=messages,
                tools=TOOLS,
                max_tokens=8000,
            )
        except anthropic.RateLimitError:
            wait = 2 ** attempt  # 1s, 2s, 4s, 8s
            print(f"Rate limited. Retrying in {wait}s...")
            time.sleep(wait)
        except anthropic.APITimeoutError:
            if attempt == max_retries - 1:
                raise
            time.sleep(1)
        except anthropic.APIConnectionError:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("API unavailable after retries")
```

The exponential backoff pattern — wait 1s, 2s, 4s, 8s — gives the API time to recover. Linear retries (1s, 1s, 1s, 1s) hammer a struggling service. Exponential retries back off gracefully.

Three exception types matter: `RateLimitError` (you're going too fast), `APITimeoutError` (the request took too long), and `APIConnectionError` (network issue). Each is transient and worth retrying. Other exceptions like `AuthenticationError` or `BadRequestError` are permanent — retrying won't help.

## Model Routing

Not every turn needs your most powerful model. A simple "which tool should I call?" decision doesn't need Sonnet. A complex "design the database schema" task does. Routing cheap tasks to cheap models slashes costs.

```python
def select_model(messages: list) -> str:
    """Route to cheap or expensive model based on context size."""
    token_count = count_tokens(messages)
    if token_count < 2000:
        return "claude-haiku-4-5-20251001"  # fast, cheap
    return "claude-sonnet-4-6-20250610"     # powerful, expensive

def count_tokens(messages: list) -> int:
    """Estimate token count from message content."""
    total = 0
    for msg in messages:
        if isinstance(msg["content"], str):
            total += len(msg["content"]) // 4  # rough estimate
        elif isinstance(msg["content"], list):
            for block in msg["content"]:
                if isinstance(block, dict) and "text" in block:
                    total += len(block["text"]) // 4
    return total
```

Concrete cost calculation: Haiku costs roughly $0.80/M input and $4/M output tokens. Sonnet costs roughly $3/M input and $15/M output tokens. For 100 agent tasks, each using 10k input + 2k output tokens:

- **All-Sonnet**: 100 x (10k x $3/M + 2k x $15/M) = 100 x ($0.03 + $0.03) = **$6.00**
- **70% Haiku + 30% Sonnet**: 70 x ($0.008 + $0.008) + 30 x ($0.03 + $0.03) = $1.12 + $1.80 = **$2.92**

That is a 51% savings with a naive routing heuristic. More sophisticated routing — classifying intent, checking task complexity — pushes savings to 60-80%. The key insight: most agent turns are simple tool dispatch, not deep reasoning.

## Cost Tracking

Knowing what you spend is the first step. Stopping before you overspend is the second.

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class CostTracker:
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    calls: list = field(default_factory=list)
    budget_limit_usd: float = 10.0

    # Pricing per million tokens (update as pricing changes)
    PRICING = {
        "claude-haiku-4-5-20251001":  {"input": 0.80, "output": 4.00},
        "claude-sonnet-4-6-20250610": {"input": 3.00, "output": 15.00},
    }

    def record(self, model: str, input_tokens: int, output_tokens: int):
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        cost = self._calculate_cost(model, input_tokens, output_tokens)
        self.calls.append({
            "timestamp": datetime.now().isoformat(),
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost,
        })
        return cost

    def total_cost_usd(self) -> float:
        return sum(c["cost_usd"] for c in self.calls)

    def check_budget(self) -> bool:
        """Returns True if within budget, False if exceeded."""
        return self.total_cost_usd() < self.budget_limit_usd

    def _calculate_cost(self, model: str, inp: int, out: int) -> float:
        pricing = self.PRICING.get(model, {"input": 3.0, "output": 15.0})
        return (inp * pricing["input"] + out * pricing["output"]) / 1_000_000
```

Wire the tracker into your [guardrail](/en/s14-guardrails) layer. When the budget is exceeded, the guardrail returns `COST_CAP_EXCEEDED` and the agent stops gracefully instead of running up a surprise bill.

## The Production Loop

Here is the full loop that ties everything together — streaming, retries, model routing, cost tracking, [guardrails](/en/s14-guardrails), and [observability](/en/s15-observability):

```python
import anthropic
import time

client = anthropic.Anthropic()
cost_tracker = CostTracker(budget_limit_usd=10.0)

def agent_loop_production(messages: list, tracer: AgentTracer):
    """The Agent Loop, hardened for production."""
    while True:
        # 1. Call with retries and model routing
        response = call_with_retry(messages)

        # 2. Track cost
        input_t = response.usage.input_tokens
        output_t = response.usage.output_tokens
        cost_tracker.record(response.model, input_t, output_t)

        # 3. Record in tracer for observability
        tracer.record("llm_call", {
            "tokens": input_t + output_t,
            "model": response.model,
            "cost_usd": cost_tracker.calls[-1]["cost_usd"],
        })

        # 4. Append response to conversation
        messages.append({"role": "assistant", "content": response.content})

        # 5. If no tool calls, we're done
        if response.stop_reason != "tool_use":
            return

        # 6. Execute tools through guardrail
        for block in response.content:
            if block.type == "tool_use":
                # Budget check before executing
                if not cost_tracker.check_budget():
                    result = "Error: Cost cap exceeded — stopping agent"
                    tracer.record("budget_exceeded", {
                        "total_cost": cost_tracker.total_cost_usd()
                    })
                else:
                    verdict = guardrail.check(block.name, block.input)
                    if verdict == "DENIED":
                        result = "Error: Tool call denied by guardrail"
                    elif verdict == "NEEDS_APPROVAL":
                        result = human_approve(block)
                    else:
                        result = execute_tool(block)

                tracer.record("tool_exec", {
                    "tool": block.name,
                    "verdict": verdict if cost_tracker.check_budget() else "COST_CAP",
                })
                messages.append(tool_result(block.id, result))

def tool_result(tool_use_id: str, content: str) -> dict:
    return {
        "role": "user",
        "content": [{
            "type": "tool_result",
            "tool_use_id": tool_use_id,
            "content": content,
        }],
    }
```

Compare this to [The Agent Loop](/en/s01-the-agent-loop). The core structure is identical — `while True`, call LLM, check stop reason, execute tools, loop. Everything new is **around** the loop, not inside it. That is the harness pattern: the loop stays simple, the infrastructure wraps it.

## What Changed From [Observability](/en/s15-observability)

| Component | Observability | Production |
|-----------|---------------------|-------------------|
| Focus | Seeing what the agent does | Making the agent reliable |
| Traces | Record events for debugging | Record events **and** act on them (cost caps) |
| Failures | Log errors for post-mortem | Retry transient errors automatically |
| Latency | Measure response times | Reduce perceived latency with streaming |
| Cost | Track spend in traces | Enforce budgets, route to cheaper models |
| Models | Single model per agent | Route between models per turn |
| Health | Dashboard shows history | Live endpoint for monitoring and alerting |

Observability tells you what happened. Production infrastructure makes sure the right thing happens in the first place.

## Key Takeaway

A production agent is not a different agent — it is the same [Agent Loop](/en/s01-the-agent-loop) wrapped in the engineering it needs to survive the real world. Streaming for responsiveness. Retries for resilience. Model routing for cost. Budget tracking for safety. Health monitoring for visibility. Each is a small, independent layer. Together they are the difference between a demo and a service. The agent logic stays simple. The harness does the hard work.
