---
title: "The Agent Loop"
session: "s01"
phase: 1
motto: "One loop & Bash is all you need"
order: 1
readingTime: 15
beginnerConcepts:
  - question: "What's an API?"
    answer: "An API (Application Programming Interface) is a way for programs to talk to each other. When we call the Claude API, we send text and get a response back — like texting a very smart friend."
  - question: "What does 'while True' mean?"
    answer: "It's a loop that runs forever until something tells it to stop. In our agent, it keeps running until the model decides it's done (stop_reason is not 'tool_use')."
  - question: "What's a tool call?"
    answer: "When the AI model wants to do something in the real world (run a command, read a file), it sends back a special 'tool_use' message instead of regular text. Our code then executes that action and sends the result back."
walkthroughs:
  - title: "The Core Agent Loop"
    language: "python"
    code: |
      def agent_loop(messages):
          while True:
              response = client.messages.create(
                  model=MODEL, system=SYSTEM,
                  messages=messages, tools=TOOLS,
                  max_tokens=8000,
              )
              messages.append({"role": "assistant",
                               "content": response.content})

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
    steps:
      - lines: [2, 2]
        annotation: "The infinite loop. It keeps running until the model decides to stop. This is the heartbeat of every agent."
      - lines: [3, 7]
        annotation: "Send the full conversation history + tool definitions to the LLM. The model sees everything that happened so far."
      - lines: [8, 9]
        annotation: "Append the model's response to the conversation history so it remembers what it said."
      - lines: [11, 12]
        annotation: "The exit condition. If the model didn't ask to use a tool, it's done thinking — return to the user."
      - lines: [14, 21]
        annotation: "Execute each tool call the model requested. Collect the results into tool_result messages."
      - lines: [22, 22]
        annotation: "Feed the tool results back as a 'user' message. The model will see these results on the next iteration and decide what to do next."
---

## The Problem

How does a language model go from generating text to actually **doing things** in the real world?

The model can reason, plan, and generate code — but it has no hands. It can't run a command, read a file, or check the result. It's a brain in a jar.

## The Solution

One loop. One tool. That's the entire architecture.

```
while True:
  response = LLM(messages, tools)
  if stop_reason != "tool_use": return
  execute tools
  append results
  loop back
```

The model decides when to call tools and when to stop. The code just executes what the model asks for.

## The Core Loop

```python
def agent_loop(messages):
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
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

Four steps, repeated:
1. **Append** the user prompt to messages
2. **Send** messages + tool definitions to the LLM
3. **Check** `stop_reason` — if it's not `tool_use`, the model is done
4. **Execute** each tool call, append the results, loop back

## The Bash Tool

```python
TOOLS = [{
    "name": "bash",
    "description": "Run a shell command.",
    "input_schema": {
        "type": "object",
        "properties": {"command": {"type": "string"}},
        "required": ["command"],
    },
}]

def run_bash(command: str) -> str:
    dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]
    if any(d in command for d in dangerous):
        return "Error: Dangerous command blocked"
    r = subprocess.run(command, shell=True, cwd=os.getcwd(),
                       capture_output=True, text=True, timeout=120)
    out = (r.stdout + r.stderr).strip()
    return out[:50000] if out else "(no output)"
```

One tool definition. One handler. The model now has hands — it can run any shell command and read the output.

## The Full Implementation

```python
#!/usr/bin/env python3
"""s01_agent_loop.py - The Agent Loop"""

import os, subprocess
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv(override=True)
client = Anthropic()
MODEL = os.environ["MODEL_ID"]
SYSTEM = f"You are a coding agent at {os.getcwd()}. Use bash to solve tasks."

TOOLS = [{
    "name": "bash",
    "description": "Run a shell command.",
    "input_schema": {
        "type": "object",
        "properties": {"command": {"type": "string"}},
        "required": ["command"],
    },
}]

def run_bash(command: str) -> str:
    dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]
    if any(d in command for d in dangerous):
        return "Error: Dangerous command blocked"
    try:
        r = subprocess.run(command, shell=True, cwd=os.getcwd(),
                           capture_output=True, text=True, timeout=120)
        out = (r.stdout + r.stderr).strip()
        return out[:50000] if out else "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: Timeout (120s)"

def agent_loop(messages: list):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return
        results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"\033[33m$ {block.input['command']}\033[0m")
                output = run_bash(block.input["command"])
                print(output[:200])
                results.append({"type": "tool_result",
                                "tool_use_id": block.id,
                                "content": output})
        messages.append({"role": "user", "content": results})

if __name__ == "__main__":
    history = []
    while True:
        try:
            query = input("\033[36ms01 >> \033[0m")
        except (EOFError, KeyboardInterrupt):
            break
        if query.strip().lower() in ("q", "exit", ""):
            break
        history.append({"role": "user", "content": query})
        agent_loop(history)
```

## Key Takeaway

The entire secret of an AI coding agent is this loop. The model is the intelligence — it decides what to do. The code is just the harness — it gives the model a tool and feeds back results. In the next session ([Tool Use](/en/s02-tool-use)), we'll add more tools without changing the loop at all.
