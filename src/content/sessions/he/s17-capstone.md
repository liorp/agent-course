---
title: "פרויקט גמר: סוכן סקירת קוד"
session: "s17"
phase: 5
motto: "כל מה שלמדת, במערכת אחת"
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
whatYouBuild: "מערכת סקירת קוד מרובת סוכנים שבה סוכן ראשי מקבל diff של PR, מפעיל סוקרים מומחים (אבטחה, ביצועים, סגנון), מתאם אותם דרך תיבות דואר, ומפיק סיכום סקירה מאוחד."
beginnerConcepts:
  - question: "למה סוכן סקירת קוד?"
    answer: "סקירת קוד היא פרויקט הגמר המושלם כי היא דורשת באופן טבעי הכול: קריאת קבצים (כלים), האצלה למומחים (תת-סוכנים/צוותים), תיאום ממצאים (תיבות דואר/פרוטוקולים), הרצת בדיקות בבידוד (worktrees), ויצירת פלט מובנה. זה מורכב מספיק כדי לתרגל כל מושג אבל קונקרטי מספיק לבנייה ביום אחד."
  - question: "איך המערכת המוגמרת נראית?"
    answer: "מריצים `python capstone.py PR_URL` ומקבלים בחזרה סקירה מובנית עם חלקים לאבטחה, ביצועים, סגנון ובדיקות. מאחורי הקלעים, 4 סוכנים עובדים במקביל, כל אחד בוחן את ה-diff מתחום המומחיות שלו, ומתואמים דרך פרוטוקולי הצוות שבנית."
  - question: "אפשר להתאים את זה לצורך שלי?"
    answer: "בהחלט. הארכיטקטורה זהה בין אם אתה בונה סוקר קוד, עוזר מחקר, בוט פריסה או סוכן תמיכת לקוחות. פרויקט הגמר מלמד את התבנית — אתה בוחר מה לבנות איתה."
walkthroughs:
  - title: "ארכיטקטורת פרויקט הגמר: ראשי + מומחים"
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

          # Phase 4: Collect results (s10)
          wait_for_completion(task_manager)
          findings = collect_findings(team)

          # Phase 5: Synthesize (s04)
          summary = synthesize_review(findings)
          return summary
    steps:
      - lines: [2, 4]
        annotation: "שלב 1 משתמש במתכנן TodoWrite‏ (s03) ובמערכת המשימות (s07) כדי לפרק את הסקירה לתת-משימות ספציפיות: בדיקת דפוסי אימות, חיפוש שאילתות N+1, אימות מוסכמות שמות."
      - lines: [6, 12]
        annotation: "שלב 2 מאתחל את הצוות (s09) עם שלושה סוכנים מומחים. לכל אחד תפקיד שמעצב את prompt המערכת שלו וקובע מה הוא מחפש בקוד."
      - lines: [14, 17]
        annotation: "שלב 3 משלב סוכנים אוטונומיים (s11) עם בידוד worktree‏ (s12). כל מומחה מקבל ענף משלו לעבודה — הם יכולים אפילו להריץ בדיקות בלי להפריע אחד לשני."
      - lines: [19, 21]
        annotation: "שלב 4 משתמש בפרוטוקולי צוות (s10) לאיסוף ממצאים. הסוכן הראשי מרוקן את תיבת הדואר של כל מומחה ומצרף את הפלט המובנה שלהם."
      - lines: [23, 25]
        annotation: "שלב 5 מפעיל תת-סוכן (s04) כדי לסנתז את כל הממצאים לסיכום סקירה קוהרנטי. דחיסת הקשר (s06) מבטיחה שהסינתזה נשארת בגבולות ה-token."
diagram:
  title: "ארכיטקטורת מערכת פרויקט הגמר"
  nodes:
    - { id: "diff", label: "PR Diff", x: 80, y: 50, type: "data" }
    - { id: "lead", label: "Lead Agent", x: 300, y: 50, type: "agent" }
    - { id: "board", label: "Task Board", x: 520, y: 50, type: "data" }
    - { id: "sec", label: "Security", x: 120, y: 180, type: "agent" }
    - { id: "perf", label: "Performance", x: 300, y: 180, type: "agent" }
    - { id: "style", label: "Style", x: 480, y: 180, type: "agent" }
    - { id: "wt1", label: "worktree/sec", x: 120, y: 280, type: "tool" }
    - { id: "wt2", label: "worktree/perf", x: 300, y: 280, type: "tool" }
    - { id: "wt3", label: "worktree/style", x: 480, y: 280, type: "tool" }
    - { id: "summary", label: "Review Summary", x: 300, y: 340, type: "data" }
  edges:
    - { from: "diff", to: "lead", label: "input" }
    - { from: "lead", to: "board", label: "plan tasks" }
    - { from: "board", to: "sec", label: "claim", animated: true }
    - { from: "board", to: "perf", label: "claim", animated: true }
    - { from: "board", to: "style", label: "claim", animated: true }
    - { from: "sec", to: "wt1", label: "work" }
    - { from: "perf", to: "wt2", label: "work" }
    - { from: "style", to: "wt3", label: "work" }
    - { from: "sec", to: "lead", label: "findings", animated: true }
    - { from: "perf", to: "lead", label: "findings", animated: true }
    - { from: "style", to: "lead", label: "findings", animated: true }
    - { from: "lead", to: "summary", label: "synthesize" }
  steps:
    - title: "1. קלט ותכנון"
      description: "הסוכן הראשי מקבל diff של PR, מנתח אותו, ויוצר משימות סקירה על לוח המשימות."
      activeNodes: ["diff", "lead", "board"]
      activeEdges: [0, 1]
    - title: "2. תביעה אוטונומית"
      description: "שלושה סוכנים מומחים תובעים באופן אוטונומי משימות מהלוח. כל אחד מתמקד בתחום המומחיות שלו."
      activeNodes: ["board", "sec", "perf", "style"]
      activeEdges: [2, 3, 4]
    - title: "3. ביצוע מבודד"
      description: "כל מומחה עובד ב-git worktree משלו. הם יכולים לקרוא קבצים, להריץ בדיקות ולנתח קוד ללא הפרעה."
      activeNodes: ["sec", "perf", "style", "wt1", "wt2", "wt3"]
      activeEdges: [5, 6, 7]
    - title: "4. דיווח ממצאים"
      description: "המומחים שולחים ממצאים מובנים בחזרה לסוכן הראשי דרך תיבות דואר."
      activeNodes: ["sec", "perf", "style", "lead"]
      activeEdges: [8, 9, 10]
    - title: "5. סינתוז הסקירה"
      description: "הסוכן הראשי משלב את כל הממצאים לסיכום סקירה קוהרנטי ומתועדף."
      activeNodes: ["lead", "summary"]
      activeEdges: [11]
challenges:
  - tier: "warmup"
    text: "צייר את תרשים הארכיטקטורה של המערכת הזו. מפה כל תיבה לשיעור שבו למדת את המושג הזה."
    hint: "התרשים שלך צריך לכלול: סוכן ראשי (s01), לוח משימות (s07), 3 סוכנים מומחים (s09), תיבות דואר (s09), Worktrees‏ (s12), מגבלות בטיחות (s14), ו-Tracer‏ (s15)."
  - tier: "build"
    text: "ממש את פרויקט הגמר. התחל עם סוכן סוקר יחיד שקורא diff ומפיק ממצאים. אחר כך הוסף מומחה שני ותאם אותם דרך תיבות דואר."
    hint: "התחל בפשטות — סוכן ראשי + מומחה אחד מספיקים. הוסף את המומחה השני רק אחרי שתיאום תיבות הדואר עובד."
  - tier: "stretch"
    text: "הוסף חבילת הערכה (s13) לסוכן סקירת הקוד שלך. הגדר 5 מקרי בדיקה עם בעיות ידועות (SQL injection, ייבוא שלא בשימוש, לולאת O(n^2), שמות לא עקביים, טיפול חסר בשגיאות) ודרג את יכולת הסוכן למצוא אותן."
    hint: "צור diffs סינתטיים עם באגים ידועים. הבודק מוודא שהפלט של הסוכן מזכיר כל באג."
---

## הבעיה

במשך 16 שיעורים למדת רכיבים בודדים: לולאות, כלים, תכנון, תת-סוכנים, מיומנויות, דחיסה, משימות, עבודה ברקע, צוותים, פרוטוקולים, אוטונומיה, worktrees, הערכות, מגבלות בטיחות, ניטור ופריסה לייצור. כל אחד עובד בנפרד. אבל מערכות אמיתיות משלבות את כולם.

פרויקט הגמר הזה קושר כל מושג יחד למערכת אחת ברמת ייצור: בוט סקירת קוד מרובה-סוכנים.

## הארכיטקטורה

```
                         PR Diff
                            │
                     ┌──────▼──────┐
                     │  Lead Agent  │─────── Task Board
                     │   (s01)      │         (s07)
                     └──────┬──────┘
                            │ plan + delegate
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │   Security   │ │ Performance  │ │    Style     │
     │  Reviewer    │ │  Reviewer    │ │  Reviewer    │
     │   (s09)      │ │   (s09)      │ │   (s09)      │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
     ┌──────▼───────┐ ┌──────▼───────┐ ┌──────▼───────┐
     │  worktree/   │ │  worktree/   │ │  worktree/   │
     │  security    │ │  performance │ │  style       │
     │   (s12)      │ │   (s12)      │ │   (s12)      │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
            └────────────────┼────────────────┘
                             │ findings via mailbox (s10)
                     ┌───────▼───────┐
                     │  Synthesize   │
                     │   (s04)       │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │ Review Summary│
                     └───────────────┘
```

כל תיבה ממופה לשיעור שהשלמת. זה לא מושג חדש — זו *ההרכבה* של כל מה שלמדת.

## שלב 1: תכנון הסקירה

הסוכן הראשי מקבל diff ומפרק אותו לחלקים הניתנים לסקירה:

```python
def plan_review(diff: str) -> list[dict]:
    """Use the LLM to analyze a diff and create review tasks."""
    prompt = f"""Analyze this diff and create review tasks.
For each concern, create a task with:
- title: what to check
- category: security | performance | style
- files: which files are relevant

Diff:
{diff}"""

    messages = [{"role": "user", "content": prompt}]
    response = agent_loop(messages)
    tasks = parse_tasks(response)

    # Create tasks in the task system (s07)
    for task in tasks:
        task_manager.create(
            title=task["title"],
            category=task["category"],
            files=task["files"],
            status="pending",
        )
    return tasks
```

זה משתמש בגישת [TodoWrite](/he/s03-todo-write) לתכנון וב[מערכת המשימות](/he/s07-task-system) לאחסון מתמיד. משימות שורדות קריסות כי הן קובצי JSON על הדיסק.

## שלב 2: הרכבת הצוות

```python
def setup_review_team():
    """Initialize specialist agents with domain-specific prompts."""
    teammates = [
        {
            "name": "security",
            "role": "security reviewer",
            "system": (
                "You are a security reviewer. Look for: "
                "SQL injection, XSS, path traversal, auth bypass, "
                "hardcoded secrets, insecure deserialization. "
                "Rate each finding: critical / high / medium / low."
            ),
        },
        {
            "name": "performance",
            "role": "performance reviewer",
            "system": (
                "You are a performance reviewer. Look for: "
                "N+1 queries, unnecessary allocations, missing indexes, "
                "O(n^2) algorithms, synchronous I/O in hot paths. "
                "Estimate impact: high / medium / low."
            ),
        },
        {
            "name": "style",
            "role": "style reviewer",
            "system": (
                "You are a style reviewer. Look for: "
                "inconsistent naming, missing type hints, dead code, "
                "overly complex functions, missing docstrings on public APIs. "
                "Suggest concrete fixes."
            ),
        },
    ]
    init_team(teammates)
    return teammates
```

לכל מומחה יש prompt מערכת ממוקד שקובע מה הוא מחפש. זו תבנית [צוותי סוכנים](/he/s09-agent-teams) עם זהות ומחזור חיים.

## שלב 3: ביצוע מקבילי

```python
def execute_review(tasks: list, team: list):
    """Assign worktrees and let agents work in parallel."""
    for task in task_manager.get_ready():
        # Each task gets its own git worktree (s12)
        wt = create_worktree(task["id"])
        task["worktree"] = wt
        task_manager.update(task)

    # Start teammate loops in threads (s09 + s11)
    threads = []
    for mate in team:
        t = threading.Thread(
            target=teammate_loop,
            args=(mate["name"], mate["role"]),
            daemon=True,
        )
        t.start()
        threads.append(t)

    # Autonomous agents claim ready tasks (s11)
    # Each runs in its assigned worktree
    wait_for_completion(task_manager, timeout=300)

    # Cleanup worktrees after completion
    for task in task_manager.get_all():
        if task.get("worktree"):
            cleanup_worktree(task["id"])
```

תבנית [הסוכנים האוטונומיים](/he/s11-autonomous-agents) מאפשרת למומחים לתבוע משימות באופן עצמאי. [בידוד worktree](/he/s12-worktree-task-isolation) מבטיח שהם לא יכולים להפריע אחד לשני.

## שלב 4: איסוף ממצאים

```python
def collect_findings(team: list) -> dict:
    """Drain all specialist mailboxes and aggregate findings."""
    findings = {"security": [], "performance": [], "style": []}

    for mate in team:
        messages = drain_inbox("lead")
        for msg in messages:
            if msg["from"] == mate["name"]:
                parsed = json.loads(msg["content"])
                findings[mate["name"]].extend(parsed["findings"])

    return findings
```

תבנית בקשה-תגובה של [פרוטוקולי צוות](/he/s10-team-protocols) מבטיחה שנוכל להתאים ממצאים למומחה הנכון.

## שלב 5: סינתוז הסקירה

```python
def synthesize_review(findings: dict) -> str:
    """Use a subagent to produce a coherent review summary."""
    all_findings = json.dumps(findings, indent=2)

    summary = run_subagent(f"""Synthesize these code review findings into a
structured review. Prioritize by severity. Group by category.

Findings:
{all_findings}

Output format:
## Critical Issues
## Recommendations
## Style Suggestions
""")
    return summary
```

[תת-סוכן](/he/s04-subagent) מסנתז את כל הממצאים לסיכום קוהרנטי. [דחיסת הקשר](/he/s06-context-compact) מבטיחה שהסינתזה נשארת בגבולות ה-token גם בסקירות גדולות.

## עטיפת ייצור

פרויקט הגמר משלב את כל דרישות הייצור:

```python
def run_code_review(diff: str) -> str:
    """Full production code review pipeline."""
    tracer = AgentTracer("code-review")    # s15: observability
    guardrail = GuardRail(PERMISSIONS)      # s14: safety

    tracer.record("review_start", {"diff_size": len(diff)})

    tasks = plan_review(diff)               # s03 + s07: planning
    team = setup_review_team()              # s09: team setup
    execute_review(tasks, team)             # s11 + s12: parallel work
    findings = collect_findings(team)       # s10: coordination
    summary = synthesize_review(findings)   # s04 + s06: synthesis

    tracer.record("review_complete", {
        "findings": sum(len(v) for v in findings.values()),
        "total_tokens": tracer.total_tokens(),
    })

    return summary
```

## מפת מושגי השיעורים

| שיעור | מושג | היכן מופיע בפרויקט הגמר |
|---------|---------|----------------------------------|
| [s01](/he/s01-the-agent-loop) | לולאת הסוכן | כל סוכן מריץ את הלולאה המרכזית |
| [s02](/he/s02-tool-use) | שימוש בכלים | מומחים משתמשים ב-bash, read_file לניתוח קוד |
| [s03](/he/s03-todo-write) | TodoWrite | הסוכן הראשי מתכנן את הסקירה כרשימת משימות |
| [s04](/he/s04-subagent) | תת-סוכנים | תת-סוכן הסינתזה מפיק את הסקירה הסופית |
| [s05](/he/s05-skill-loading) | מיומנויות | מומחים טוענים ידע תחומי לפי דרישה |
| [s06](/he/s06-context-compact) | דחיסת הקשר | דחיסה במהלך סקירות ארוכות |
| [s07](/he/s07-task-system) | מערכת משימות | משימות סקירה נשמרות כ-DAG של JSON |
| [s08](/he/s08-background-tasks) | משימות רקע | הרצת בדיקות רצה ברקע |
| [s09](/he/s09-agent-teams) | צוותי סוכנים | שלושה חברי צוות מומחים + ראשי |
| [s10](/he/s10-team-protocols) | פרוטוקולי צוות | בקשה-תגובה לאיסוף ממצאים |
| [s11](/he/s11-autonomous-agents) | סוכנים אוטונומיים | מומחים מקצים לעצמם משימות סקירה |
| [s12](/he/s12-worktree-task-isolation) | בידוד Worktree | כל מומחה עובד בענף משלו |
| [s13](/he/s13-agent-evals) | הערכות סוכנים | חבילת הערכה לאיכות הסקירה |
| [s14](/he/s14-guardrails) | מגבלות בטיחות | בדיקות הרשאות על כל קריאות הכלים |
| [s15](/he/s15-observability) | ניטור | מעקב מלא של כל סשן סקירה |
| [s16](/he/s16-shipping-to-production) | ייצור | ניסיונות חוזרים, streaming, מעקב עלויות |

## המסקנה המרכזית

הרתמה שלמה. מלולאת `while True` בודדת בשיעור 1, בנית מערכת שבה מספר סוכנים מתואמים באופן אוטונומי לביצוע עבודה מורכבת במקביל — עם בטיחות, ניטור ומוכנות לייצור מובנים. המודל הוא האינטליגנציה. הקוד הוא הרתמה. למדת לבנות את הרתמה.
