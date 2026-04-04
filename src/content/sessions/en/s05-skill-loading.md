---
title: "Skills"
session: "s05"
phase: 2
motto: "Load knowledge when you need it, not upfront"
order: 5
readingTime: 15
beginnerConcepts:
  - question: "What is a skill in this context?"
    answer: "A markdown file (SKILL.md) containing domain-specific instructions -- like a git workflow guide or a code review checklist. The agent loads it on demand rather than having all knowledge stuffed into the system prompt."
  - question: "What's the two-layer approach?"
    answer: "Layer 1: short skill descriptions in the system prompt (cheap, always visible). Layer 2: full skill content loaded via tool_result when the model requests it (expensive, on-demand). This saves tokens."
  - question: "Why not put everything in the system prompt?"
    answer: "10 skills at 2000 tokens each = 20,000 tokens of instructions, most irrelevant to any given task. The two-layer approach costs ~100 tokens per skill in the system prompt. Full content loads only when needed."
  - question: "How does the model know which skill to load?"
    answer: "The system prompt lists available skill names with short descriptions. The model reads those and decides which skill is relevant to the current task, then calls load_skill('name') to get the full instructions."
walkthroughs:
  - title: "The Skill Loading Mechanism"
    language: "python"
    code: |
      class SkillLoader:
          def __init__(self, skills_dir: Path):
              self.skills = {}
              for f in sorted(skills_dir.rglob("SKILL.md")):
                  text = f.read_text()
                  meta, body = self._parse_frontmatter(text)
                  name = meta.get("name", f.parent.name)
                  self.skills[name] = {"meta": meta, "body": body}

          def get_descriptions(self) -> str:
              lines = []
              for name, skill in self.skills.items():
                  desc = skill["meta"].get("description", "")
                  lines.append(f"  - {name}: {desc}")
              return "\n".join(lines)

          def get_content(self, name: str) -> str:
              skill = self.skills.get(name)
              if not skill:
                  return f"Error: Unknown skill '{name}'."
              return f"<skill name=\"{name}\">\n{skill['body']}\n</skill>"

      TOOL_HANDLERS = {
          "load_skill": lambda **kw: SKILL_LOADER.get_content(kw["name"]),
      }
    steps:
      - lines: [1, 8]
        annotation: "`__init__` scans the skills directory recursively for any `SKILL.md` file. It parses YAML frontmatter to get metadata (name, description) and stores the body separately. The directory name is used as fallback if `'name'` is missing from frontmatter."
      - lines: [10, 15]
        annotation: "`get_descriptions()` builds the Layer 1 text — the cheap menu injected into the system prompt. Each skill appears as a one-liner with its name and short description. This costs ~100 tokens regardless of how large the skill bodies are."
      - lines: [17, 21]
        annotation: "`get_content()` is Layer 2 — the expensive on-demand load. It wraps the full skill body in a `<skill>` XML tag so the model can identify where the skill content starts and ends in its context."
      - lines: [23, 25]
        annotation: "`load_skill` is just another tool handler. When the model calls `load_skill('git')`, this lambda runs `get_content('git')` and returns the full skill body as a `tool_result`. No special loop changes needed."
challenge:
  text: "Write your own SKILL.md file for a domain you know — cooking, music, or your work domain. Load it into the agent."
  hint: "Place it in the skills/ directory and the agent will find it"
---

## The Problem

You want the agent to follow domain-specific workflows: git conventions, testing patterns, code review checklists. Putting everything in the system prompt wastes tokens on unused skills. 10 skills at 2000 tokens each = 20,000 tokens, most of which are irrelevant to any given task.

## The Solution

```
System prompt (Layer 1 -- always present):
+--------------------------------------+
| You are a coding agent.              |
| Skills available:                    |
|   - git: Git workflow helpers        |  ~100 tokens/skill
|   - test: Testing best practices     |
+--------------------------------------+

When model calls load_skill("git"):
+--------------------------------------+
| tool_result (Layer 2 -- on demand):  |
| <skill name="git">                   |
|   Full git workflow instructions...  |  ~2000 tokens
|   Step 1: ...                        |
| </skill>                             |
+--------------------------------------+
```

Layer 1: skill *names* in system prompt (cheap). Layer 2: full *body* via tool_result (on demand).

## How It Works

1. Each skill is a directory containing a `SKILL.md` with YAML frontmatter.

```
skills/
  pdf/
    SKILL.md       # ---\n name: pdf\n description: Process PDF files\n ---\n ...
  code-review/
    SKILL.md       # ---\n name: code-review\n description: Review code\n ---\n ...
```

2. SkillLoader scans for `SKILL.md` files, uses the directory name as the skill identifier.

```python
class SkillLoader:
    def __init__(self, skills_dir: Path):
        self.skills = {}
        for f in sorted(skills_dir.rglob("SKILL.md")):
            text = f.read_text()
            meta, body = self._parse_frontmatter(text)
            name = meta.get("name", f.parent.name)
            self.skills[name] = {"meta": meta, "body": body}

    def get_descriptions(self) -> str:
        lines = []
        for name, skill in self.skills.items():
            desc = skill["meta"].get("description", "")
            lines.append(f"  - {name}: {desc}")
        return "\n".join(lines)

    def get_content(self, name: str) -> str:
        skill = self.skills.get(name)
        if not skill:
            return f"Error: Unknown skill '{name}'."
        return f"<skill name=\"{name}\">\n{skill['body']}\n</skill>"
```

3. Layer 1 goes into the system prompt. Layer 2 is just another tool handler.

```python
SYSTEM = f"""You are a coding agent at {WORKDIR}.
Skills available:
{SKILL_LOADER.get_descriptions()}"""

TOOL_HANDLERS = {
    # ...base tools...
    "load_skill": lambda **kw: SKILL_LOADER.get_content(kw["name"]),
}
```

The model learns what skills exist (cheap) and loads them when relevant (expensive).

## What Changed From [Subagents](/en/s04-subagent)

| Component      | Before (Subagents) | After (Skills)             |
|----------------|------------------|----------------------------|
| Tools          | 5 (base + task)  | 5 (base + load_skill)      |
| System prompt  | Static string    | + skill descriptions       |
| Knowledge      | None             | skills/*/SKILL.md files    |
| Injection      | None             | Two-layer (system + result)|

## Key Takeaway

On-demand knowledge loading is a token optimization pattern. Instead of front-loading all instructions, you expose a menu (cheap) and load full content (expensive) only when the model decides it's relevant. This pattern scales to hundreds of skills without bloating every conversation.
