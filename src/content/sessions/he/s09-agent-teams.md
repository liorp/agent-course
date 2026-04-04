---
title: "צוותי סוכנים"
session: "s09"
phase: 4
motto: "כשהמשימה גדולה מדי לאחד, האצילו לחברי צוות"
order: 9
readingTime: 25
beginnerConcepts:
  - question: "במה חבר צוות שונה מתת-סוכן?"
    answer: "תת-סוכן הוא חד-פעמי — נולד, עובד, מחזיר סיכום, מת. לחבר צוות יש זהות מתמשכת, מחזור חיים (IDLE, WORKING, SHUTDOWN), ותיבת דואר שהוא בודק בין משימות. חברי צוות זוכרים את תפקידם לאורך הפעלות."
  - question: "מה זה תיבת דואר של סוכן?"
    answer: "קובץ JSONL append-only על הדיסק (למשל, .team/inbox/alice.jsonl). כל סוכן יכול לכתוב הודעה לתיבת הדואר של Alice. כשמגיע תורה, היא מרוקנת את הקובץ — קוראת את כל ההודעות, ואז מחיצה אותו. כמו אימייל, אבל לסוכנים."
  - question: "מה זה roster של צוות?"
    answer: "קובץ JSON (.team/config.json) המפרט את כל חברי הצוות, שמותיהם, תפקידיהם וסטטוסים נוכחיים. הסוכן המוביל קורא אותו כדי לדעת מי זמין ובמה כל חבר צוות מתמחה."
walkthroughs:
  - title: "תבנית תיבת הדואר של חבר הצוות"
    language: "python"
    code: |
      TEAM_DIR = Path(".team")
      INBOX_DIR = TEAM_DIR / "inbox"

      def send_message(to: str, from_: str, content: str) -> str:
          inbox = INBOX_DIR / f"{to}.jsonl"
          msg = {"from": from_, "content": content}
          with open(inbox, "a") as f:
              f.write(json.dumps(msg) + "\n")
          return f"Message sent to {to}."

      def drain_inbox(name: str) -> list:
          inbox = INBOX_DIR / f"{name}.jsonl"
          if not inbox.exists() or inbox.stat().st_size == 0:
              return []
          lines = inbox.read_text().strip().split("\n")
          inbox.write_text("")  # truncate after reading
          return [json.loads(l) for l in lines if l]

      def teammate_loop(name: str, role: str) -> None:
          while True:
              inbox_messages = drain_inbox(name)
              if not inbox_messages:
                  threading.Event().wait(timeout=2)
                  continue
              update_status(name, "WORKING")
              result = run_agent(inbox_messages, name, role)
              send_message("lead", name, result)
              update_status(name, "IDLE")
    steps:
      - lines: [1, 2]
        annotation: "כל מצב הצוות נמצא בתיקיית `.team/`. לכל חבר צוות יש קובץ JSONL כתיבת הדואר שלו — ערוץ תקשורת פשוט, בטוח מקריסות, וידידותי לכתיבה מקבילה."
      - lines: [4, 9]
        annotation: "`send_message()` מוסיפה שורת JSON לקובץ תיבת הדואר של הנמען. פתיחה עם `'a'` (הוסף) פירושה שכותבים מקבילים לא יכולים לפגום אחד בשני — כל קריאת `json.dumps` היא שורה אטומית אחת."
      - lines: [11, 17]
        annotation: "`drain_inbox()` קוראת את כל ההודעות הממתינות ואז מחצה את הקובץ לריק. תבנית read-and-truncate זו היא המפתח: הודעות נצרכות פעם אחת ולא מושמות מחדש במחזור הסקירה הבא."
      - lines: [19, 27]
        annotation: "`teammate_loop()` הוא זמן ריצה של חבר הצוות. הוא סוקר את תיבת הדואר שלו כל 2 שניות. כשעבודה מגיעה, הוא מעדכן סטטוס ל-`WORKING`, מריץ לולאת סוכן לטיפול בהודעות, ואז שולח תוצאה חזרה ל-lead וחוזר ל-`IDLE`."
challenge:
  text: "שגרו שני חברי צוות עם התמחויות שונות ותנו להם לשתף פעולה על משימה דרך תיבת הדואר."
  hint: "תנו להם system prompts משלימים כמו \"מומחה frontend\" ו-\"מומחה backend\""
---

## הבעיה

תת-סוכנים הם חד-פעמיים: נולדים, עובדים, מחזירים סיכום, מתים. אין זהות, אין זיכרון בין הפעלות. משימות רקע מריצות פקודות shell אבל לא יכולות לקבל החלטות מודרכות על ידי LLM.

עבודת צוות אמיתית צריכה: (1) סוכנים מתמשכים שחיים מעבר לפרומפט יחיד, (2) ניהול זהות ומחזור חיים, (3) ערוץ תקשורת בין סוכנים.

## הפתרון

```
Teammate lifecycle:
  spawn -> WORKING -> IDLE -> WORKING -> ... -> SHUTDOWN

Communication:
  .team/
    config.json           <- team roster + statuses
    inbox/
      alice.jsonl         <- append-only, drain-on-read
      bob.jsonl
      lead.jsonl

          +--------+    send("alice","bob","...")    +--------+
          | lead   | -----------------------------> |  bob   |
          +--------+                                +--------+
               ^                                        |
               |           inbox/lead.jsonl             |
               +----------------------------------------+
```

## איך זה עובד

1. תצורת הצוות שומרת roster וסטטוסים.

```python
import json, threading
from pathlib import Path

TEAM_DIR = Path(".team")
INBOX_DIR = TEAM_DIR / "inbox"
TEAM_DIR.mkdir(exist_ok=True)
INBOX_DIR.mkdir(exist_ok=True)

def init_team(teammates: list) -> None:
    config = {
        "teammates": [
            {"name": t["name"], "role": t["role"], "status": "IDLE"}
            for t in teammates
        ]
    }
    (TEAM_DIR / "config.json").write_text(json.dumps(config, indent=2))
    for t in teammates:
        (INBOX_DIR / f"{t['name']}.jsonl").touch()

def get_roster() -> list:
    config = json.loads((TEAM_DIR / "config.json").read_text())
    return config["teammates"]
```

2. תיבות הדואר הן קבצי JSONL append-only. ריקון פירושו קריאה-וחיתוך.

```python
def send_message(to: str, from_: str, content: str) -> str:
    inbox = INBOX_DIR / f"{to}.jsonl"
    msg = {"from": from_, "content": content}
    with open(inbox, "a") as f:
        f.write(json.dumps(msg) + "\n")
    return f"Message sent to {to}."

def drain_inbox(name: str) -> list:
    inbox = INBOX_DIR / f"{name}.jsonl"
    if not inbox.exists() or inbox.stat().st_size == 0:
        return []
    lines = inbox.read_text().strip().split("\n")
    inbox.write_text("")  # truncate after reading
    return [json.loads(l) for l in lines if l]
```

3. כל חבר צוות מריץ לולאת סוכן משלו ב-thread.

```python
def teammate_loop(name: str, role: str) -> None:
    system = f"You are {name}, a {role}. Check your inbox for tasks."
    while True:
        inbox_messages = drain_inbox(name)
        if not inbox_messages:
            # IDLE: wait for work
            threading.Event().wait(timeout=2)
            continue

        update_status(name, "WORKING")
        history = [{"role": "user", "content":
            "\n".join(m["content"] for m in inbox_messages)}]
        # run agent loop with history
        result = run_agent(history, system)
        send_message("lead", name, result)
        update_status(name, "IDLE")
```

## מה השתנה מ-[משימות רקע](/he/s08-background-tasks)

| רכיב | לפני (משימות רקע) | אחרי (צוותי סוכנים) |
|------|-----------|-----------|
| סוכנים | ראשי אחד + bg threads | מוביל + חברי צוות בעלי שמות |
| תקשורת | תור (חד-כיווני) | תיבות דואר (דו-כיווניות) |
| זהות | אין | שם, תפקיד, סטטוס מחזור חיים |
| תיאום | אין | Roster + תבנית send/drain |

## מסקנה מרכזית

תבנית תיבת הדואר היא מה שגורם לצוותי סוכנים לעבוד. לכל חבר צוות יש תיבת דואר פרטית על הדיסק — עמידה, בטוחה לגישה מקבילית, ושקופה. המוביל מאציל על ידי שליחת הודעה; חבר הצוות מרוקן את תיבת הדואר שלו ומגיב. אין זיכרון משותף, אין צורך במנעולים — רק קבצים.
