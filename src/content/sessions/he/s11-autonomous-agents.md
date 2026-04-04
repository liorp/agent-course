---
title: "סוכנים אוטונומיים"
session: "s11"
phase: 4
motto: "חברי צוות סורקים את הלוח ותופסים משימות בעצמם"
order: 11
readingTime: 30
beginnerConcepts:
  - question: "מה זה תפיסת משימה?"
    answer: "כשחבר צוות משנה אטומית את סטטוס המשימה מ-'pending' ל-'in_progress' וכותב את שמו עצמו כמוקצה. מכיוון שכל משימה היא קובץ JSON נפרד, שני סוכנים לא יכולים לתפוס את אותה משימה בו-זמנית — אחד ינצח, השני ינסה שוב."
  - question: "מה זה הזרקת זהות מחדש?"
    answer: "לאחר שדחיסת context (סשן דחיסת הקשר) מוחקת את היסטוריית השיחה, הסוכן עשוי לשכוח מי הוא. ה-harness מזריק בלוק <identity> בתחילת ה-context הדחוס: 'אתה Alice, מומחית backend, עובדת על משימה 3.' זה משחזר את תחושת הזהות של הסוכן."
  - question: "מה זה מחזור סרק?"
    answer: "כשחבר צוות לא מוצא משימות מוכנות, הוא ממתין בקצרה (ישן 2 שניות) ואז בודק שוב. לולאת הסקירה הזו היא המנגנון שמאפשר לחברי צוות לעבוד ללא הגבלת זמן מבלי שהמוביל יקצה כל משימה בנפרד."
walkthroughs:
  - title: "מחזור סרק ותפיסת משימות אוטונומית"
    language: "python"
    code: |
      def claim_task(name: str) -> dict | None:
          ready = get_ready_tasks()
          if not ready:
              return None
          task = ready[0]
          task_path = Path(".tasks") / f"task_{task['id']}.json"
          current = json.loads(task_path.read_text())
          if current["status"] != "pending":
              return None  # someone else claimed it
          current["status"] = "in_progress"
          current["assignee"] = name
          task_path.write_text(json.dumps(current, indent=2))
          return current

      def autonomous_teammate(name: str, role: str) -> None:
          system = build_system_with_identity(name, role)
          while True:
              process_inbox(name)
              if get_status(name) == "SHUTDOWN":
                  break
              task = claim_task(name)
              if task is None:
                  update_status(name, "IDLE")
                  time.sleep(2)
                  continue
              update_status(name, "WORKING")
              history = [{"role": "user", "content":
                  f"Work on task {task['id']}: {task['title']}"}]
              run_agent_with_identity(history, system, name, task["id"])
              complete_task(task["id"])
    steps:
      - lines: [1, 4]
        annotation: "`claim_task()` מוצאת תחילה את כל המשימות המוכנות. אם אין, היא מחזירה `None` מיד — הקורא יכניס את הסוכן למצב סרק."
      - lines: [5, 9]
        annotation: "בדיקת המקביליות האופטימיסטית: קריאה מחדש של קובץ המשימה ואימות שהוא עדיין `'pending'`. שני סוכנים שמתחרים על אותה משימה — אחד ימצא אותה כבר `'in_progress'` כאן ויסוג."
      - lines: [10, 13]
        annotation: "התפיסה אטומית ברמת הקובץ. הגדרת status + assignee בקריאת `write_text()` אחת פירושה שאף סוכן אחר לא יכול לצפות חלקית במעבר. התופס מחזיר את ה-dict המלא של המשימה."
      - lines: [15, 20]
        annotation: "הלולאה החיצונית בודקת תחילה את תיבת הדואר בכל איטרציה. זה מבטיח שבקשות כיבוי מעובדות מיידית גם אם הסוכן נמצא באמצע מחזור סרק ארוך."
      - lines: [21, 29]
        annotation: "מחזור הסרק: אם אין משימה מוכנה, עדכן סטטוס ל-`IDLE` וישן 2 שניות. אחרת, תפוס את המשימה, הרץ לולאת סוכן מלאה עליה, ואז השלם אותה ולולאה חזרה לבדוק אם יש עוד."
challenge:
  text: "הגדירו 3 סוכנים אוטונומיים עם לוח משימות ריק, ואז הוסיפו 5 משימות. צפו בהם תופסים ומשלימים."
  hint: "ה-idle_cycle של כל סוכן יסרוק ויתפוס אוטומטית"
---

## הבעיה

בסשנים [צוותי הסוכנים](/he/s09-agent-teams) ו[פרוטוקולי הצוות](/he/s10-team-protocols), חברי הצוות עובדים רק כשנאמר להם במפורש. המוביל חייב לשגר כל אחד עם פרומפט ספציפי. 10 משימות לא תפוסות בלוח? המוביל מקצה כל אחת ידנית. לא מתרחב.

אוטונומיה אמיתית: חברי הצוות סורקים את לוח המשימות בעצמם, תופסים משימות לא תפוסות, עובדים עליהן, ואז מחפשים עוד.

פרט עדין אחד: לאחר דחיסת context (סשן [דחיסת הקשר](/he/s06-context-compact)), הסוכן עשוי לשכוח מי הוא. הזרקת זהות מחדש פותרת זאת.

## הפתרון

```
Teammate lifecycle with idle cycle:

+-------+
| spawn |
+---+---+
    |
    v
+-------+   tool_use     +-------+
| WORK  | <------------- |  LLM  |
+---+---+                +-------+
    |                       ^
    | done or no tasks      |
    v                       |
+-------+   poll tasks      |
| IDLE  | --check_ready()---+
+-------+   (wait 2s)
    |
    | shutdown_req received
    v
+----------+
| SHUTDOWN |
+----------+
```

## איך זה עובד

1. תפיסת משימה היא אטומית — כותבים בעלים + סטטוס יחד.

```python
def claim_task(name: str) -> dict | None:
    """Find and claim the first ready task. Returns the task or None."""
    tasks_dir = Path(".tasks")
    ready = get_ready_tasks()  # reads all task files
    if not ready:
        return None

    task = ready[0]
    task_path = tasks_dir / f"task_{task['id']}.json"

    # Atomic claim: read current state, update only if still pending
    current = json.loads(task_path.read_text())
    if current["status"] != "pending":
        return None  # someone else claimed it

    current["status"] = "in_progress"
    current["assignee"] = name
    task_path.write_text(json.dumps(current, indent=2))
    return current
```

2. לולאת חבר הצוות סוקרת משימות ועובדת דרכן.

```python
def autonomous_teammate(name: str, role: str) -> None:
    system = build_system_with_identity(name, role)

    while True:
        # Check inbox for shutdown requests
        process_inbox(name)
        if get_status(name) == "SHUTDOWN":
            break

        task = claim_task(name)
        if task is None:
            # No ready tasks — idle cycle
            update_status(name, "IDLE")
            time.sleep(2)
            continue

        update_status(name, "WORKING")
        history = [{
            "role": "user",
            "content": f"Work on task {task['id']}: {task['title']}\n{task.get('description','')}"
        }]
        run_agent_with_identity(history, system, name, task["id"])
        complete_task(task["id"])
```

3. הזרקת זהות מחדש עוטפת את פונקציית ה-hard_compact מסשן [דחיסת הקשר](/he/s06-context-compact).

```python
def build_identity_block(name: str, role: str, task_id: int) -> str:
    return (
        f"<identity>\n"
        f"You are {name}, a {role}.\n"
        f"You are currently working on task {task_id}.\n"
        f"After completing it, claim another ready task from .tasks/.\n"
        f"</identity>"
    )

def hard_compact_with_identity(messages: list, name: str, role: str, task_id: int) -> list:
    # Regular hard compact...
    compacted = hard_compact(messages)
    # Prepend identity to the summary
    identity = build_identity_block(name, role, task_id)
    first_msg = compacted[0]
    first_msg["content"] = identity + "\n\n" + first_msg["content"]
    return compacted
```

## מה השתנה מ-[פרוטוקולי צוות](/he/s10-team-protocols)

| רכיב | לפני (פרוטוקולי צוות) | אחרי (סוכנים אוטונומיים) |
|------|-----------|-----------|
| הקצאת משימות | המוביל שולח במפורש | חברי הצוות תופסים אוטונומית |
| מצב סרק | המתנה להודעה | סקירת משימות מוכנות כל 2 שניות |
| זהות | טיפול מיוחד אין | הוזרקת מחדש לאחר דחיסה |
| תפקיד המוביל | מתאם + מקצה | מתאם בלבד (תצוגת רמת לוח) |

## מסקנה מרכזית

תפיסת משימות אוטונומית היא מה שמבדיל צוות ממרוץ שליחים. כל חבר צוות הוא סוכן מכוון עצמי שסורק את הלוח, תופס מה שהוא יכול לעשות, עובד, ומבצע לולאה. תפקיד המוביל מצטמצם ליצירת משימות וטיפול בפרוטוקולים. הזרקת הזהות מחדש היא הדבק שמשמר את הסוכן קוהרנטי לאורך גבולות הדחיסה.
