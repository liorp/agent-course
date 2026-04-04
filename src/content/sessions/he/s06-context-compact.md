---
title: "דחיסת הקשר"
session: "s06"
phase: 2
motto: "ההקשר יתמלא; צריך דרך לפנות מקום"
order: 6
readingTime: 20
beginnerConcepts:
  - question: "מה זה חלון הקשר (context window)?"
    answer: "הכמות הכוללת של טקסט (טוקנים) שהמודל יכול 'לראות' בבת אחת — כולל הפרומפט שלך, היסטוריית השיחה, תוצאות כלים, וכל ההודעות הקודמות. חלון ה-context של Claude גדול אבל מוגבל."
  - question: "למה ה-context מתמלא?"
    answer: "כל קריאת כלי מוסיפה את התוצאה שלה למערך ההודעות. קריאת קובץ של 1000 שורות מוסיפה ~4000 טוקן. אחרי 30 קריאות קבצים ו-20 פקודות bash, אפשר להגיע בקלות ל-100,000+ טוקן ולגשת לגבול."
  - question: "מה זה micro-compaction?"
    answer: "טכניקה שבה תוצאות כלים ישנות מיותר מ-3 סיבובים מוחלפות בסיכום קצר כמו '[Previous: used read_file]'. זה קוצץ בשקט פרטים ישנים תוך שמירת ה-context האחרון שלם."
walkthroughs:
  - title: "אסטרטגיית הדחיסה בשלושה שלבים"
    language: "python"
    code: |
      def count_tokens(messages: list) -> int:
          text = json.dumps(messages)
          return len(text) // 4  # rough estimate: 4 chars ≈ 1 token

      def maybe_compact(messages: list) -> list:
          tokens = count_tokens(messages)
          if tokens > 80000:
              return hard_compact(messages)
          if tokens > 50000:
              return mid_compact(messages)
          return micro_compact(messages)

      def hard_compact(messages: list) -> list:
          summary_prompt = (
              "Summarize the conversation so far. Include: "
              "what the user asked, what tools you used, "
              "what you found, what's left to do. Be dense."
          )
          summary_messages = messages + [{"role": "user", "content": summary_prompt}]
          response = client.messages.create(
              model=MODEL, system=SYSTEM,
              messages=summary_messages, max_tokens=2000,
          )
          summary = response.content[0].text
          return [
              {"role": "user", "content": f"<context_summary>\n{summary}\n</context_summary>"},
              {"role": "assistant", "content": "Understood. Continuing from the summary."},
          ]
    steps:
      - lines: [1, 3]
        annotation: "ספירת טוקנים מכוונת להיות גסה — חלוקת אורך ה-JSON ב-4 נותנת הערכה מהירה. הספירה המדויקת לא חשובה; מה שחשוב הוא הפעלת הדחיסה לפני הגעה לגבול ה-API הקשיח."
      - lines: [5, 11]
        annotation: "maybe_compact() היא נקודת ההחלטה היחידה. היא נקראת לפני כל קריאת LLM בלולאת הסוכן. שלושת הספים יוצרים הסלמה מתקדמת: micro בכל זמן, mid ב-50k, hard ב-80k."
      - lines: [13, 27]
        annotation: "hard_compact() משתמש ב-LLM עצמו לכתיבת הסיכום שלו. הוא מוסיף בקשת סיכום להודעות הקיימות, קורא ל-API, ומחליף את כל ההיסטוריה בסיכום המתקבל — צמצום 80k+ טוקן ל-~2000."
      - lines: [24, 27]
        annotation: "ה-context הדחוס הוא רק שתי הודעות: הודעת משתמש עם הסיכום עטוף בתגי <context_summary>, ואישור קצר מהסוכן. קריאת ה-LLM הבאה מתחילה מחדש מהקשר מינימלי זה."
challenge:
  text: "מלאו את חלון ההקשר על ידי מתן משימות רבות ברצף. צפו בדחיסה נכנסת לפעולה."
  hint: "בדקו את ספירת הטוקנים ב-metadata של התשובה"
---

## הבעיה

חלון ה-context מוגבל. `read_file` יחיד על קובץ של 1000 שורות עולה ~4000 טוקן. אחרי קריאת 30 קבצים והרצת 20 פקודות bash, מגיעים ל-100,000+ טוקן. הסוכן לא יכול לעבוד על codebases גדולים ללא דחיסה.

## הפתרון

שלוש שכבות, בעוצמה עולה:

```
Every turn:
+------------------+
| Tool call result |
+------------------+
        |
        v
[Layer 1: micro_compact]        (silent, every turn)
  Replace tool_result > 3 turns old
  with "[Previous: used {tool_name}]"
        |
        v
[Check: tokens > 50000?]
   |               |
  yes              no
   |               |
   v               +--- continue normally
[Layer 2: mid_compact]
  Summarize assistant messages
  Keep only last 5 tool results
   |
   v
[Check: tokens > 80000?]
   |               |
  yes              no
   |               +--- continue
   v
[Layer 3: hard_compact]
  Call LLM to write a dense summary
  Replace entire history with summary
  Inject <identity> reminder
```

## איך זה עובד

1. **שכבה 1 — דחיסת micro** רצה בשקט בכל סיבוב. תוצאות כלים ישנות מיותר מ-3 סיבובים הופכות למציין מקום של שורה אחת.

```python
def micro_compact(messages: list) -> list:
    compacted = []
    for i, msg in enumerate(messages):
        if msg["role"] == "user" and isinstance(msg["content"], list):
            age = len(messages) - i
            if age > 6:  # older than 3 turns (user+assistant pairs)
                new_content = []
                for block in msg["content"]:
                    if block.get("type") == "tool_result":
                        tool_name = block.get("_tool_name", "tool")
                        new_content.append({
                            "type": "tool_result",
                            "tool_use_id": block["tool_use_id"],
                            "content": f"[Previous: used {tool_name}]",
                        })
                    else:
                        new_content.append(block)
                compacted.append({**msg, "content": new_content})
                continue
        compacted.append(msg)
    return compacted
```

2. **שכבה 2 — דחיסת mid** מופעלת כשספירת הטוקנים עוברת 50,000. היא שומרת את פרומפט המערכת, את 5 תוצאות הכלים האחרונות במלואן, ומסכמת את השאר.

```python
def count_tokens(messages: list) -> int:
    text = json.dumps(messages)
    return len(text) // 4  # rough estimate: 4 chars ≈ 1 token

def maybe_compact(messages: list) -> list:
    tokens = count_tokens(messages)
    if tokens > 80000:
        return hard_compact(messages)
    if tokens > 50000:
        return mid_compact(messages)
    return micro_compact(messages)
```

3. **שכבה 3 — דחיסת hard** מבקשת מה-LLM עצמו לכתוב סיכום צפוף של מה שקרה, ואז מחליפה את כל ההיסטוריה בסיכום הזה בתוספת תזכורת זהות.

```python
def hard_compact(messages: list) -> list:
    summary_prompt = (
        "Summarize the conversation so far. Include: "
        "what the user asked, what tools you used, "
        "what you found, what's left to do. Be dense."
    )
    summary_messages = messages + [{"role": "user", "content": summary_prompt}]
    response = client.messages.create(
        model=MODEL, system=SYSTEM,
        messages=summary_messages, max_tokens=2000,
    )
    summary = response.content[0].text
    return [
        {"role": "user", "content": f"<context_summary>\n{summary}\n</context_summary>"},
        {"role": "assistant", "content": "Understood. Continuing from the summary."},
    ]
```

## מה השתנה מ-[מיומנויות](/he/s05-skill-loading)

| רכיב | לפני (מיומנויות) | אחרי (דחיסת הקשר) |
|------|-----------|-----------|
| Context | גדל לנצח | דחיסה תלת-שכבתית |
| תוצאות ישנות | תוכן מלא | מציין מקום של שורה אחת |
| גבול טוקנים | פגיעה וקריסה | גבול רך ב-50k, קשה ב-80k |
| היסטוריה | ללא גבולות | נדחסת לפי דרישה |

## מסקנה מרכזית

דחיסת ה-context היא מה שהופך סוכנים עם ריצה ארוכה לאפשריים מעשית. האסטרטגיה התלת-שכבתית היא פרוגרסיבית: עשה את הדבר הזול ביותר קודם (micro), הסלם רק כשצריך (mid), ובתור מוצא אחרון בקש מהמודל לסכם את עצמו (hard). קוד הלולאה כמעט לא משתנה — רק עטפו את `messages` דרך `maybe_compact()` לפני כל קריאת LLM.
