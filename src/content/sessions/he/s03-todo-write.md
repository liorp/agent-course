---
title: "כתיבת משימות"
session: "s03"
phase: 2
motto: "סוכן בלי תוכנית נסחף"
order: 3
readingTime: 20
beginnerConcepts:
  - question: "מה זה TodoManager?"
    answer: "מחלקה פשוטה שמנהלת רשימת משימות עם סטטוסים (pending, in_progress, done). היא מאלצת את המודל לכתוב את התוכנית שלו לפני הביצוע, כדי שלא יאבד עקב מה שצריך לעשות אחר כך."
  - question: "למה רק משימה אחת in_progress בו-זמנית?"
    answer: "זה מאלץ מיקוד עוקב. המודל חייב לסיים או לעדכן את המשימה הנוכחית לפני שיעבור הלאה. זה מונע מהסוכן להתחיל 5 דברים ולא לסיים אף אחד."
  - question: "מה זה nag reminder?"
    answer: "הזרקת טקסט קטנה (<reminder>) שמתווספת לשיחה אם המודל לא עדכן את רשימת המשימות ב-3+ סיבובים. היא דוחפת את המודל לשמור על מסלול מבלי שהמשתמש צריך להתערב."
  - question: "במה זה שונה מרשימת תיוגים רגילה?"
    answer: "רשימת תיוגים רגילה היא טקסט סטטי שהמודל עשוי להתעלם ממנו. TodoWrite הוא כלי שהמודל קורא לו באופן אקטיבי כדי לעדכן סטטוסים. ה-harness עוקב אחר סיבובים ומזריק תזכורות, מה שהופך אותו ללולאת משוב, לא רק הערה."
walkthroughs:
  - title: "מחלקת TodoManager"
    language: "python"
    code: |
      class TodoManager:
          def update(self, items: list) -> str:
              validated, in_progress_count = [], 0
              for item in items:
                  status = item.get("status", "pending")
                  if status == "in_progress":
                      in_progress_count += 1
                  validated.append({"id": item["id"], "text": item["text"],
                                    "status": status})
              if in_progress_count > 1:
                  raise ValueError("Only one task can be in_progress")
              self.items = validated
              return self.render()

      if rounds_since_todo >= 3 and messages:
          last = messages[-1]
          if last["role"] == "user" and isinstance(last.get("content"), list):
              last["content"].insert(0, {
                  "type": "text",
                  "text": "<reminder>Update your todos.</reminder>",
              })
    steps:
      - lines: [1, 2]
        annotation: "TodoManager הוא מחלקה פשוטה. מתודת update() היא פעולת הכתיבה היחידה — המודל קורא לה עם הרשימה המלאה של פריטים בכל פעם שהוא רוצה לשנות משהו."
      - lines: [3, 9]
        annotation: "כל פריט עובר אימות ואריזה מחדש עם רק השדות שאנחנו צריכים. שדות נוספים שהמודל עשוי להמציא נמחקים בשקט."
      - lines: [10, 12]
        annotation: "האילוץ של in_progress אחד נאכף כאן. אם המודל מנסה להגדיר שתי משימות כ-in_progress בו-זמנית, הוא מקבל שגיאה וחייב לנסות שוב עם רשימה מתוקנת."
      - lines: [13, 13]
        annotation: "self.render() מעצבת את רשימת המשימות כטקסט קריא (למשל '[ ] משימה א, [>] משימה ב') שמוחזרת כ-tool_result — המודל רואה את רשימתו המעודכנת מיד."
      - lines: [15, 21]
        annotation: "תזכורת ה-nag מזריקה בלוק טקסט <reminder> בתחילת הודעת המשתמש האחרונה אם עברו 3+ סיבובים ללא עדכון משימות. היא דוחפת את המודל ללא צורך בהתערבות המשתמש."
challenge:
  text: "הריצו את סוכן s03 ותנו לו משימה מרובת שלבים. צפו איך הוא יוצר רשימת משימות לפני שהוא פועל."
  hint: "נסו: \"צרו פרויקט Python עם טסטים, README, ו-CLI\""
---

## הבעיה

במשימות מרובות שלבים, המודל מאבד עקב. הוא חוזר על עבודה, מדלג על שלבים, או סוטה ממסלול. שיחות ארוכות מחמירות את המצב — הפרומפט של המערכת מתמעט כשתוצאות הכלים ממלאות את ה-context. רפקטורינג של 10 שלבים עשוי להשלים שלבים 1-3, ואז המודל מתחיל לאלתר כי שכח את שלבים 4-10.

## הפתרון

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> | Tools   |
| prompt |      |       |      | + todo  |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
                          |
              +-----------+-----------+
              | TodoManager state     |
              | [ ] task A            |
              | [>] task B  <- doing  |
              | [x] task C            |
              +-----------------------+
                          |
              if rounds_since_todo >= 3:
                inject <reminder> into tool_result
```

## איך זה עובד

1. TodoManager שומר פריטים עם סטטוסים. רק פריט אחד יכול להיות `in_progress` בכל עת.

```python
class TodoManager:
    def update(self, items: list) -> str:
        validated, in_progress_count = [], 0
        for item in items:
            status = item.get("status", "pending")
            if status == "in_progress":
                in_progress_count += 1
            validated.append({"id": item["id"], "text": item["text"],
                              "status": status})
        if in_progress_count > 1:
            raise ValueError("Only one task can be in_progress")
        self.items = validated
        return self.render()
```

2. הכלי `todo` נכנס למפת ה-dispatch כמו כל כלי אחר.

```python
TOOL_HANDLERS = {
    # ...base tools...
    "todo": lambda **kw: TODO.update(kw["items"]),
}
```

3. ה-nag reminder מזריק דחיפה אם המודל עובר 3+ סיבובים מבלי לקרוא ל-`todo`.

```python
if rounds_since_todo >= 3 and messages:
    last = messages[-1]
    if last["role"] == "user" and isinstance(last.get("content"), list):
        last["content"].insert(0, {
            "type": "text",
            "text": "<reminder>Update your todos.</reminder>",
        })
```

האילוץ של "in_progress אחד בכל עת" מאלץ מיקוד עוקב. ה-nag reminder יוצר אחריות.

## מה השתנה מ-[שימוש בכלים](/he/s02-tool-use)

| רכיב | לפני (שימוש בכלים) | אחרי (TodoWrite) |
|------|-----------|-----------|
| כלים | 4 | 5 (+todo) |
| תכנון | אין | TodoManager עם סטטוסים |
| הזרקת תזכורת | אין | `<reminder>` אחרי 3 סיבובים |
| לולאת הסוכן | dispatch פשוט | + מונה rounds_since_todo |

## מסקנה מרכזית

תכנון הוא לא אופציונלי לעבודה מרובת שלבים. תבנית TodoWrite נותנת למודל דרך מובנית לעקוב אחר ההתקדמות שלו עצמו, כשה-harness אוכף אחריות דרך תזכורות. הלולאה כמעט לא משתנה — כלי חדש אחד, מונה אחד, נקודת הזרקה אחת.
