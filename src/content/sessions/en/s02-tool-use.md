---
title: "Tool Use"
session: "s02"
phase: 1
motto: "Adding a tool means adding one handler"
order: 2
readingTime: 15
beginnerConcepts:
  - question: "What's a dispatch map?"
    answer: "A dictionary that maps tool names to their handler functions. When the model calls 'read_file', the dispatch map looks up which Python function handles that — like a phone directory for tools."
  - question: "Why do we sandbox file paths?"
    answer: "To prevent the agent from reading or writing files outside the project directory. The safe_path() function checks that any requested path stays within the workspace — a basic security boundary."
  - question: "What's path traversal?"
    answer: "A trick where someone uses '../' in a file path to escape the intended directory. For example, '../../etc/passwd' tries to read system files. Our sandbox blocks this."
walkthroughs:
  - title: "The Dispatch Map"
    language: "python"
    code: |
      def safe_path(p: str) -> Path:
          path = (WORKDIR / p).resolve()
          if not path.is_relative_to(WORKDIR):
              raise ValueError(f"Path escapes workspace: {p}")
          return path

      def run_read(path: str, limit: int = None) -> str:
          text = safe_path(path).read_text()
          lines = text.splitlines()
          if limit and limit < len(lines):
              lines = lines[:limit]
          return "\n".join(lines)[:50000]

      def run_write(path: str, content: str) -> str:
          fp = safe_path(path)
          fp.parent.mkdir(parents=True, exist_ok=True)
          fp.write_text(content)
          return f"Wrote {len(content)} bytes to {path}"

      def run_edit(path: str, old_text: str, new_text: str) -> str:
          fp = safe_path(path)
          content = fp.read_text()
          if old_text not in content:
              return f"Error: Text not found in {path}"
          fp.write_text(content.replace(old_text, new_text, 1))
          return f"Edited {path}"

      TOOL_HANDLERS = {
          "bash":       lambda **kw: run_bash(kw["command"]),
          "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
          "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
          "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"], kw["new_text"]),
      }
    steps:
      - lines: [1, 5]
        annotation: "`safe_path()` is the security boundary. It resolves the path and checks it stays inside `WORKDIR`. Any '../' escape attempt raises an error before touching the filesystem."
      - lines: [7, 12]
        annotation: "`run_read` passes through `safe_path` first, then reads the file. The optional `limit` parameter truncates long files to avoid flooding the context with thousands of lines."
      - lines: [14, 18]
        annotation: "`run_write` creates parent directories automatically. A single `write_file` call can create deeply nested files without requiring a separate `mkdir()` step."
      - lines: [20, 25]
        annotation: "`run_edit` does a targeted string replacement — safer than rewriting the whole file. If `old_text` is not found, it returns an error instead of silently corrupting the file."
      - lines: [27, 32]
        annotation: "`TOOL_HANDLERS` maps tool names to lambda wrappers. Each lambda unpacks keyword arguments from `block.input` and calls the appropriate handler. Adding a fifth tool means adding one entry here."
challenge:
  text: "Add a fifth tool — `list_files` — that lists directory contents. You only need a schema and a handler."
  hint: "Use os.listdir() in the handler and return the joined filenames"
---

## The Problem

[The Agent Loop](/en/s01-the-agent-loop) session gave the agent one tool: bash. That works, but it's a blunt instrument. Every file read requires `cat`, every write requires `echo >`, every edit requires `sed`. The model wastes tokens on shell syntax when it could use purpose-built tools.

## The Solution

Add tools to the array. Add handlers to the dispatch map. The loop doesn't change.

```python
TOOL_HANDLERS = {
    "bash":       run_bash,
    "read_file":  run_read,
    "write_file": run_write,
    "edit_file":  run_edit,
}
```

That's the key insight: **the loop stays identical from the first session. Only the tools array and dispatch map grow.**

## The Dispatch Map

```python
def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve()
    if not path.is_relative_to(WORKDIR):
        raise ValueError(f"Path escapes workspace: {p}")
    return path

def run_read(path: str, limit: int = None) -> str:
    text = safe_path(path).read_text()
    lines = text.splitlines()
    if limit and limit < len(lines):
        lines = lines[:limit]
    return "\n".join(lines)[:50000]

def run_write(path: str, content: str) -> str:
    fp = safe_path(path)
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(content)
    return f"Wrote {len(content)} bytes to {path}"

def run_edit(path: str, old_text: str, new_text: str) -> str:
    fp = safe_path(path)
    content = fp.read_text()
    if old_text not in content:
        return f"Error: Text not found in {path}"
    fp.write_text(content.replace(old_text, new_text, 1))
    return f"Edited {path}"

TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"], kw["new_text"]),
}
```

## What Changed from [The Agent Loop](/en/s01-the-agent-loop)

| Component | The Agent Loop | Tool Use |
|-----------|-----|-----|
| Loop | `while True` + `stop_reason` | **Same** |
| Tools | 1 (bash) | 4 (bash, read, write, edit) |
| Dispatch | Direct call | Map: `{name: handler}` |
| Safety | Command blocklist | + Path sandboxing |

The loop is identical. The only growth is in the tools array and the dispatch map. This pattern scales indefinitely — subsequent sessions keep adding tools without touching the loop.

## Key Takeaway

Adding a tool to an agent means two things: (1) a JSON schema the model sees, (2) a handler function the harness calls. The loop never changes. This is the foundation of harness engineering — the model gets more capable without the core architecture growing more complex.
