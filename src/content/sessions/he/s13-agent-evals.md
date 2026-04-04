---
title: "הערכת סוכנים"
session: "s13"
phase: 5
motto: "אי אפשר לשפר מה שלא מודדים"
order: 13
readingTime: 25
prerequisites:
  - "s01-the-agent-loop"
  - "s02-tool-use"
  - "s03-todo-write"
whatYouBuild: "רתמת בדיקות שמדרגת את דיוק השימוש בכלים של הסוכן, שיעור השלמת המשימות ויעילות העלויות על פני תרחישים ניתנים לשחזור."
beginnerConcepts:
  - question: "מה זה eval של סוכן?"
    answer: "בדיקה מובנית שמודדת כמה טוב הסוכן שלכם מבצע משימה. בניגוד לבדיקות יחידה שבודקות פונקציה אחת, evals מודדים התנהגות מקצה לקצה: האם הסוכן השתמש בכלים הנכונים, השלים את המשימה, ונשאר בתקציב?"
  - question: "למה אי אפשר לבדוק סוכנים כמו קוד רגיל?"
    answer: "כי סוכנים הם לא דטרמיניסטיים — אותו פרומפט יכול לייצר רצפי קריאות כלים שונים. Evals מטפלים בזה על ידי בדיקת תוצאות (האם הקובץ נוצר נכון?) ולא צעדים מדויקים (האם הוא קרא ל-write_file בשורה 3?)."
  - question: "מה זה רובריקת ניקוד?"
    answer: "קבוצת קריטריונים שמגדירים הצלחה. לדוגמה: 'הקובץ קיים' (עבר/נכשל), 'הקובץ מכיל פונקציה נכונה' (עבר/נכשל), 'הושלם בפחות מ-5 קריאות כלים' (ציון יעילות). הרובריקה הופכת איכות סובייקטיבית למספרים מדידים."
walkthroughs:
  - title: "בניית רתמת Eval"
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
        annotation: "`EvalCase` מגדיר תרחיש בדיקה אחד: פרומפט לשליחה לסוכן, פונקציית בדיקה, ומגבלות משאבים. המגבלות מונעות מסוכנים פרועים לשרוף טוקנים בזמן בדיקות."
      - lines: [8, 11]
        annotation: "`EvalResult` הוא הפלט המתוקנן. כל eval מייצר בוליאני עבר/נכשל, ציון 0-1 לניקוד חלקי, ופרטים קריאים שמסבירים מה קרה."
      - lines: [13, 27]
        annotation: "`run_eval()` יוצר סביבת עבודה מבודדת, מריץ את הסוכן עד שהוא עוצר או חורג מהמגבלות, ואז קורא לבודק. סביבת העבודה היא תיקייה זמנית — כל eval מתחיל נקי."
      - lines: [29, 35]
        annotation: "בודק קונקרטי: לוודא שהסוכן יצר `hello.py` עם התוכן הנכון. שימו לב לניקוד חלקי — אם הקובץ קיים אבל התוכן שגוי, הציון הוא 0.5 ולא 0."
challenges:
  - tier: "warmup"
    text: "חזו: אם תריצו את אותו eval 10 פעמים, האם הסוכן יקבל את אותו ציון בכל פעם? למה כן או למה לא?"
    hint: "חשבו על temperature, סדר ביצוע כלים לא דטרמיניסטי, ותזמון רשת."
  - tier: "build"
    text: "כתבו 3 eval cases לסוכן מניפולציית קבצים: (1) יצירת קובץ, (2) קריאה וסיכום קובץ, (3) שכתוב פונקציה. כללו רובריקות ניקוד."
    hint: "השתמשו ב-subprocess להריץ את הקוד שנוצר ולבדוק אם הוא באמת עובד, לא רק אם הוא נראה נכון."
  - tier: "stretch"
    text: "בנו חבילת eval שמריצה N מקרים במקביל, אוספת ציונים לדוח JSON, ומסמנת רגרסיות כשציונים יורדים מתחת לבסיס."
    hint: "השתמשו ב-`concurrent.futures.ThreadPoolExecutor` והשוו מול `baseline.json` שמור."
---

## הבעיה

בניתם סוכן. יש לו [לולאה](/he/s01-the-agent-loop), [כלים](/he/s02-tool-use), [תכנון](/he/s03-todo-write), [תת-סוכנים](/he/s04-subagent), [מיומנויות](/he/s05-skill-loading), [ניהול הקשר](/he/s06-context-compact), [משימות](/he/s07-task-system), [ביצוע ברקע](/he/s08-background-tasks), [צוותים](/he/s09-agent-teams), [פרוטוקולים](/he/s10-team-protocols), [אוטונומיה](/he/s11-autonomous-agents), ו[בידוד](/he/s12-worktree-task-isolation). אתם יכולים לצפות בו עובד וזה נראה מרשים. אבל האם הוא באמת טוב?

לא ניתן לענות על השאלה הזו על ידי צפייה. סוכנים הם לא דטרמיניסטיים — אותו פרומפט מייצר רצפי קריאות כלים שונים בהרצות שונות. שינוי בפרומפט המערכת שלכם עשוי לשפר יצירת קבצים אבל לשבור בשקט שכתוב קוד. לא תשימו לב עד שמשתמש ישים לב.

בדיקות יחידה מסורתיות לא עוזרות. אי אפשר לבדוק שהסוכן קרא ל-`write_file` בתור 3, כי מחר הוא עשוי לקרוא ל-`bash` בתור 2 ולקבל את אותה תוצאה. אתם צריכים בדיקות שבודקות **תוצאות**, לא **צעדים**.

## הפתרון

רתמת eval. הגדירו תרחישים עם תוצאות ידועות מראש, הריצו את הסוכן בסנדבוקס, בדקו מה הוא ייצר, ודרגו את התוצאות.

```
הגדרת תרחיש  →  הרצת סוכן בסנדבוקס  →  בדיקת תוצאות  →  ניקוד  →  דוח
```

## בניית רתמת ה-Eval

הליבה היא שני dataclasses ופונקציה אחת.

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

`EvalCase` הוא הקלט. `EvalResult` הוא הפלט. כל eval, לא משנה כמה מורכב, עומד בממשק הזה.

הרצה יוצרת סביבת עבודה מבודדת, מריצה את הסוכן, ומעבירה את סביבת העבודה לבודק:

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

הפרמטר `cwd=workspace` הוא קריטי. כל קריאת כלי מתבצעת בתוך התיקייה הזמנית. הסוכן יכול ליצור קבצים, להריץ פקודות ולשנות מצב — הכל מוגבל לסביבת העבודה הזו.

## אסטרטגיות ניקוד

לא כל eval הוא עבר/נכשל. שלוש אסטרטגיות, עולות ברזולוציה:

### עבר/נכשל בינארי

הפשוט ביותר. האם הקובץ קיים? האם הבדיקה עברה?

```python
def check_file_exists(workspace):
    if os.path.exists(os.path.join(workspace, "output.txt")):
        return EvalResult(True, 1.0, "File created")
    return EvalResult(False, 0.0, "File missing")
```

### ניקוד חלקי

הענקת נקודות עבור כל קריטריון שהתמלא:

```python
def check_refactor(workspace):
    path = os.path.join(workspace, "math_utils.py")
    if not os.path.exists(path):
        return EvalResult(False, 0.0, "File not found")

    content = open(path).read()
    score = 0.0
    details = []

    if "def calculate_average" in content:
        score += 0.25
        details.append("PASS: function exists")

    if "def calculate_average(numbers: list" in content:
        score += 0.25
        details.append("PASS: type hints present")

    if '"""' in content or "'''" in content:
        score += 0.25
        details.append("PASS: docstring present")

    result = subprocess.run(
        ["python", "-c", f"import math_utils; print(math_utils.calculate_average([1,2,3]))"],
        capture_output=True, text=True, cwd=workspace
    )
    if result.returncode == 0 and "2" in result.stdout:
        score += 0.25
        details.append("PASS: correct output")

    return EvalResult(score >= 0.75, score, "; ".join(details))
```

התובנה המרכזית: קריטריון 4 באמת *מריץ* את הקוד שנוצר. בדיקת תוכן מחרוזת אומרת לכם שהסוכן כתב משהו שנראה נכון. הרצתו אומרת לכם שהוא *נכון*.

## הרצת Evals בסקלה

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
        "total": len(cases),
        "passed": passed,
        "avg_score": round(total_score, 3),
        "results": {
            name: {"passed": r.passed, "score": r.score, "details": r.details}
            for name, r in results.items()
        },
    }
```

## מה השתנה מ[בידוד Worktree ומשימות](/he/s12-worktree-task-isolation)

| רכיב | בידוד Worktree | הערכת סוכנים |
|------|---------------|-------------|
| מיקוד | בניית הסוכן | מדידת הסוכן |
| סביבת עבודה | Git worktree למשימה | תיקייה זמנית ל-eval |
| קריטריון הצלחה | משימה סומנה כהושלמה | פונקציית בדיקה מחזירה ציון |
| בידוד | מניעת הפרעה בין סוכנים | מניעת דליפת מצב בין evals |
| פלט | ענף ממוזג | דוח JSON עם ציונים |

## נקודה מרכזית

Evals סוגרים את הלולאה. בלעדיהם, כל שינוי בסוכן שלכם הוא ניחוש — אתם מקווים שהשתפר, אתם מניחים ששום דבר לא נשבר. עם רתמת eval, אתם **יודעים**. הגדירו תרחישים, כתבו בודקים, הריצו את החבילה, וקראו את הציונים. הסוכן טוב רק כמו היכולת שלכם למדוד אותו. עכשיו אתם יכולים למדוד.
