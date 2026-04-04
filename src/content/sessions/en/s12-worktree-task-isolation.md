---
title: "Worktree + Task Isolation"
session: "s12"
phase: 4
motto: "Each works in its own directory, no interference"
order: 12
readingTime: 30
beginnerConcepts:
  - question: "What is a git worktree?"
    answer: "A worktree is a separate working directory linked to the same git repository. Each worktree can be on a different branch, letting multiple agents work on different tasks without file conflicts."
  - question: "Why do agents need isolation?"
    answer: "When multiple agents edit the same files simultaneously, they can overwrite each other's work. Worktrees give each agent its own copy of the codebase to work in safely."
  - question: "How do tasks and worktrees connect?"
    answer: "Each task gets assigned a worktree by ID. The task tracks what needs to be done, the worktree provides where to do it. When the task completes, the worktree can be merged and cleaned up."
walkthroughs:
  - title: "Worktree Lifecycle: Create, Assign, Cleanup"
    language: "python"
    code: |
      def create_worktree(task_id: str) -> str:
          branch = f"task/{task_id}"
          path = f".worktrees/{task_id}"
          subprocess.run(
              ["git", "worktree", "add", "-b", branch, path],
              check=True
          )
          return path

      def assign_worktree(task_id: str) -> dict:
          worktree_path = create_worktree(task_id)
          task = task_manager.get(task_id)
          task["worktree"] = worktree_path
          task["branch"] = f"task/{task_id}"
          task_manager.update(task)
          return task

      def cleanup_worktree(task_id: str) -> None:
          path = f".worktrees/{task_id}"
          subprocess.run(
              ["git", "worktree", "remove", path],
              check=True
          )
    steps:
      - lines: [1, 8]
        annotation: "`create_worktree()` runs `git worktree add` with `-b` to create a new branch simultaneously. The worktree lives in `.worktrees/<task_id>/` — a fully functional git working directory on its own branch."
      - lines: [10, 16]
        annotation: "`assign_worktree()` binds the worktree to the task record. After this call, the task JSON file contains both what to do (title, description) and where to do it (worktree path and branch name)."
      - lines: [18, 23]
        annotation: "`cleanup_worktree()` removes the worktree directory and deregisters it from git's worktree list. This should be called after merging the branch — the task is done, the isolation lane is released."
challenge:
  text: "Create 3 tasks, assign each a worktree, and verify they can edit the same file independently."
  hint: "After each completes, merge the branches and resolve any conflicts"
---

## The Problem

In the [Agent Teams](/en/s09-agent-teams) through [Autonomous Agents](/en/s11-autonomous-agents) sessions, teammates coordinate through tasks and mailboxes — but they all share the same working directory. If two agents edit the same file simultaneously, they'll corrupt each other's work. The team can plan together, but they can't *execute* together.

## The Solution

Give each agent its own directory. Git worktrees provide exactly this: separate working directories linked to the same repository, each on its own branch. One task = one worktree = one isolated execution lane.

```
Task s12-feat-auth  ──→  .worktrees/s12-feat-auth/   (branch: task/s12-feat-auth)
Task s12-fix-typo   ──→  .worktrees/s12-fix-typo/    (branch: task/s12-fix-typo)
Task s12-add-tests  ──→  .worktrees/s12-add-tests/   (branch: task/s12-add-tests)
```

## Worktree Lifecycle

```python
def create_worktree(task_id: str) -> str:
    branch = f"task/{task_id}"
    path = f".worktrees/{task_id}"
    subprocess.run(["git", "worktree", "add", "-b", branch, path], check=True)
    return path

def cleanup_worktree(task_id: str):
    path = f".worktrees/{task_id}"
    subprocess.run(["git", "worktree", "remove", path], check=True)
```

Three operations:
1. **Create** — `git worktree add` makes a new directory with its own branch
2. **Work** — the agent operates entirely within that directory
3. **Cleanup** — `git worktree remove` deletes the directory after merging

## Binding Tasks to Worktrees

```python
def assign_worktree(task_id: str) -> dict:
    worktree_path = create_worktree(task_id)
    task = task_manager.get(task_id)
    task["worktree"] = worktree_path
    task["branch"] = f"task/{task_id}"
    task_manager.update(task)
    return task
```

The task record now carries its execution context. Any agent picking up this task knows exactly where to work.

## The Full Pattern

```
Lead Agent:
  1. Create task in task system
  2. Create worktree for task
  3. Bind task to worktree
  4. Teammate claims task
  5. Teammate works in worktree
  6. Teammate completes task
  7. Lead merges branch
  8. Lead removes worktree
```

This is the culmination of the entire course: the [Tasks](/en/s07-task-system) session manages goals, the [Team Protocols](/en/s10-team-protocols) session manages communication, the [Autonomous Agents](/en/s11-autonomous-agents) session manages assignment, and worktrees manage isolation. Each mechanism handles one concern. Together, they enable true parallel execution.

## What Changed from [Autonomous Agents](/en/s11-autonomous-agents)

| Component | Autonomous Agents | Worktree + Task Isolation |
|-----------|-----|-----|
| Task claiming | Auto-claim from shared board | Same |
| Execution | Shared directory | Isolated worktree per task |
| Branches | None | One branch per task |
| Cleanup | Manual | Worktree remove after merge |

## Key Takeaway

Isolation is the final piece. With worktrees, agents can truly work in parallel — each in their own directory, on their own branch, with no interference. The harness is now complete: loop, tools, planning, knowledge, context management, persistence, teams, protocols, autonomy, and isolation. You have learned to build the world the intelligence inhabits.
