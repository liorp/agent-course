---
title: "בידוד Worktree ומשימות"
session: "s12"
phase: 4
motto: "כל אחד עובד בתיקייה שלו, בלי הפרעות"
order: 12
readingTime: 30
beginnerConcepts:
  - question: "מה זה git worktree?"
    answer: "worktree הוא תיקיית עבודה נפרדת המקושרת לאותו מאגר git. כל worktree יכול להיות על ענף שונה, מה שמאפשר למספר סוכנים לעבוד על משימות שונות ללא התנגשויות קבצים."
  - question: "למה סוכנים צריכים בידוד?"
    answer: "כשמספר סוכנים עורכים את אותם קבצים בו-זמנית, הם יכולים לדרוס את עבודתם של אחד את השני. Worktrees נותנים לכל סוכן עותק משלו של ה-codebase לעבוד בו בבטחה."
  - question: "איך משימות ו-worktrees מתחברים?"
    answer: "כל משימה מקבלת worktree לפי מזהה. המשימה עוקבת אחר מה שצריך לעשות, ה-worktree מספק היכן לעשות זאת. כשהמשימה מסתיימת, ניתן למזג את ה-worktree ולנקות אותו."
walkthroughs:
  - title: "מחזור חיי ה-Worktree: יצירה, הקצאה, ניקוי"
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
        annotation: "create_worktree() מריצה 'git worktree add' עם -b ליצירת ענף חדש בו-זמנית. ה-worktree נמצא ב-.worktrees/<task_id>/ — תיקיית עבודה git פונקציונלית מלאה על ענף משלה."
      - lines: [10, 16]
        annotation: "assign_worktree() קושרת את ה-worktree לרשומת המשימה. לאחר קריאה זו, קובץ ה-JSON של המשימה מכיל גם מה לעשות (כותרת, תיאור) וגם היכן לעשות זאת (נתיב worktree ושם ענף)."
      - lines: [18, 23]
        annotation: "cleanup_worktree() מסירה את תיקיית ה-worktree ומבטלת את רישומה מרשימת ה-worktrees של git. יש לקרוא לה לאחר מיזוג הענף — המשימה הושלמה, נתיב הבידוד משוחרר."
challenge:
  text: "צרו 3 משימות, הקצו לכל אחת worktree, וודאו שהן יכולות לערוך את אותו קובץ באופן עצמאי."
  hint: "לאחר השלמת כל אחת, מזגו את הענפים ופתרו קונפליקטים"
---

## הבעיה

בסשנים [צוותי הסוכנים](/he/s09-agent-teams) עד [סוכנים אוטונומיים](/he/s11-autonomous-agents), חברי הצוות מתאמים דרך משימות ותיבות דואר — אבל כולם חולקים את אותה תיקיית עבודה. אם שני סוכנים עורכים את אותו קובץ בו-זמנית, הם ישחיתו את עבודתם של אחד את השני. הצוות יכול לתכנן יחד, אבל הם לא יכולים *לבצע* יחד.

## הפתרון

תנו לכל סוכן תיקייה משלו. Git worktrees מספקים בדיוק את זה: תיקיות עבודה נפרדות המקושרות לאותו מאגר, כל אחת על הענף שלה. משימה אחת = worktree אחד = נתיב ביצוע בודד ומבודד.

```
Task s12-feat-auth  ──→  .worktrees/s12-feat-auth/   (branch: task/s12-feat-auth)
Task s12-fix-typo   ──→  .worktrees/s12-fix-typo/    (branch: task/s12-fix-typo)
Task s12-add-tests  ──→  .worktrees/s12-add-tests/   (branch: task/s12-add-tests)
```

## מחזור חיים של Worktree

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

שלוש פעולות:
1. **יצירה** — `git worktree add` יוצר תיקייה חדשה עם הענף שלה
2. **עבודה** — הסוכן פועל לגמרי בתוך התיקייה הזו
3. **ניקוי** — `git worktree remove` מוחק את התיקייה לאחר מיזוג

## קישור משימות ל-Worktrees

```python
def assign_worktree(task_id: str) -> dict:
    worktree_path = create_worktree(task_id)
    task = task_manager.get(task_id)
    task["worktree"] = worktree_path
    task["branch"] = f"task/{task_id}"
    task_manager.update(task)
    return task
```

רשומת המשימה נושאת כעת את הקשר הביצוע שלה. כל סוכן שתופס את המשימה הזו יודע בדיוק היכן לעבוד.

## התבנית המלאה

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

זהו השיא של הקורס כולו: סשן [מערכת המשימות](/he/s07-task-system) מנהל מטרות, סשן [פרוטוקולי הצוות](/he/s10-team-protocols) מנהל תקשורת, סשן [הסוכנים האוטונומיים](/he/s11-autonomous-agents) מנהל הקצאה, ו-worktrees מנהלים בידוד. כל מנגנון מטפל בדאגה אחת. יחד, הם מאפשרים ביצוע מקבילי אמיתי.

## מה השתנה מ-[סוכנים אוטונומיים](/he/s11-autonomous-agents)

| רכיב | סוכנים אוטונומיים | בידוד Worktree ומשימות |
|------|-----|-----|
| תפיסת משימות | תפיסה אוטו' מלוח משותף | זהה |
| ביצוע | תיקייה משותפת | worktree מבודד לכל משימה |
| ענפים | אין | ענף אחד לכל משימה |
| ניקוי | ידני | הסרת worktree לאחר מיזוג |

## מסקנה מרכזית

בידוד הוא החלק האחרון. עם worktrees, סוכנים יכולים לעבוד במקביל אמיתי — כל אחד בתיקייה שלו, על הענף שלו, ללא הפרעות. ה-harness כעת שלם: לולאה, כלים, תכנון, ידע, ניהול context, עמידות, צוותים, פרוטוקולים, אוטונומיה, ובידוד. למדתם לבנות את העולם שהבינה שוכנת בו.
