---
title: "מערכת משימות"
session: "s07"
phase: 3
motto: "פרקו מטרות גדולות למשימות קטנות, סדרו אותן, שמרו לדיסק"
order: 7
readingTime: 25
beginnerConcepts:
  - question: "מה זה גרף משימות (DAG)?"
    answer: "גרף מכוון ללא מחזורים שבו כל משימה יכולה לרשום משימות אחרות שהיא תלויה בהן (blockedBy). משימה 4 לא יכולה להתחיל עד שמשימות 2 ו-3 הסתיימו. זה מדגים תלויות בין פריטי עבודה בעולם האמיתי."
  - question: "למה לשמור משימות לדיסק במקום לזיכרון?"
    answer: "דחיסת הקשר (סשן דחיסת הקשר) יכולה למחוק את רשימת ה-todo בזיכרון. משימות שנשמרות כקבצי JSON על הדיסק שורדות דחיסה, קריסות, ואפילו העברות בין סוכנים — כל סוכן יכול להמשיך מהנקודה שבה אחר עצר."
  - question: "מה פירוש 'ready' עבור משימה?"
    answer: "משימה היא ready כשהסטטוס שלה הוא 'pending' וכל המשימות ברשימת ה-blockedBy שלה הן 'completed'. ה-TaskManager מחשב משימות מוכנות אוטומטית כך שהסוכן פשוט שואל 'מה אני יכול לעשות עכשיו?'"
---

## הבעיה

ה-TodoManager של סשן [TodoWrite](/he/s03-todo-write) הוא רשימת תיוגים שטוחה בזיכרון: ללא סדר, ללא תלויות, ללא סטטוס מעבר ל-done-or-not. למטרות אמיתיות יש מבנה — משימה B תלויה במשימה A, משימות C ו-D יכולות לרוץ במקביל, משימה E מחכה לשתי C ו-D.

ללא קשרים מפורשים, הסוכן לא יכול לדעת מה מוכן, מה חסום, או מה יכול לרוץ בו-זמנית. ומכיוון שהרשימה חיה רק בזיכרון, דחיסת ה-context (סשן [דחיסת הקשר](/he/s06-context-compact)) מוחקת אותה לחלוטין.

## הפתרון

קדמו את רשימת התיוגים ל**גרף משימות** השמור לדיסק. כל משימה היא קובץ JSON עם סטטוס ותלויות (`blockedBy`). הגרף עונה על שלוש שאלות בכל רגע:

- **מה מוכן?** — משימות עם סטטוס `pending` ו-`blockedBy` ריק
- **מה חסום?** — משימות שמחכות לתלויות שלא הסתיימו
- **מה נסגר?** — משימות `completed`, שסיומן מבטל אוטומטית חסימת תלויות

```
.tasks/
  task_1.json  {"id":1, "status":"completed"}
  task_2.json  {"id":2, "blockedBy":[1], "status":"pending"}
  task_3.json  {"id":3, "blockedBy":[1], "status":"pending"}
  task_4.json  {"id":4, "blockedBy":[2,3], "status":"pending"}

Task graph (DAG):
  1 --> 2 --> 4
  1 --> 3 --> 4

When task 1 completes: 2 and 3 become ready.
When 2 and 3 complete: 4 becomes ready.
```

## איך זה עובד

1. כל משימה היא קובץ JSON. ה-TaskManager קורא את כל הקבצים ובונה את הגרף בזיכרון.

```python
import json
from pathlib import Path

class TaskManager:
    def __init__(self, tasks_dir: str = ".tasks"):
        self.dir = Path(tasks_dir)
        self.dir.mkdir(exist_ok=True)

    def _load_all(self) -> list:
        tasks = []
        for f in sorted(self.dir.glob("task_*.json")):
            tasks.append(json.loads(f.read_text()))
        return tasks

    def create(self, title: str, blocked_by: list = None) -> dict:
        tasks = self._load_all()
        new_id = max((t["id"] for t in tasks), default=0) + 1
        task = {"id": new_id, "title": title,
                "status": "pending", "blockedBy": blocked_by or []}
        path = self.dir / f"task_{new_id}.json"
        path.write_text(json.dumps(task, indent=2))
        return task

    def complete(self, task_id: int) -> str:
        path = self.dir / f"task_{task_id}.json"
        task = json.loads(path.read_text())
        task["status"] = "completed"
        path.write_text(json.dumps(task, indent=2))
        return f"Task {task_id} completed."

    def ready(self) -> list:
        tasks = self._load_all()
        done_ids = {t["id"] for t in tasks if t["status"] == "completed"}
        return [
            t for t in tasks
            if t["status"] == "pending"
            and all(dep in done_ids for dep in t.get("blockedBy", []))
        ]
```

2. הסוכן מקבל שלושה כלים: `create_task`, `complete_task` ו-`list_ready_tasks`.

```python
TASK_MANAGER = TaskManager()

TOOL_HANDLERS = {
    # ...base tools...
    "create_task": lambda **kw: str(TASK_MANAGER.create(
        kw["title"], kw.get("blocked_by", []))),
    "complete_task": lambda **kw: TASK_MANAGER.complete(kw["task_id"]),
    "list_ready_tasks": lambda **kw: json.dumps(TASK_MANAGER.ready(), indent=2),
}
```

3. תהליך העבודה של הסוכן הופך ל: יצירת גרף המשימות, ואז עבודה דרך משימות מוכנות אחת אחת.

```
Agent: "I need to refactor auth module."

1. create_task("Read current auth code")            -> id=1
2. create_task("Write new AuthManager",  blocked_by=[1]) -> id=2
3. create_task("Update tests", blocked_by=[2])      -> id=3
4. create_task("Update docs",  blocked_by=[2])      -> id=4

list_ready_tasks() -> [task 1]

[works on task 1]
complete_task(1)

list_ready_tasks() -> [task 2]
...
```

## מה השתנה מ-[דחיסת הקשר](/he/s06-context-compact)

| רכיב | לפני (דחיסת הקשר) | אחרי (מערכת משימות) |
|------|-----------|-----------|
| תכנון | רשימת תיוגים בזיכרון | גרף משימות שמור לדיסק |
| תלויות | אין | רשימת blockedBy |
| מקביליות | עוקבת בלבד | זיהוי מפורש של מקביל-מוכן |
| שורד | כלום | דחיסה, קריסות, העברות |

## מסקנה מרכזית

שמירת משימות לדיסק היא מה שהופך את תוכניות הסוכן לעמידות. גרף המשימות מקודד לא רק *מה* לעשות אלא *באיזה סדר* ו*מה יכול לרוץ במקביל*. בשילוב עם [דחיסת הקשר](/he/s06-context-compact), הסוכן יכול לעבוד על מטרות גדולות באמת לאורך סיבובים רבים מבלי לאבד עקב.
