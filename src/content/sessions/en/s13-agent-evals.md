---
title: "Agent Evals"
session: "s13"
phase: 5
motto: "You can't improve what you can't measure"
order: 13
readingTime: 25
prerequisites:
  - "s01-the-agent-loop"
  - "s02-tool-use"
  - "s03-todo-write"
whatYouBuild: "A test harness that scores your agent's tool-use accuracy, task completion rate, and cost efficiency across reproducible scenarios."
beginnerConcepts:
  - question: "What is an agent eval?"
    answer: "A structured test that measures how well your agent performs a task. Unlike unit tests that check one function, evals measure end-to-end behavior: did the agent use the right tools, complete the task, stay within budget?"
  - question: "Why can't you just test agents like normal code?"
    answer: "Because agents are non-deterministic — the same prompt can produce different tool call sequences. Evals handle this by checking outcomes (did the file get created correctly?) rather than exact steps (did it call write_file on line 3?)."
  - question: "What is a scoring rubric?"
    answer: "A set of criteria that define success. For example: 'file exists' (pass/fail), 'file contains correct function' (pass/fail), 'completed in under 5 tool calls' (efficiency score). The rubric turns subjective quality into measurable numbers."
walkthroughs:
  - title: "Building an Eval Harness"
    language: "python"
    code: |
      @dataclass
      class EvalCase:
          name: str
          prompt: str
          check: Callable[[str], EvalResult]
          max_turns: int = 20
          max_tokens: int = 50000

      @dataclass
      class EvalResult:
          passed: bool
          score: float  # 0.0 to 1.0
          details: str

      def run_eval(case: EvalCase, agent_fn) -> EvalResult:
          workspace = tempfile.mkdtemp()
          messages = [{"role": "user", "content": case.prompt}]
          turns = 0
          total_tokens = 0

          while turns < case.max_turns:
              response = agent_fn(messages)
              total_tokens += response.usage.input_tokens + response.usage.output_tokens
              if total_tokens > case.max_tokens:
                  return EvalResult(False, 0.0, "Token budget exceeded")
              if response.stop_reason != "tool_use":
                  break
              execute_tools(response, messages, cwd=workspace)
              turns += 1

          return case.check(workspace)

      # Example eval case
      def check_hello_world(workspace):
          path = os.path.join(workspace, "hello.py")
          if not os.path.exists(path):
              return EvalResult(False, 0.0, "hello.py not found")
          content = open(path).read()
          if "print" in content and "Hello" in content:
              return EvalResult(True, 1.0, "Correct")
          return EvalResult(False, 0.5, "File exists but content wrong")
    steps:
      - lines: [1, 6]
        annotation: "An `EvalCase` defines one test scenario: a prompt to send the agent, a checker function, and resource limits. The limits prevent runaway agents from burning tokens during testing."
      - lines: [8, 11]
        annotation: "`EvalResult` is the standardized output. Every eval produces a pass/fail boolean, a 0-1 score for partial credit, and human-readable details explaining what happened."
      - lines: [13, 27]
        annotation: "`run_eval()` creates an isolated workspace, runs the agent until it stops or exceeds limits, then calls the checker. The workspace is a temp directory — each eval starts clean, no leftover files from previous runs."
      - lines: [29, 35]
        annotation: "A concrete checker: verify that the agent created `hello.py` with the right content. Note the partial credit — if the file exists but content is wrong, it scores 0.5 instead of 0."
challenges:
  - tier: "warmup"
    text: "Predict: if you run the same eval 10 times, will the agent get the same score every time? Why or why not?"
    hint: "Think about temperature, non-deterministic tool execution order, and network timing."
  - tier: "build"
    text: "Write 3 eval cases for a file-manipulation agent: (1) create a file, (2) read and summarize a file, (3) refactor a function. Include scoring rubrics."
    hint: "Use subprocess to run the generated code and check if it actually works, not just if it looks right."
  - tier: "stretch"
    text: "Build an eval suite that runs N cases in parallel, collects scores into a JSON report, and flags regressions when scores drop below a baseline."
    hint: "Use concurrent.futures.ThreadPoolExecutor and compare against a saved baseline.json"
---

## The Problem

You built an agent. It has a [loop](/en/s01-the-agent-loop), [tools](/en/s02-tool-use), [planning](/en/s03-todo-write), [subagents](/en/s04-subagent), [skills](/en/s05-skill-loading), [context management](/en/s06-context-compact), [tasks](/en/s07-task-system), [background execution](/en/s08-background-tasks), [teams](/en/s09-agent-teams), [protocols](/en/s10-team-protocols), [autonomy](/en/s11-autonomous-agents), and [isolation](/en/s12-worktree-task-isolation). You can watch it work and it looks impressive. But is it actually good?

You can't answer that question by watching. Agents are non-deterministic — the same prompt produces different tool call sequences on different runs. A change to your system prompt might improve file creation but silently break refactoring. You won't notice until a user does, and by then the damage is done.

Traditional unit tests don't help. You can't assert that the agent called `write_file` on turn 3, because tomorrow it might call `bash` on turn 2 and get the same result. You need tests that check **outcomes**, not **steps**.

## The Solution

An eval harness. Define scenarios with known-good outcomes, run your agent in a sandbox, check what it produced, and score the results. Run the same suite every time you change the agent. Catch regressions before they ship.

```
Define scenario  →  Run agent in sandbox  →  Check outcomes  →  Score  →  Report
```

## Building the Eval Harness

The core is two dataclasses and one function.

```python
from dataclasses import dataclass
from typing import Callable
import tempfile, os

@dataclass
class EvalCase:
    name: str
    prompt: str
    check: Callable[[str], "EvalResult"]
    max_turns: int = 20
    max_tokens: int = 50000

@dataclass
class EvalResult:
    passed: bool
    score: float   # 0.0 to 1.0
    details: str
```

`EvalCase` is the input. `EvalResult` is the output. Every eval, no matter how complex, conforms to this interface.

The runner creates an isolated workspace, executes the agent, and hands the workspace to the checker:

```python
def run_eval(case: EvalCase, agent_fn) -> EvalResult:
    workspace = tempfile.mkdtemp()
    messages = [{"role": "user", "content": case.prompt}]
    turns = 0
    total_tokens = 0

    while turns < case.max_turns:
        response = agent_fn(messages)
        total_tokens += response.usage.input_tokens + response.usage.output_tokens
        if total_tokens > case.max_tokens:
            return EvalResult(False, 0.0, "Token budget exceeded")
        if response.stop_reason != "tool_use":
            break
        execute_tools(response, messages, cwd=workspace)
        turns += 1

    return case.check(workspace)
```

The `cwd=workspace` parameter is critical. Every tool call executes inside the temp directory. The agent can create files, run commands, and modify state — all contained to that workspace. When the eval finishes, you inspect what's there.

A concrete checker:

```python
def check_hello_world(workspace):
    path = os.path.join(workspace, "hello.py")
    if not os.path.exists(path):
        return EvalResult(False, 0.0, "hello.py not found")
    content = open(path).read()
    if "print" in content and "Hello" in content:
        return EvalResult(True, 1.0, "Correct")
    return EvalResult(False, 0.5, "File exists but content wrong")

hello_eval = EvalCase(
    name="hello-world",
    prompt="Create a file called hello.py that prints 'Hello, World!'",
    check=check_hello_world,
)
```

## Scoring Strategies

Not every eval is pass/fail. Three strategies, escalating in nuance:

### Binary Pass/Fail

The simplest. Did the file exist? Did the test pass?

```python
def check_file_exists(workspace):
    if os.path.exists(os.path.join(workspace, "output.txt")):
        return EvalResult(True, 1.0, "File created")
    return EvalResult(False, 0.0, "File missing")
```

### Partial Credit

Award points for each criterion met. This catches agents that get close but not all the way:

```python
def check_refactor(workspace):
    path = os.path.join(workspace, "math_utils.py")
    if not os.path.exists(path):
        return EvalResult(False, 0.0, "File not found")

    content = open(path).read()
    score = 0.0
    details = []

    # Criterion 1: function exists
    if "def calculate_average" in content:
        score += 0.25
        details.append("PASS: function exists")
    else:
        details.append("FAIL: function missing")

    # Criterion 2: has type hints
    if "def calculate_average(numbers: list" in content:
        score += 0.25
        details.append("PASS: type hints present")
    else:
        details.append("FAIL: no type hints")

    # Criterion 3: has docstring
    if '"""' in content or "'''" in content:
        score += 0.25
        details.append("PASS: docstring present")
    else:
        details.append("FAIL: no docstring")

    # Criterion 4: actually runs
    result = subprocess.run(
        ["python", "-c", f"import math_utils; print(math_utils.calculate_average([1,2,3]))"],
        capture_output=True, text=True, cwd=workspace
    )
    if result.returncode == 0 and "2" in result.stdout:
        score += 0.25
        details.append("PASS: correct output")
    else:
        details.append(f"FAIL: runtime error: {result.stderr[:100]}")

    return EvalResult(score >= 0.75, score, "; ".join(details))
```

The key insight: criterion 4 actually *runs* the generated code. Checking string content tells you the agent wrote something that looks right. Running it tells you it *is* right.

### Rubric-Based Scoring with LLM Judge

For subjective qualities like "is this code clean?", use a second LLM call as a judge:

```python
def llm_judge(workspace, criteria: str) -> EvalResult:
    content = open(os.path.join(workspace, "solution.py")).read()
    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""Score this code from 0.0 to 1.0 on: {criteria}

Code:
{content}

Respond with JSON: {{"score": float, "reasoning": str}}"""
        }],
    )
    result = json.loads(response.content[0].text)
    return EvalResult(
        result["score"] >= 0.7,
        result["score"],
        result["reasoning"],
    )
```

Use LLM judges sparingly. They add cost, latency, and their own non-determinism. Prefer deterministic checks when possible.

## Running Evals at Scale

One eval tells you nothing. You need a suite that runs many cases and tracks results over time.

### Parallel Execution

```python
from concurrent.futures import ThreadPoolExecutor
import json, time

def run_suite(cases: list[EvalCase], agent_fn, workers: int = 4) -> dict:
    results = {}
    start = time.time()

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(run_eval, case, agent_fn): case.name
            for case in cases
        }
        for future in futures:
            name = futures[future]
            try:
                results[name] = future.result(timeout=300)
            except Exception as e:
                results[name] = EvalResult(False, 0.0, f"Error: {e}")

    elapsed = time.time() - start
    passed = sum(1 for r in results.values() if r.passed)
    total_score = sum(r.score for r in results.values()) / len(results)

    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "elapsed_seconds": round(elapsed, 1),
        "total": len(cases),
        "passed": passed,
        "failed": len(cases) - passed,
        "avg_score": round(total_score, 3),
        "results": {
            name: {"passed": r.passed, "score": r.score, "details": r.details}
            for name, r in results.items()
        },
    }
```

### JSON Reports and Regression Detection

Save each run's results. Compare against a baseline to catch regressions:

```python
def save_report(report: dict, path: str = "eval_results.json"):
    with open(path, "w") as f:
        json.dump(report, f, indent=2)

def check_regressions(report: dict, baseline_path: str = "baseline.json") -> list[str]:
    if not os.path.exists(baseline_path):
        return []

    baseline = json.load(open(baseline_path))
    regressions = []

    for name, result in report["results"].items():
        if name in baseline["results"]:
            old_score = baseline["results"][name]["score"]
            new_score = result["score"]
            if new_score < old_score - 0.1:  # 10% tolerance
                regressions.append(
                    f"REGRESSION: {name} dropped from {old_score} to {new_score}"
                )

    return regressions
```

### CI Integration

Wire the suite into your CI pipeline. A failing eval blocks the merge, just like a failing test:

```python
if __name__ == "__main__":
    cases = [hello_eval, refactor_eval, summarize_eval]
    report = run_suite(cases, agent_fn=my_agent)
    save_report(report)

    regressions = check_regressions(report)
    if regressions:
        for r in regressions:
            print(f"  {r}")
        sys.exit(1)

    print(f"Evals passed: {report['passed']}/{report['total']}")
    print(f"Average score: {report['avg_score']}")
    sys.exit(0 if report['failed'] == 0 else 1)
```

Now `python run_evals.py` returns exit code 0 on success, 1 on failure. Any CI system knows what to do with that.

## What Changed From [Worktree + Task Isolation](/en/s12-worktree-task-isolation)

| Component | Worktree + Task Isolation | Agent Evals |
|-----------|--------------------------|-------------|
| Focus | Building the agent | Measuring the agent |
| Workspace | Git worktree per task | Temp directory per eval |
| Success criteria | Task marked complete | Checker function returns score |
| Isolation purpose | Prevent agents from interfering | Prevent evals from leaking state |
| Output | Merged branch | JSON report with scores |
| Feedback loop | Agent reports to lead | Eval suite reports to developer |

## Key Takeaway

Evals close the loop. Without them, every change to your agent is a guess — you hope it got better, you assume nothing broke. With an eval harness, you **know**. Define your scenarios, write your checkers, run the suite, and read the scores. The agent is only as good as your ability to measure it. Now you can measure it.
