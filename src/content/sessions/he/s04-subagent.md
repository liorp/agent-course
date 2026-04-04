---
title: "תת-סוכנים"
session: "s04"
phase: 2
motto: "פרקו משימות גדולות; כל תת-משימה מקבלת הקשר נקי"
order: 4
readingTime: 20
beginnerConcepts:
  - question: "מה זה תת-סוכן?"
    answer: "סוכן ילד שנולד על ידי ההורה עם מערך הודעות ריק ונקי. הוא עושה את עבודתו, מחזיר סיכום קצר, וכל היסטוריית השיחה שלו נזרקת. ההורה נשאר נקי."
  - question: "למה לא לשמור הכל בשיחה אחת?"
    answer: "ה-context מוגבל ויקר. אם ההורה שואל 'איזה framework בדיקות משתמש הפרויקט הזה?', הילד עשוי לקרוא 5 קבצים כדי למצוא את התשובה. ההורה צריך רק את התשובה בשורה אחת, לא את תוכן 5 הקבצים."
  - question: "האם תת-סוכנים יכולים לייצר תת-סוכנים משלהם?"
    answer: "בעיצוב זה, לא. הילד מקבל את כל הכלים הבסיסיים חוץ מכלי ה-'task', מה שמונע ייצור רקורסיבי. זה שומר על הארכיטקטורה פשוטה ומונע שרשראות סוכן בלתי מבוקרות."
  - question: "מה קורה לעבודת התת-סוכן?"
    answer: "תופעות הלוואי של התת-סוכן (קבצים שנכתבו, פקודות שהורצו) נשמרות על הדיסק. רק היסטוריית השיחה נזרקת. ההורה מקבל סיכום טקסטי של מה שנעשה."
---

## הבעיה

כשהסוכן עובד, מערך ההודעות שלו גדל. כל קריאת קובץ, כל פלט bash נשאר ב-context לנצח. "איזה framework בדיקות משתמש הפרויקט הזה?" עשוי לדרוש קריאת 5 קבצים, אבל ההורה צריך רק את התשובה: "pytest."

## הפתרון

```
Parent agent                     Subagent
+------------------+             +------------------+
| messages=[...]   |             | messages=[]      | <-- fresh
|                  |  dispatch   |                  |
| tool: task       | ----------> | while tool_use:  |
|   prompt="..."   |             |   call tools     |
|                  |  summary    |   append results |
|   result = "..." | <---------- | return last text |
+------------------+             +------------------+

Parent context stays clean. Subagent context is discarded.
```

## איך זה עובד

1. ההורה מקבל כלי `task`. הילד מקבל את כל הכלים הבסיסיים חוץ מ-`task` (ללא ייצור רקורסיבי).

```python
PARENT_TOOLS = CHILD_TOOLS + [
    {"name": "task",
     "description": "Spawn a subagent with fresh context.",
     "input_schema": {
         "type": "object",
         "properties": {"prompt": {"type": "string"}},
         "required": ["prompt"],
     }},
]
```

2. התת-סוכן מתחיל עם `messages=[]` ומריץ לולאה משלו. רק הטקסט הסופי חוזר להורה.

```python
def run_subagent(prompt: str) -> str:
    sub_messages = [{"role": "user", "content": prompt}]
    for _ in range(30):  # safety limit
        response = client.messages.create(
            model=MODEL, system=SUBAGENT_SYSTEM,
            messages=sub_messages,
            tools=CHILD_TOOLS, max_tokens=8000,
        )
        sub_messages.append({"role": "assistant",
                             "content": response.content})
        if response.stop_reason != "tool_use":
            break
        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input)
                results.append({"type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(output)[:50000]})
        sub_messages.append({"role": "user", "content": results})
    return "".join(
        b.text for b in response.content if hasattr(b, "text")
    ) or "(no summary)"
```

כל היסטוריית ההודעות של הילד (אולי 30+ קריאות כלי) נזרקת. ההורה מקבל סיכום של פסקה אחת כ-`tool_result` רגיל.

## מה השתנה מ-TodoWrite

| רכיב | לפני (TodoWrite) | אחרי (תת-סוכנים) |
|------|-----------|-----------|
| כלים | 5 | 5 (base) + task (parent) |
| Context | שיתוף יחיד | בידוד הורה + ילד |
| תת-סוכן | אין | פונקציה `run_subagent()` |
| ערך החזרה | N/A | טקסט סיכום בלבד |

## מסקנה מרכזית

בידוד ה-context הוא התובנה המרכזית. תבנית התת-סוכן מאפשרת להורה להאציל עבודה מלוכלכת וחקרנית מבלי לזהם את ה-context שלו עצמו. ההורה חושב במטרות ברמה גבוהה; הילד מטפל בפרטים. תופעות הלוואי נשמרות על הדיסק, אבל הרעש מהשיחה נזרק.
