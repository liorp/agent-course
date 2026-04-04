---
title: "מיומנויות"
session: "s05"
phase: 2
motto: "טענו ידע כשצריך, לא מראש"
order: 5
readingTime: 15
beginnerConcepts:
  - question: "מה זה מיומנות (skill) בהקשר זה?"
    answer: "קובץ markdown (SKILL.md) המכיל הוראות ספציפיות לתחום — כמו מדריך תהליכי git או רשימת תיוגים לסקירת קוד. הסוכן טוען אותו לפי דרישה במקום לדחוס את כל הידע לתוך פרומפט המערכת."
  - question: "מה זה הגישה הדו-שכבתית?"
    answer: "שכבה 1: תיאורי מיומנות קצרים בפרומפט המערכת (זול, תמיד גלוי). שכבה 2: תוכן מיומנות מלא שנטען דרך tool_result כשהמודל מבקש אותו (יקר, לפי דרישה). זה חוסך טוקנים."
  - question: "למה לא לשים הכל בפרומפט המערכת?"
    answer: "10 מיומנויות של 2000 טוקן כל אחת = 20,000 טוקן של הוראות, רובם לא רלוונטים לכל משימה נתונה. הגישה הדו-שכבתית עולה ~100 טוקן למיומנות בפרומפט המערכת. תוכן מלא נטען רק כשצריך."
  - question: "איך המודל יודע איזה מיומנות לטעון?"
    answer: "פרומפט המערכת מפרט שמות מיומנויות זמינות עם תיאורים קצרים. המודל קורא אותם ומחליט איזו מיומנות רלוונטית למשימה הנוכחית, ואז קורא ל-load_skill('name') כדי לקבל את ההוראות המלאות."
walkthroughs:
  - title: "מנגנון טעינת המיומנויות"
    language: "python"
    code: |
      class SkillLoader:
          def __init__(self, skills_dir: Path):
              self.skills = {}
              for f in sorted(skills_dir.rglob("SKILL.md")):
                  text = f.read_text()
                  meta, body = self._parse_frontmatter(text)
                  name = meta.get("name", f.parent.name)
                  self.skills[name] = {"meta": meta, "body": body}

          def get_descriptions(self) -> str:
              lines = []
              for name, skill in self.skills.items():
                  desc = skill["meta"].get("description", "")
                  lines.append(f"  - {name}: {desc}")
              return "\n".join(lines)

          def get_content(self, name: str) -> str:
              skill = self.skills.get(name)
              if not skill:
                  return f"Error: Unknown skill '{name}'."
              return f"<skill name=\"{name}\">\n{skill['body']}\n</skill>"

      TOOL_HANDLERS = {
          "load_skill": lambda **kw: SKILL_LOADER.get_content(kw["name"]),
      }
    steps:
      - lines: [1, 8]
        annotation: "__init__ סורקת את תיקיית המיומנויות רקורסיבית לחיפוש קבצי SKILL.md. היא מנתחת frontmatter של YAML כדי לקבל מטא-נתונים (שם, תיאור) ושומרת את הגוף בנפרד. שם התיקייה משמש כחלופה אם 'name' חסר ב-frontmatter."
      - lines: [10, 15]
        annotation: "get_descriptions() בונה את טקסט שכבה 1 — התפריט הזול שמוזרק לפרומפט המערכת. כל מיומנות מופיעה כשורה אחת עם שמה ותיאור קצר. זה עולה ~100 טוקן ללא קשר לגודל גופי המיומנויות."
      - lines: [17, 21]
        annotation: "get_content() היא שכבה 2 — הטעינה היקרה לפי דרישה. היא עוטפת את גוף המיומנות המלא בתג XML של <skill> כדי שהמודל יוכל לזהות היכן תוכן המיומנות מתחיל ומסתיים ב-context שלו."
      - lines: [23, 24]
        annotation: "load_skill הוא רק handler כלי נוסף. כשהמודל קורא ל-load_skill('git'), ה-lambda הזה מריץ את get_content('git') ומחזיר את גוף המיומנות המלא כ-tool_result. אין צורך בשינויים מיוחדים בלולאה."
---

## הבעיה

אתם רוצים שהסוכן יעקוב אחר תהליכי עבודה ספציפיים לתחום: מוסכמות git, תבניות בדיקות, רשימות סקירת קוד. הכנסת הכל לפרומפט המערכת מבזבזת טוקנים על מיומנויות שלא בשימוש. 10 מיומנויות של 2000 טוקן כל אחת = 20,000 טוקן, רובם לא רלוונטים לכל משימה נתונה.

## הפתרון

```
System prompt (Layer 1 -- always present):
+--------------------------------------+
| You are a coding agent.              |
| Skills available:                    |
|   - git: Git workflow helpers        |  ~100 tokens/skill
|   - test: Testing best practices     |
+--------------------------------------+

When model calls load_skill("git"):
+--------------------------------------+
| tool_result (Layer 2 -- on demand):  |
| <skill name="git">                   |
|   Full git workflow instructions...  |  ~2000 tokens
|   Step 1: ...                        |
| </skill>                             |
+--------------------------------------+
```

שכבה 1: *שמות* מיומנויות בפרומפט המערכת (זול). שכבה 2: *גוף* מלא דרך tool_result (לפי דרישה).

## איך זה עובד

1. כל מיומנות היא תיקייה המכילה `SKILL.md` עם frontmatter מסוג YAML.

```
skills/
  pdf/
    SKILL.md       # ---\n name: pdf\n description: Process PDF files\n ---\n ...
  code-review/
    SKILL.md       # ---\n name: code-review\n description: Review code\n ---\n ...
```

2. SkillLoader סורק קבצי `SKILL.md`, משתמש בשם התיקייה כמזהה המיומנות.

```python
class SkillLoader:
    def __init__(self, skills_dir: Path):
        self.skills = {}
        for f in sorted(skills_dir.rglob("SKILL.md")):
            text = f.read_text()
            meta, body = self._parse_frontmatter(text)
            name = meta.get("name", f.parent.name)
            self.skills[name] = {"meta": meta, "body": body}

    def get_descriptions(self) -> str:
        lines = []
        for name, skill in self.skills.items():
            desc = skill["meta"].get("description", "")
            lines.append(f"  - {name}: {desc}")
        return "\n".join(lines)

    def get_content(self, name: str) -> str:
        skill = self.skills.get(name)
        if not skill:
            return f"Error: Unknown skill '{name}'."
        return f"<skill name=\"{name}\">\n{skill['body']}\n</skill>"
```

3. שכבה 1 נכנסת לפרומפט המערכת. שכבה 2 היא רק handler נוסף לכלי.

```python
SYSTEM = f"""You are a coding agent at {WORKDIR}.
Skills available:
{SKILL_LOADER.get_descriptions()}"""

TOOL_HANDLERS = {
    # ...base tools...
    "load_skill": lambda **kw: SKILL_LOADER.get_content(kw["name"]),
}
```

המודל לומד אילו מיומנויות קיימות (זול) וטוען אותן כשרלוונטי (יקר).

## מה השתנה מ-[תת-סוכנים](/he/s04-subagent)

| רכיב | לפני (תת-סוכנים) | אחרי (מיומנויות) |
|------|-----------|-----------|
| כלים | 5 (base + task) | 5 (base + load_skill) |
| פרומפט מערכת | מחרוזת סטטית | + תיאורי מיומנויות |
| ידע | אין | קבצי skills/*/SKILL.md |
| הזרקה | אין | דו-שכבתי (system + result) |

## מסקנה מרכזית

טעינת ידע לפי דרישה היא תבנית אופטימיזציית טוקנים. במקום להכניס מראש את כל ההוראות, אתם חושפים תפריט (זול) וטוענים תוכן מלא (יקר) רק כשהמודל מחליט שהוא רלוונטי. התבנית הזו מתרחבת למאות מיומנויות מבלי לנפח כל שיחה.
