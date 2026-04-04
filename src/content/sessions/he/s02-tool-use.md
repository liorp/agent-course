---
title: "שימוש בכלים"
session: "s02"
phase: 1
motto: "הוספת כלי פירושה הוספת handler אחד"
order: 2
readingTime: 15
beginnerConcepts:
  - question: "מה זה dispatch map?"
    answer: "מילון שממפה שמות כלים לפונקציות שמטפלות בהם. כשהמודל קורא ל-'read_file', מפת ה-dispatch מחפשת איזו פונקציית Python מטפלת בזה — כמו ספר טלפונים לכלים."
  - question: "למה אנחנו עושים sandbox לנתיבי קבצים?"
    answer: "כדי למנוע מהסוכן לקרוא או לכתוב קבצים מחוץ לתיקיית הפרויקט. הפונקציה safe_path() בודקת שכל נתיב מבוקש נשאר בתוך סביבת העבודה — גבול אבטחה בסיסי."
  - question: "מה זה path traversal?"
    answer: "טריק שבו מישהו משתמש ב-'../' בנתיב קובץ כדי להימלט מהתיקייה המיועדת. לדוגמה, '../../etc/passwd' מנסה לקרוא קבצי מערכת. ה-sandbox שלנו חוסם זאת."
walkthroughs:
  - title: "מפת ה-Dispatch"
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
        annotation: "`safe_path()` היא גבול האבטחה. היא פותרת את הנתיב ובודקת שהוא נשאר בתוך `WORKDIR`. כל ניסיון בריחה עם '../' מעלה שגיאה לפני שנוגעים במערכת הקבצים."
      - lines: [7, 12]
        annotation: "`run_read` עוברת דרך `safe_path` תחילה, ואז קוראת את הקובץ. פרמטר ה-`limit` האופציונלי קוטע קבצים ארוכים כדי למנוע הצפת ה-context באלפי שורות."
      - lines: [14, 18]
        annotation: "`run_write` יוצרת תיקיות הורה אוטומטית. קריאה אחת ל-`write_file` יכולה ליצור קבצים בתיקיות מקוננות עמוקות ללא שלב `mkdir()` נפרד."
      - lines: [20, 25]
        annotation: "`run_edit` עושה החלפת מחרוזת ממוקדת — בטוחה יותר מכתיבה מחדש של כל הקובץ. אם `old_text` לא נמצא, היא מחזירה שגיאה במקום לפגום בשקט בקובץ."
      - lines: [27, 32]
        annotation: "`TOOL_HANDLERS` ממפה שמות כלים ל-lambda wrappers. כל lambda מפרקת את ארגומנטי keyword מ-`block.input` וקוראת ל-handler המתאים. הוספת כלי חמישי פירושה הוספת רשומה אחת כאן."
challenge:
  text: "הוסיפו כלי חמישי — `list_files` — שמציג תוכן תיקייה. צריך רק סכמה ו-handler."
  hint: "השתמשו ב-os.listdir() ב-handler והחזירו את שמות הקבצים"
---

## הבעיה

[לולאת הסוכן](/he/s01-the-agent-loop) נתנה לסוכן כלי אחד: bash. זה עובד, אבל זה כלי גס. כל קריאת קובץ דורשת `cat`, כל כתיבה דורשת `echo >`, כל עריכה דורשת `sed`. המודל מבזבז טוקנים על תחביר shell כשהוא יכול להשתמש בכלים ייעודיים.

## הפתרון

הוסיפו כלים למערך. הוסיפו handlers למפת ה-dispatch. הלולאה לא משתנה.

```python
TOOL_HANDLERS = {
    "bash":       run_bash,
    "read_file":  run_read,
    "write_file": run_write,
    "edit_file":  run_edit,
}
```

זה התובנה המרכזית: **הלולאה נשארת זהה לחלוטין מהסשן הראשון. רק מערך הכלים ומפת ה-dispatch גדלים.**

## מפת ה-Dispatch

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

## מה השתנה מ-[לולאת הסוכן](/he/s01-the-agent-loop)

| רכיב | לולאת הסוכן | שימוש בכלים |
|------|-----|-----|
| לולאה | `while True` + `stop_reason` | **זהה** |
| כלים | 1 (bash) | 4 (bash, read, write, edit) |
| Dispatch | קריאה ישירה | מפה: `{name: handler}` |
| אבטחה | רשימת פקודות חסומות | + Sandbox לנתיבים |

הלולאה זהה. הצמיחה היחידה היא במערך הכלים ובמפת ה-dispatch. התבנית הזו מתרחבת ללא הגבלה — הסשנים הבאים ממשיכים להוסיף כלים מבלי לגעת בלולאה.

## מסקנה מרכזית

הוספת כלי לסוכן פירושה שני דברים: (1) סכמת JSON שהמודל רואה, (2) פונקציית handler שה-harness קורא לה. הלולאה לעולם לא משתנה. זו היסוד של הנדסת ה-harness — המודל הופך לכשיר יותר מבלי שארכיטקטורת הליבה הופכת למורכבת יותר.
