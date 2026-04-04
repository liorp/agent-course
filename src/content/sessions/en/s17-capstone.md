---
title: "Capstone: Code Review Agent"
session: "s17"
phase: 5
motto: "Everything you learned, one system"
order: 17
readingTime: 35
prerequisites:
  - "s01-the-agent-loop"
  - "s04-subagent"
  - "s07-task-system"
  - "s09-agent-teams"
  - "s12-worktree-task-isolation"
  - "s13-agent-evals"
  - "s14-guardrails"
whatYouBuild: "A multi-agent code review system where a lead agent receives a PR diff, spawns specialist reviewers (security, performance, style), coordinates them via mailboxes, and produces a unified review summary."
beginnerConcepts:
  - question: "Why a code review agent?"
    answer: "Code review is the perfect capstone because it naturally requires everything: reading files (tools), delegating to specialists (subagents/teams), coordinating findings (mailboxes/protocols), running tests in isolation (worktrees), and producing structured output. It's complex enough to exercise every concept but concrete enough to build in a day."
  - question: "What does the finished system look like?"
    answer: "You run `python capstone.py PR_URL` and get back a structured review with sections for security, performance, style, and tests. Under the hood, 4 agents work in parallel, each examining the diff from their specialty, coordinating through the team protocols you built."
  - question: "Can I customize this for my own use case?"
    answer: "Absolutely. The architecture is the same whether you're building a code reviewer, a research assistant, a deployment bot, or a customer support agent. The capstone teaches the pattern — you choose what to build with it."
walkthroughs:
  - title: "Capstone Architecture: Lead + Specialists"
    language: "python"
    code: |
      def run_code_review(diff: str) -> dict:
          # Phase 1: Planning (s03, s07)
          tasks = plan_review(diff)
          task_manager.create_all(tasks)

          # Phase 2: Team setup (s09)
          team = init_team([
              {"name": "security", "role": "security reviewer"},
              {"name": "performance", "role": "performance reviewer"},
              {"name": "style", "role": "style reviewer"},
          ])

          # Phase 3: Parallel execution (s11, s12)
          for task in task_manager.get_ready():
              wt = create_worktree(task.id)
              assign_task(task.id, wt)
              # Autonomous agents claim and execute

          # Phase 4: Collect results (s10)
          wait_for_completion(task_manager)
          findings = collect_findings(team)

          # Phase 5: Synthesize (s04)
          summary = synthesize_review(findings)
          return summary
    steps:
      - lines: [2, 4]
        annotation: "Phase 1 uses the TodoWrite planner (s03) and Task System (s07) to break the review into specific subtasks: check auth patterns, find N+1 queries, verify naming conventions, etc."
      - lines: [6, 12]
        annotation: "Phase 2 initializes the team (s09) with three specialist agents. Each has a role that shapes its system prompt and determines what it looks for in the code."
      - lines: [14, 18]
        annotation: "Phase 3 combines autonomous agents (s11) with worktree isolation (s12). Each specialist gets its own branch to work in — they can even run tests without interfering with each other."
      - lines: [20, 22]
        annotation: "Phase 4 uses team protocols (s10) to collect findings. The lead agent drains each specialist's mailbox and aggregates their structured outputs."
      - lines: [24, 26]
        annotation: "Phase 5 spawns a subagent (s04) to synthesize all findings into a coherent review summary. Context compression (s06) ensures the synthesis stays within token limits."
challenges:
  - tier: "warmup"
    text: "Draw the architecture diagram for this system. Map each box to the session where you learned that concept."
    hint: "Your diagram should have: Lead Agent (s01), Task Board (s07), 3 Specialist Agents (s09), Mailboxes (s09), Worktrees (s12), Guardrails (s14), and Tracer (s15)."
  - tier: "build"
    text: "Implement the capstone. Start with a single reviewer agent that reads a diff and produces findings. Then add a second specialist and coordinate them via mailboxes."
    hint: "Start simple — a lead + 1 specialist is enough. Add the second specialist only after the mailbox coordination works."
  - tier: "stretch"
    text: "Add an eval suite (s13) for your code review agent. Define 5 test cases with known issues (SQL injection, unused import, O(n^2) loop, inconsistent naming, missing error handling) and score the agent's ability to find them."
    hint: "Create synthetic diffs with known bugs. The checker verifies that the agent's output mentions each bug."
---

## The Problem

You have learned 16 concepts in isolation. The [agent loop](/en/s01-the-agent-loop) runs tools. [Tools](/en/s02-tool-use) read files and execute commands. [TodoWrite](/en/s03-todo-write) plans work. [Subagents](/en/s04-subagent) delegate. [Skills](/en/s05-skill-loading) load context on demand. [Context compression](/en/s06-context-compact) keeps conversations from exploding. [Tasks](/en/s07-task-system) persist state. [Background tasks](/en/s08-background-tasks) run work off the main thread. [Teams](/en/s09-agent-teams) coordinate multiple agents. [Protocols](/en/s10-team-protocols) define how they talk. [Autonomous agents](/en/s11-autonomous-agents) claim their own work. [Worktrees](/en/s12-worktree-task-isolation) give each agent an isolated workspace. [Evals](/en/s13-agent-evals) measure quality. [Guardrails](/en/s14-guardrails) enforce safety. [Observability](/en/s15-observability) makes the system visible. [Production deployment](/en/s16-shipping-to-production) makes it reliable.

Each works alone. Real systems combine them all. This capstone ties every concept together into one production-grade system: a multi-agent code review bot that receives a PR diff, delegates to specialist reviewers, coordinates their findings, and produces a structured review summary.

## The Architecture

```
                          PR Diff
                             |
                      +------v------+
                      |  Lead Agent |--------> Task Board
                      |    (s01)    |            (s07)
                      +------+------+
                             | plan + delegate
               +-------------+-------------+
               v             v             v
      +--------------+ +--------------+ +--------------+
      |   Security   | | Performance  | |    Style     |
      |   Reviewer   | |  Reviewer    | |  Reviewer    |
      |    (s09)     | |    (s09)     | |    (s09)     |
      +------+-------+ +------+-------+ +------+-------+
             |                |                |
      +------v-------+ +------v-------+ +------v-------+
      |  worktree/   | |  worktree/   | |  worktree/   |
      |  security    | |  performance | |  style       |
      |    (s12)     | |    (s12)     | |    (s12)     |
      +------+-------+ +------v-------+ +------+-------+
             |                |                |
             +----------------+----------------+
                              | findings via mailbox (s10)
                       +------v------+
                       |  Synthesize |
                       |    (s04)    |
                       +------+------+
                              |
                       +------v------+
                       |   Review    |
                       |   Summary   |
                       +-------------+

  Cross-cutting: Guardrails (s14) | Tracer (s15) | Retries + Streaming (s16)
```

Every box maps to a session you completed. The lead agent runs the [core loop](/en/s01-the-agent-loop). The task board is the [task system](/en/s07-task-system). Specialists are [agent teams](/en/s09-agent-teams). Worktrees provide [isolation](/en/s12-worktree-task-isolation). Findings flow through [mailboxes](/en/s10-team-protocols). Synthesis uses a [subagent](/en/s04-subagent). And the entire system is wrapped in [guardrails](/en/s14-guardrails), [observability](/en/s15-observability), and [production infrastructure](/en/s16-shipping-to-production). This is not a new concept -- it is the assembly of everything you have learned.

## Phase 1: Planning the Review

The lead agent receives a PR diff and breaks it into reviewable chunks using the [TodoWrite](/en/s03-todo-write) planning approach and the [Task System](/en/s07-task-system) for persistence:

```python
import json

def plan_review(diff: str) -> list[dict]:
    """Use the LLM to analyze a diff and create review tasks."""
    prompt = f"""Analyze this PR diff and create specific review tasks.
For each concern, output a JSON task with:
- title: what to check
- category: security | performance | style
- files: list of relevant file paths
- priority: critical | high | medium | low

Diff:
{diff}"""

    messages = [{"role": "user", "content": prompt}]
    response = agent_loop(messages)  # s01 loop
    tasks = parse_tasks(response)

    # Persist tasks to disk via the task system (s07)
    for task in tasks:
        task_manager.create(
            title=task["title"],
            category=task["category"],
            files=task["files"],
            priority=task["priority"],
            status="pending",
            depends_on=[],  # DAG edges for ordering
        )

    return tasks
```

The task manager writes each task as a JSON file in `.tasks/`. This means tasks survive crashes -- if the agent restarts, it picks up where it left off. The `depends_on` field supports the DAG structure from [s07](/en/s07-task-system), so you can express ordering constraints like "run the security check before the summary."

## Phase 2: Assembling the Team

Each specialist agent gets a focused system prompt that shapes what it looks for. This is the [Agent Teams](/en/s09-agent-teams) pattern with identity, lifecycle, and role-based behavior:

```python
import threading

SPECIALIST_CONFIGS = {
    "security": {
        "name": "security",
        "role": "security reviewer",
        "system": (
            "You are a security reviewer. Examine the diff for: "
            "SQL injection, XSS, path traversal, authentication bypass, "
            "hardcoded secrets, insecure deserialization, missing input validation. "
            "Rate each finding: critical / high / medium / low. "
            "Output JSON: {\"findings\": [{\"issue\": ..., \"file\": ..., "
            "\"line\": ..., \"severity\": ..., \"fix\": ...}]}"
        ),
    },
    "performance": {
        "name": "performance",
        "role": "performance reviewer",
        "system": (
            "You are a performance reviewer. Examine the diff for: "
            "N+1 queries, unnecessary allocations, missing database indexes, "
            "O(n^2) algorithms where O(n) exists, synchronous I/O in hot paths, "
            "unbounded list growth, missing pagination. "
            "Estimate impact: high / medium / low. "
            "Output JSON: {\"findings\": [{\"issue\": ..., \"file\": ..., "
            "\"line\": ..., \"impact\": ..., \"suggestion\": ...}]}"
        ),
    },
    "style": {
        "name": "style",
        "role": "style reviewer",
        "system": (
            "You are a style reviewer. Examine the diff for: "
            "inconsistent naming conventions, missing type hints, dead code, "
            "functions over 40 lines, missing docstrings on public APIs, "
            "unused imports, magic numbers without constants. "
            "Suggest concrete fixes for each issue. "
            "Output JSON: {\"findings\": [{\"issue\": ..., \"file\": ..., "
            "\"line\": ..., \"suggestion\": ...}]}"
        ),
    },
}


def setup_review_team() -> list[dict]:
    """Initialize the team with specialist agents."""
    teammates = list(SPECIALIST_CONFIGS.values())
    init_team(teammates)  # s09: register teammates and create mailboxes
    return teammates
```

Notice that each specialist outputs structured JSON. This is critical for Phase 4 -- the lead agent needs to parse and aggregate findings programmatically, not read free-form text.

## Phase 3: Parallel Execution

Each specialist gets its own [worktree](/en/s12-worktree-task-isolation) and runs as an [autonomous agent](/en/s11-autonomous-agents) that claims tasks from the board:

```python
def execute_review(tasks: list, team: list):
    """Assign worktrees and let agents work autonomously in parallel."""

    # Create isolated worktrees for each specialist (s12)
    worktrees = {}
    for mate in team:
        wt_path = create_worktree(mate["name"])
        worktrees[mate["name"]] = wt_path

    # Launch each specialist in its own thread (s09 + s11)
    threads = []
    for mate in team:
        t = threading.Thread(
            target=specialist_loop,
            args=(mate, worktrees[mate["name"]]),
            daemon=True,
        )
        t.start()
        threads.append(t)

    # Wait for all specialists to finish (with timeout)
    wait_for_completion(task_manager, timeout=300)

    # Cleanup worktrees (s12)
    for name, path in worktrees.items():
        cleanup_worktree(path)


def specialist_loop(mate: dict, worktree_path: str):
    """Autonomous loop for a single specialist agent."""
    guardrail = GuardRail(REVIEW_PERMISSIONS)  # s14
    tracer = AgentTracer(f"reviewer-{mate['name']}")  # s15

    while True:
        # Claim a task matching this specialist's category (s11)
        task = task_manager.claim(
            category=mate["name"],
            agent_id=mate["name"],
        )
        if task is None:
            break  # No more tasks for this specialist

        tracer.record("task_claimed", {"task": task["title"]})

        # Build the review prompt with the relevant files
        file_contents = ""
        for f in task["files"]:
            path = os.path.join(worktree_path, f)
            if os.path.exists(path):
                content = read_file(path)  # s02: tool use
                file_contents += f"\n--- {f} ---\n{content}\n"

        messages = [{"role": "user", "content": (
            f"Review these files for {mate['name']} issues.\n"
            f"Task: {task['title']}\n"
            f"Files:\n{file_contents}"
        )}]

        # Run the agent loop with guardrails (s01 + s14)
        response = agent_loop_with_guardrails(
            messages=messages,
            system=mate["system"],
            guardrail=guardrail,
            tracer=tracer,
        )

        # Send findings to lead via mailbox (s10)
        send_message(
            from_agent=mate["name"],
            to_agent="lead",
            content=response,
        )

        # Mark task complete (s07)
        task_manager.update(task["id"], status="done")
        tracer.record("task_done", {"task": task["title"]})
```

Each specialist runs its own [agent loop](/en/s01-the-agent-loop) with the [guardrail](/en/s14-guardrails) layer checking every tool call. The [tracer](/en/s15-observability) records every claim, every tool execution, every completion. If a specialist loads a large file, [context compression](/en/s06-context-compact) can kick in to keep the conversation within token limits. And if a specialist needs domain-specific context -- say, a list of known vulnerability patterns -- [skill loading](/en/s05-skill-loading) can inject it on demand.

## Phase 4: Collecting Findings

Once all specialists finish, the lead agent drains their [mailboxes](/en/s10-team-protocols) and aggregates the structured outputs:

```python
def collect_findings(team: list) -> dict:
    """Drain all specialist mailboxes and aggregate findings."""
    findings = {"security": [], "performance": [], "style": []}

    # Drain the lead's inbox using the request-response protocol (s10)
    messages = drain_inbox("lead")

    for msg in messages:
        sender = msg["from"]
        if sender in findings:
            try:
                parsed = json.loads(msg["content"])
                findings[sender].extend(parsed.get("findings", []))
            except json.JSONDecodeError:
                # Fallback: treat raw text as a single finding
                findings[sender].append({
                    "issue": msg["content"],
                    "severity": "medium",
                    "raw": True,
                })

    # Sort each category by severity
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    for category in findings:
        findings[category].sort(
            key=lambda f: severity_order.get(
                f.get("severity", f.get("impact", "medium")), 2
            )
        )

    return findings
```

The fallback for non-JSON responses is important. Agents are probabilistic -- sometimes a specialist returns prose instead of JSON. Robust code handles both cases instead of crashing.

## Phase 5: Synthesizing the Review

A [subagent](/en/s04-subagent) takes all findings and produces a coherent, prioritized review summary:

```python
def synthesize_review(findings: dict) -> str:
    """Use a subagent to produce a unified review summary."""
    all_findings = json.dumps(findings, indent=2)

    # Context compression (s06) if findings are very large
    if len(all_findings) > 50000:
        all_findings = compress_context(all_findings, target_tokens=10000)

    summary = run_subagent(
        system="You are a senior engineer writing a code review summary.",
        prompt=f"""Synthesize these findings from three specialist reviewers
into a single, actionable code review.

Rules:
- Lead with critical/high severity issues
- Group by theme, not by reviewer
- Include file paths and line numbers
- End with a clear accept/request-changes/block verdict

Findings:
{all_findings}

Output format:
## Verdict: [APPROVE | REQUEST_CHANGES | BLOCK]

## Critical Issues
(list or "None found")

## Recommendations
(list)

## Style Suggestions
(list)

## Summary
(1-2 sentence overall assessment)
""",
    )
    return summary
```

The output format is structured so downstream systems can parse the verdict programmatically. A CI integration can block merges on `BLOCK`, request changes on `REQUEST_CHANGES`, and auto-approve on `APPROVE`.

## Putting It All Together

Here is the complete entry point that ties every session concept into one function:

```python
import os
import json
import threading
import anthropic

def run_code_review(diff: str) -> str:
    """Full production code review pipeline.

    Concepts used:
      s01: agent loop       s02: tool use        s03: planning
      s04: subagent         s05: skills           s06: compression
      s07: task system      s08: background       s09: teams
      s10: protocols        s11: autonomy         s12: worktrees
      s13: evals            s14: guardrails       s15: observability
      s16: production
    """
    # Production infrastructure (s15, s16)
    tracer = AgentTracer("code-review")
    cost_tracker = CostTracker(budget_limit_usd=5.0)
    guardrail = GuardRail(REVIEW_PERMISSIONS)

    tracer.record("review_start", {"diff_size": len(diff)})

    # Phase 1: Plan the review (s03 + s07)
    tasks = plan_review(diff)

    # Phase 2: Assemble the team (s09)
    team = setup_review_team()

    # Phase 3: Parallel execution (s11 + s12)
    execute_review(tasks, team)

    # Phase 4: Collect findings (s10)
    findings = collect_findings(team)

    # Phase 5: Synthesize (s04 + s06)
    summary = synthesize_review(findings)

    # Record completion (s15)
    tracer.record("review_complete", {
        "total_findings": sum(len(v) for v in findings.values()),
        "security_findings": len(findings["security"]),
        "performance_findings": len(findings["performance"]),
        "style_findings": len(findings["style"]),
        "total_cost_usd": cost_tracker.total_cost_usd(),
        "total_tokens": tracer.total_tokens(),
    })

    return summary


if __name__ == "__main__":
    import sys
    diff = fetch_pr_diff(sys.argv[1])  # e.g., python capstone.py PR_URL
    review = run_code_review(diff)
    print(review)
```

Count the session references. Every single concept from s01 through s16 appears in this system. The agent loop drives every agent. Tools let them read code. TodoWrite plans the review. Subagents synthesize findings. Skills load domain knowledge. Context compression handles large diffs. The task system persists state. Background tasks run tests. Teams coordinate specialists. Protocols define communication. Autonomous agents self-assign work. Worktrees provide isolation. Evals measure review quality. Guardrails enforce safety. Observability makes it all visible. Production infrastructure makes it reliable.

## Session Concept Map

| Session | Concept | Where It Appears in the Capstone |
|---------|---------|----------------------------------|
| [s01](/en/s01-the-agent-loop) | Agent Loop | Every agent -- lead and specialists -- runs the core loop |
| [s02](/en/s02-tool-use) | Tool Use | Specialists use `read_file` and `bash` to analyze code in worktrees |
| [s03](/en/s03-todo-write) | TodoWrite | Lead agent plans the review as a structured task list |
| [s04](/en/s04-subagent) | Subagents | Synthesis subagent produces the final unified review |
| [s05](/en/s05-skill-loading) | Skills | Specialists load domain-specific knowledge (vulnerability patterns, lint rules) |
| [s06](/en/s06-context-compact) | Context Compact | Compression kicks in when diffs or findings exceed token limits |
| [s07](/en/s07-task-system) | Task System | Review tasks persisted as a JSON DAG on disk |
| [s08](/en/s08-background-tasks) | Background Tasks | Test execution and linting run in background threads |
| [s09](/en/s09-agent-teams) | Agent Teams | Three specialist teammates plus one lead agent |
| [s10](/en/s10-team-protocols) | Team Protocols | Request-response mailboxes for findings collection |
| [s11](/en/s11-autonomous-agents) | Autonomous Agents | Specialists self-assign tasks from the board |
| [s12](/en/s12-worktree-task-isolation) | Worktree Isolation | Each specialist works in its own git worktree |
| [s13](/en/s13-agent-evals) | Agent Evals | Eval suite scores review quality against known bugs |
| [s14](/en/s14-guardrails) | Guardrails | Permission checks on every tool call in every agent |
| [s15](/en/s15-observability) | Observability | Full trace of every review session for debugging |
| [s16](/en/s16-shipping-to-production) | Production | Retries, streaming, cost tracking, model routing |

## Key Takeaway

The harness is complete. From a single `while True` loop in [session 1](/en/s01-the-agent-loop), you built a system where multiple agents autonomously coordinate to perform complex work in parallel -- with planning, isolation, safety, observability, and production readiness baked in. The model provides the intelligence. The code you wrote is the harness that makes that intelligence useful, safe, and reliable. You did not learn 16 disconnected ideas. You learned 16 layers of the same system, each building on the last. Now you know how to build it from scratch.
