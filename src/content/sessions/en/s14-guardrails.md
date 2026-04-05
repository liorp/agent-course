---
title: "Guardrails & Safety"
session: "s14"
phase: 5
motto: "Trust but verify — then verify again"
order: 14
readingTime: 25
prerequisites:
  - "s01-the-agent-loop"
  - "s02-tool-use"
  - "s13-agent-evals"
whatYouBuild: "A layered permission system with tool-level guards, cost caps, human-in-the-loop approval, and container sandboxing."
beginnerConcepts:
  - question: "Why isn't a blocklist enough for safety?"
    answer: "A blocklist like ['rm -rf /', 'sudo'] is trivially bypassed — 'rm -rf /' works with extra spaces, environment variables, or aliases. Real safety needs structural controls: sandboxed execution, capability-based permissions, and cost limits."
  - question: "What is human-in-the-loop?"
    answer: "A pattern where the agent pauses before executing dangerous actions and asks the user for approval. The harness intercepts the tool call, shows it to the user, and only proceeds if they confirm."
  - question: "What are capability-based permissions?"
    answer: "Instead of blocking bad things (blocklist), you explicitly allow only good things (allowlist). An agent with 'read-only filesystem' capability can read any file but write none. This is safer because unknown commands are denied by default."
walkthroughs:
  - title: "Layered Permission System"
    language: "python"
    code: |
      @dataclass
      class ToolPermission:
          tool_name: str
          auto_approve: bool = False
          requires_approval: bool = False
          denied: bool = False
          cost_limit: float | None = None

      class GuardRail:
          def __init__(self, permissions: list[ToolPermission]):
              self.perms = {p.tool_name: p for p in permissions}
              self.total_cost = 0.0
              self.cost_cap = 5.00  # dollars

          def check(self, tool_name: str, tool_input: dict) -> str:
              perm = self.perms.get(tool_name)
              if not perm or perm.denied:
                  return "DENIED"
              if self.total_cost > self.cost_cap:
                  return "COST_CAP_EXCEEDED"
              if perm.requires_approval:
                  return "NEEDS_APPROVAL"
              if perm.auto_approve:
                  if self._is_dangerous(tool_name, tool_input):
                      return "NEEDS_APPROVAL"
                  return "APPROVED"
              return "NEEDS_APPROVAL"

          def _is_dangerous(self, tool_name: str, tool_input: dict) -> bool:
              if tool_name == "bash":
                  cmd = tool_input.get("command", "")
                  write_patterns = ["rm ", "mv ", ">", "chmod", "kill"]
                  return any(p in cmd for p in write_patterns)
              if tool_name == "write_file":
                  path = tool_input.get("path", "")
                  return ".env" in path or "credentials" in path
              return False
    steps:
      - lines: [1, 6]
        annotation: "`ToolPermission` defines the policy for one tool. Each tool can be auto-approved (fast path), require human approval, or be completely denied. The optional cost_limit caps spending per tool."
      - lines: [8, 12]
        annotation: "`GuardRail` holds the full permission map and tracks cumulative cost. The `cost_cap` is a hard ceiling — once the agent spends $5, all further tool calls are blocked regardless of permissions."
      - lines: [14, 26]
        annotation: "`check()` is called before every tool execution. It returns a verdict string that the harness acts on. The priority order is: denied > cost cap > requires approval > auto-approve with danger check."
      - lines: [28, 35]
        annotation: "`_is_dangerous()` applies heuristic checks within auto-approved tools. Even if bash is auto-approved for reads, write-like commands (`rm`, `mv`, `>`) get escalated to human approval. This is defense in depth."
challenges:
  - tier: "warmup"
    text: "List 3 ways to bypass the blocklist from [The Agent Loop](/en/s01-the-agent-loop) (`['rm -rf /', 'sudo']`). Then explain why capability-based permissions don't have these holes."
    hint: "Think about: environment variables ($SHELL), encoding, command chaining (&&), and aliases."
  - tier: "build"
    text: "Implement the full guardrail system: add a `human_approve()` function that prints the pending tool call and waits for y/n input. Integrate it into the agent loop from [The Agent Loop](/en/s01-the-agent-loop)."
    hint: "Insert the guard check between tool call parsing and tool execution in the loop."
  - tier: "stretch"
    text: "Add container sandboxing: wrap bash tool execution in `docker run --rm --network none` so the agent can't access the network or host filesystem."
    hint: "Mount only the workspace directory as a volume. Use `--read-only` flag with a writable tmpfs for /tmp."
---

## The Problem

In [The Agent Loop](/en/s01-the-agent-loop), we added a blocklist to the bash tool:

```python
dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]
if any(d in command for d in dangerous):
    return "Error: Dangerous command blocked"
```

This feels safe. It is not. Here are three ways to bypass it in seconds:

**Bypass 1: Extra whitespace.** The blocklist checks for `"rm -rf /"` but `rm  -rf  /` (double spaces) slips through. So does `rm -r -f /`.

**Bypass 2: Environment variable expansion.** `$SHELL -c "rm -rf /"` runs the dangerous command inside a subshell. The blocklist sees `$SHELL -c ...`, not `rm -rf /`.

**Bypass 3: Command chaining.** `echo hello && sudo reboot` — the blocklist checks the whole string for `"sudo"`, which does match. But `echo hello && su -c reboot` does not. Neither does `doas reboot`, `pkexec reboot`, or writing a script to disk and executing it.

The fundamental flaw: blocklists try to enumerate everything bad. The set of dangerous commands is infinite. You cannot win this game.

## The Solution

Instead of one fragile check, we build five layers of defense. Each layer catches what the previous one missed:

```
Layer 1: Capability-Based Permissions  — only allowed tools can run
Layer 2: Danger Heuristics             — pattern-match within allowed tools
Layer 3: Human-in-the-Loop             — ask the user before risky actions
Layer 4: Cost Caps                     — hard budget ceiling stops runaway agents
Layer 5: Container Sandboxing          — even if all else fails, blast radius is contained
```

No single layer is perfect. Together, they make catastrophic failure extremely unlikely.

## Layer 1: Capability-Based Permissions

The core idea: instead of blocking bad things, explicitly allow only good things.

```python
from dataclasses import dataclass

@dataclass
class ToolPermission:
    tool_name: str
    auto_approve: bool = False
    requires_approval: bool = False
    denied: bool = False
    cost_limit: float | None = None

# Define the policy up front
permissions = [
    ToolPermission("bash", auto_approve=True),
    ToolPermission("read_file", auto_approve=True),
    ToolPermission("write_file", requires_approval=True),
    ToolPermission("execute_sql", denied=True),
]
```

Any tool not in the permissions list is denied by default. This is the opposite of a blocklist — unknown tools are blocked, not allowed. If the model hallucinates a tool name like `deploy_to_production`, the harness rejects it immediately.

```python
class GuardRail:
    def __init__(self, permissions: list[ToolPermission]):
        self.perms = {p.tool_name: p for p in permissions}
        self.total_cost = 0.0
        self.cost_cap = 5.00  # dollars

    def check(self, tool_name: str, tool_input: dict) -> str:
        perm = self.perms.get(tool_name)
        if not perm or perm.denied:
            return "DENIED"
        if self.total_cost > self.cost_cap:
            return "COST_CAP_EXCEEDED"
        if perm.requires_approval:
            return "NEEDS_APPROVAL"
        if perm.auto_approve:
            if self._is_dangerous(tool_name, tool_input):
                return "NEEDS_APPROVAL"
            return "APPROVED"
        return "NEEDS_APPROVAL"
```

The `check()` method returns a verdict. The harness code acts on it — it never silently proceeds.

## Layer 2: Danger Heuristics

Even auto-approved tools need inspection. Reading files is safe; deleting them is not. Both go through the `bash` tool.

```python
def _is_dangerous(self, tool_name: str, tool_input: dict) -> bool:
    if tool_name == "bash":
        cmd = tool_input.get("command", "")
        write_patterns = ["rm ", "mv ", ">", "chmod", "kill", "curl ", "wget "]
        return any(p in cmd for p in write_patterns)
    if tool_name == "write_file":
        path = tool_input.get("path", "")
        sensitive = [".env", "credentials", ".ssh", ".git/config"]
        return any(s in path for s in sensitive)
    return False
```

This is still pattern matching, which means it is still bypassable. That is fine. This layer is not the last line of defense — it is an early warning system. It escalates suspicious commands to the human rather than blocking them outright.

## Layer 3: Human-in-the-Loop

When a tool call gets the `NEEDS_APPROVAL` verdict, the agent pauses and asks the user:

```python
def human_approve(tool_name: str, tool_input: dict) -> bool:
    print(f"\n{'='*50}")
    print(f"APPROVAL REQUIRED: {tool_name}")
    print(f"Input: {json.dumps(tool_input, indent=2)}")
    print(f"{'='*50}")
    while True:
        answer = input("Allow? [y/n]: ").strip().lower()
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
```

This integrates into the agent loop from [The Agent Loop](/en/s01-the-agent-loop) between tool call parsing and tool execution:

```python
def agent_loop(messages: list, guard: GuardRail):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue

            verdict = guard.check(block.name, block.input)

            if verdict == "DENIED":
                output = f"Error: Tool '{block.name}' is not permitted."
            elif verdict == "COST_CAP_EXCEEDED":
                output = "Error: Cost cap exceeded. No further tool calls allowed."
            elif verdict == "NEEDS_APPROVAL":
                if human_approve(block.name, block.input):
                    output = execute_tool(block.name, block.input)
                else:
                    output = "Error: User denied this action."
            else:  # APPROVED
                output = execute_tool(block.name, block.input)

            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": output,
            })
        messages.append({"role": "user", "content": results})
```

The model receives the denial as a tool result. It can adapt — ask a different way, explain why it needs the action, or move on.

## Layer 4: Cost Caps

Every API call costs money. A runaway agent in a loop can burn through your budget in minutes.

```python
def track_cost(self, response) -> None:
    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    # Approximate pricing (adjust for your model)
    cost = (input_tokens * 0.003 + output_tokens * 0.015) / 1000
    self.total_cost += cost

def get_cost_report(self) -> str:
    remaining = self.cost_cap - self.total_cost
    return f"Spent: ${self.total_cost:.4f} / ${self.cost_cap:.2f} (${remaining:.4f} remaining)"
```

Call `track_cost()` after every API response. Once `total_cost` exceeds `cost_cap`, the `check()` method returns `COST_CAP_EXCEEDED` for every tool call, and the agent is effectively halted.

This is a hard stop. Unlike the other layers, there is no override. If the agent needs more budget, a human must explicitly raise the cap.

## Layer 5: Container Sandboxing

The ultimate fallback: even if the agent bypasses permissions, heuristics, approval, and cost limits, it cannot escape the container.

```python
def run_bash_sandboxed(command: str, workspace: str) -> str:
    docker_cmd = [
        "docker", "run", "--rm",
        "--network", "none",           # no internet access
        "--read-only",                  # read-only root filesystem
        "--tmpfs", "/tmp:size=100m",    # writable /tmp, capped at 100MB
        "-v", f"{workspace}:/work",     # mount only the workspace
        "-w", "/work",                  # set working directory
        "--memory", "512m",             # memory limit
        "--cpus", "1.0",                # CPU limit
        "python:3.12-slim",            # minimal image
        "bash", "-c", command,
    ]
    try:
        r = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=120)
        out = (r.stdout + r.stderr).strip()
        return out[:50000] if out else "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: Timeout (120s)"
```

What the container prevents:
- **Network access** (`--network none`) — no data exfiltration, no downloading malware
- **Host filesystem access** — only the workspace is mounted, nothing else
- **Resource exhaustion** — memory and CPU are capped
- **Persistent damage** (`--rm`) — the container is destroyed after each command

The agent can still do anything it wants *inside the workspace*. That is intentional — it needs to write code and run tests. But it cannot touch anything outside that boundary.

## What Changed From [Agent Evals](/en/s13-agent-evals)

| Concern | Evals | Guardrails |
|---------|-------------|-------------------|
| When it runs | Before deployment (test time) | During deployment (runtime) |
| What it catches | Wrong outputs, regressions | Dangerous actions, cost overruns |
| Feedback loop | Eval score drives iteration | Verdict drives approval/denial |
| Failure mode | Bad score, agent gets improved | Blocked action, agent gets denied |
| Who is protected | Developers (quality) | Users and systems (safety) |

Evals answer: "Does the agent work correctly?" Guardrails answer: "Is the agent working safely?" You need both. Evals without guardrails ship a capable but dangerous agent. Guardrails without evals ship a safe but broken one.

## Key Takeaway

Safety is not a single check — it is a stack. Capability permissions deny unknown tools. Heuristics escalate suspicious inputs. Human-in-the-loop catches what heuristics miss. Cost caps prevent runaway spending. Container sandboxing contains the blast radius when everything else fails. Each layer is imperfect alone. Together, they make the gap between "agent misbehaves" and "actual damage" as wide as possible. Build all five into your harness before you let an agent run unsupervised.
