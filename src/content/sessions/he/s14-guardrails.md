---
title: "מעקות בטיחות"
session: "s14"
phase: 5
motto: "סמכו אבל תבדקו — ואז תבדקו שוב"
order: 14
readingTime: 25
prerequisites:
  - "s01-the-agent-loop"
  - "s02-tool-use"
  - "s13-agent-evals"
whatYouBuild: "מערכת הרשאות שכבתית עם מגנים ברמת הכלי, תקרת עלויות, אישור אנושי, וסנדבוקס בקונטיינר."
beginnerConcepts:
  - question: "למה רשימה שחורה לא מספיקה לבטיחות?"
    answer: "רשימה שחורה כמו `['rm -rf /', 'sudo']` ניתנת לעקיפה בקלות — 'rm -rf /' עובד עם רווחים נוספים, משתני סביבה, או aliases. בטיחות אמיתית צריכה בקרות מבניות: ביצוע בסנדבוקס, הרשאות מבוססות יכולות, ומגבלות עלות."
  - question: "מה זה human-in-the-loop?"
    answer: "דפוס שבו הסוכן עוצר לפני ביצוע פעולות מסוכנות ומבקש אישור מהמשתמש. הרתמה מיירטת את קריאת הכלי, מציגה אותה למשתמש, וממשיכה רק אם הם מאשרים."
  - question: "מה זה הרשאות מבוססות יכולות?"
    answer: "במקום לחסום דברים רעים (רשימה שחורה), אתם מתירים במפורש רק דברים טובים (רשימה לבנה). סוכן עם יכולת 'מערכת קבצים לקריאה בלבד' יכול לקרוא כל קובץ אבל לא לכתוב. זה בטוח יותר כי פקודות לא יד��עות נדחות כברירת מחדל."
walkthroughs:
  - title: "מערכת הרשאות שכבתית"
    language: "python"
    code: |
      @dataclass
      class ToolPermission:
          tool_name: str
          auto_approve: bool = False
          requires_approval: bool = False
          denied: bool = False
          cost_limit: float | None = None

      class GuardRail:
          def __init__(self, permissions: list[ToolPermission]):
              self.perms = {p.tool_name: p for p in permissions}
              self.total_cost = 0.0
              self.cost_cap = 5.00  # dollars

          def check(self, tool_name: str, tool_input: dict) -> str:
              perm = self.perms.get(tool_name)
              if not perm or perm.denied:
                  return "DENIED"
              if self.total_cost > self.cost_cap:
                  return "COST_CAP_EXCEEDED"
              if perm.requires_approval:
                  return "NEEDS_APPROVAL"
              if perm.auto_approve:
                  if self._is_dangerous(tool_name, tool_input):
                      return "NEEDS_APPROVAL"
                  return "APPROVED"
              return "NEEDS_APPROVAL"

          def _is_dangerous(self, tool_name: str, tool_input: dict) -> bool:
              if tool_name == "bash":
                  cmd = tool_input.get("command", "")
                  write_patterns = ["rm ", "mv ", ">", "chmod", "kill"]
                  return any(p in cmd for p in write_patterns)
              if tool_name == "write_file":
                  path = tool_input.get("path", "")
                  return ".env" in path or "credentials" in path
              return False
    steps:
      - lines: [1, 6]
        annotation: "`ToolPermission` מגדיר את המדיניות לכלי אחד. כל כלי יכול לקבל אישור אוטומטי (נתיב מהיר), לדרוש אישור אנושי, או להידחות לחלוטין."
      - lines: [8, 12]
        annotation: "`GuardRail` מחזיק את מפת ההרשאות המלאה ועוקב אחר עלות מצטברת. ה-`cost_cap` הוא תקרה קשיחה — ברגע שהסוכן מוציא $5, כל קריאות הכלים נחסמות."
      - lines: [14, 26]
        annotation: "`check()` נקראת לפני כל ביצוע כלי. היא מחזירה פסק דין שהרתמה פועלת לפיו. סדר העדיפות: דחייה > תקרת עלות > דורש אישור > אישור אוטומטי עם בדיקת סכנה."
      - lines: [28, 35]
        annotation: "`_is_dangerous()` מחילה בדיקות היוריסטיות בתוך כלים שאושרו אוטומטית. גם אם bash מאושר אוטומטית לקריאות, פקודות כתיבה (`rm`, `mv`, `>`) מועלות לאישור אנושי."
challenges:
  - tier: "warmup"
    text: "רשמו 3 דרכים לעקוף את הרשימה השחורה מ-s01 (`['rm -rf /', 'sudo']`). ואז הסבירו למה הרשאות מבוססות יכולות לא סובלות מהחורים האלה."
    hint: "חשבו על: משתני סביבה ($SHELL), קידוד, שרשור פקודות (&&), ו-aliases."
  - tier: "build"
    text: "ממשו את מערכת ה-guardrail המלאה: הוסיפו פונקציית `human_approve()` שמדפיסה את קריאת הכלי הממתינה ומחכה לקלט y/n. שלבו אותה בלולאת הסוכן מ-s01."
    hint: "הכניסו את בדיקת ה-guard בין ניתוח קריאת הכלי לביצוע הכלי בלולאה."
  - tier: "stretch"
    text: "הוסיפו סנדבוקס בקונטיינר: עטפו את ביצוע כלי ה-bash ב-`docker run --rm --network none` כך שהסוכן לא יוכל לגשת לרשת או למערכת הקבצים של המארח."
    hint: "הרכיבו רק את תיקיית העבודה כ-volume. השתמשו בדגל `--read-only` עם tmpfs לכתיבה ב-/tmp."
---

## הבעיה

ב[לולאת הסוכן](/he/s01-the-agent-loop), הוספנו רשימה שחורה לכלי ה-bash:

```python
dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]
if any(d in command for d in dangerous):
    return "Error: Dangerous command blocked"
```

זה מרגיש בטוח. זה לא. הנה שלוש דרכים לעקוף את זה בשניות:

**עקיפה 1: רווחים נוספים.** הרשימה השחורה בודקת `"rm -rf /"` אבל `rm  -rf  /` (רווחים כפולים) עוברת. וגם `rm -r -f /`.

**עקיפה 2: הרחבת משתני סביבה.** `$SHELL -c "rm -rf /"` מריצה את הפקודה המסוכנת בתוך sub-shell. הרשימה השחורה רואה `$SHELL -c ...`, לא `rm -rf /`.

**עקיפה 3: שרשור פקודות.** `echo hello && su -c reboot` — הרשימה השחורה לא מזהה את `su`. וגם לא `doas reboot`, `pkexec reboot`, או כתיבת סקריפט לדיסק והרצתו.

הפגם הבסיסי: רשימות שחורות מנסות למנות הכל רע. הקבוצה של פקודות מסוכנות היא אינסופית. אי אפשר לנצח את המשחק הזה.

## הפתרון

במקום בדיקה שברירית אחת, בונים חמש שכבות הגנה. כל שכבה תופסת את מה שהקודמת פספסה:

```
שכבה 1: הרשאות מבוססות יכולות — רק כלים מורשים יכולים לרוץ
שכבה 2: היוריסטיקות סכנה        — זיהוי דפוסים בתוך כלים מורשים
שכבה 3: Human-in-the-Loop      — שאלו את המשתמש לפני פעולות מסוכנות
שכבה 4: תקרת עלויות            — תקציב קשיח עוצר סוכנים פרועים
שכבה 5: סנדבוקס בקונטיינר       — גם אם הכל נכשל, רדיוס הפיצוץ מוגבל
```

## שכבה 1: הרשאות מבוססות יכולות

הרעיון המרכזי: במקום לחסום דברים רעים, להתיר במפורש רק דברים טובים.

```python
@dataclass
class ToolPermission:
    tool_name: str
    auto_approve: bool = False
    requires_approval: bool = False
    denied: bool = False

permissions = [
    ToolPermission("bash", auto_approve=True),
    ToolPermission("read_file", auto_approve=True),
    ToolPermission("write_file", requires_approval=True),
    ToolPermission("execute_sql", denied=True),
]
```

כל כלי שלא ברשימת ההרשאות נדחה כברירת מחדל. זה ההיפך מרשימה שחורה — כלים לא ידועים נחסמים, לא מורשים.

## שכבה 3: Human-in-the-Loop

```python
def human_approve(tool_name: str, tool_input: dict) -> bool:
    print(f"\n{'='*50}")
    print(f"APPROVAL REQUIRED: {tool_name}")
    print(f"Input: {json.dumps(tool_input, indent=2)}")
    print(f"{'='*50}")
    while True:
        answer = input("Allow? [y/n]: ").strip().lower()
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
```

## שכבה 5: סנדבוקס בקונטיינר

הגנה אחרונה: גם אם הסוכן עוקף הרשאות, היוריסטיקות, אישור, ומגבלות עלות — הוא לא יכול לברוח מהקונטיינר.

```python
def run_bash_sandboxed(command: str, workspace: str) -> str:
    docker_cmd = [
        "docker", "run", "--rm",
        "--network", "none",
        "--read-only",
        "--tmpfs", "/tmp:size=100m",
        "-v", f"{workspace}:/work",
        "-w", "/work",
        "--memory", "512m",
        "--cpus", "1.0",
        "python:3.12-slim",
        "bash", "-c", command,
    ]
    try:
        r = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=120)
        out = (r.stdout + r.stderr).strip()
        return out[:50000] if out else "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: Timeout (120s)"
```

## מה השתנה מ[הערכת סוכנים](/he/s13-agent-evals)

| דאגה | Evals (s13) | מעקות בטיחות (s14) |
|------|-------------|-------------------|
| מתי רץ | לפני פריסה (זמן בדיקה) | בזמן פריסה (runtime) |
| מה תופס | פלטים שגויים, רגרסיות | פעולות מסוכנות, חריגות עלות |
| מי מוגן | מפתחים (איכות) | משתמשים ומערכות (בטיחות) |

## נקודה מרכזית

בטיחות היא לא בדיקה אחת — היא מחסנית. הרשאות יכולות דוחות כלים לא ידועים. היוריסטיקות מעלות קלטים חשודים. Human-in-the-loop תופס מה שהיוריסטיקות מפספסות. תקרות עלות מונעות הוצאה פרועה. סנדבוקס בקונטיינר מגביל את רדיוס הפיצוץ כשהכל האחר נכשל. בנו את כל חמש השכבות ברתמה שלכם לפני שתיתנו לסוכן לרוץ ללא פיקוח.
