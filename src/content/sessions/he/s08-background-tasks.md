---
title: "משימות רקע"
session: "s08"
phase: 3
motto: "הריצו פעולות איטיות ברקע; הסוכן ממשיך לחשוב"
order: 8
readingTime: 20
beginnerConcepts:
  - question: "מה זה פעולה חוסמת?"
    answer: "פקודה שגורמת לתוכנית להמתין עד שתסיים לפני שעושה כל דבר אחר. 'npm install' יכול לקחת 2 דקות. עם ביצוע חוסם, הסוכן יושב בלא פעולה כל הזמן הזה — מבזבז זמן קיר ואת סבלנות המשתמש."
  - question: "מה זה daemon thread?"
    answer: "Thread רקע שרץ באופן עצמאי מהתוכנית הראשית. כשמוגדר כ-daemon=True ב-Python, הוא עוצר אוטומטית כשהתוכנית הראשית יוצאת, כך שאין צורך לנהל ניקוי."
  - question: "איך הסוכן לומד שמשימת רקע הסתיימה?"
    answer: "ה-thread הרקע דוחף תוצאה לתור משותף. לפני כל קריאת LLM, הסוכן מרוקן את התור ומזריק כל תוצאות שהושלמו כהודעות. המודל קורא אותן בסיבוב הבא שלו."
walkthroughs:
  - title: "Background Runner ותור ההתראות"
    language: "python"
    code: |
      bg_queue: queue.Queue = queue.Queue()
      bg_counter = {"n": 0}

      def run_in_background(command: str, label: str = "") -> str:
          bg_counter["n"] += 1
          task_id = bg_counter["n"]
          label = label or f"bg-{task_id}"

          def worker():
              result = subprocess.run(
                  command, shell=True, capture_output=True,
                  text=True, timeout=300,
              )
              output = (result.stdout + result.stderr).strip()
              status = "done" if result.returncode == 0 else "failed"
              bg_queue.put({"task_id": task_id, "label": label,
                            "status": status, "output": output[:5000]})

          t = threading.Thread(target=worker, daemon=True)
          t.start()
          return f"Background task {task_id} ({label}) started."

      def drain_bg_queue(messages: list) -> list:
          results = []
          while not bg_queue.empty():
              completed = bg_queue.get_nowait()
              results.append({"type": "text", "text": (
                  f"<background_complete>\nTask {completed['task_id']} "
                  f"({completed['label']}): {completed['status']}\n"
                  f"{completed['output']}\n</background_complete>"
              )})
          if results:
              messages.append({"role": "user", "content": results})
          return messages
    steps:
      - lines: [1, 2]
        annotation: "bg_queue הוא Queue בטוח לthreads המשותף בין ה-thread הראשי וכל threads הפועלים. bg_counter משתמש ב-dict (לא int) כדי ש-closures של workers יוכלו להגדיל אותו בהפניה."
      - lines: [4, 7]
        annotation: "run_in_background() הוא הכלי שהמודל קורא לו. הוא מגדיל את הספירה, מקצה ID ותווית, ואז מחזיר מיד הודעת 'התחיל' — המודל לא ממתין לתוצאה."
      - lines: [9, 16]
        annotation: "ה-worker() closure לוכד task_id ו-label מהסקופ החיצוני. הוא מריץ את ה-subprocess, לוכד stdout+stderr, קובע הצלחה/כישלון מה-returncode, ודוחף את התוצאה לתוך bg_queue."
      - lines: [18, 20]
        annotation: "daemon=True פירושו שה-thread הזה מת אוטומטית כשהתוכנית הראשית יוצאת. אין צורך בקוד ניקוי. t.start() מפעיל אותו מיד — ה-thread הראשי כבר חופשי לעשות עבודה אחרת."
      - lines: [22, 32]
        annotation: "drain_bg_queue() נקראת לפני כל קריאת LLM. היא מרוקנת את התור ומזריקה תוצאות שהושלמו כהודעת משתמש. המודל רואה אותן בסיבוב הבא שלו ויכול להגיב — כל זה ללא polling או המתנה."
challenge:
  text: "התחילו משימת רקע ארוכה (כמו `sleep 30 && echo done`) והמשיכו לשוחח עם הסוכן בזמן שהיא רצה."
  hint: "ההתראה תוזרק ל-tool_result הבא אוטומטית"
---

## הבעיה

חלק מהפקודות לוקחות דקות: `npm install`, `pytest`, `docker build`. עם לולאה חוסמת, המודל יושב בלא פעולה ומחכה. אם המשתמש מבקש "התקן תלויות ובינתיים צור את קובץ התצורה," הסוכן עושה אותם עוקבת, לא במקביל.

## הפתרון

```
Main thread                Background thread
+-----------------+        +-----------------+
| agent loop      |        | subprocess runs |
| ...             |        | ...             |
| [LLM call] <---+------- | enqueue(result) |
|  ^drain queue   |        +-----------------+
+-----------------+

Timeline:
Agent --[spawn A]--[spawn B]--[other work]--[drain]--
             |          |                       ^
             v          v                       |
          [A runs]   [B runs]      (parallel)   |
             |          |                       |
             +----------+----- results injected-+
```

## איך זה עובד

1. תור משותף אוסף תוצאות משימות רקע שהושלמו.

```python
import threading
import subprocess
import queue

bg_queue: queue.Queue = queue.Queue()
bg_counter = {"n": 0}

def run_in_background(command: str, label: str = "") -> str:
    bg_counter["n"] += 1
    task_id = bg_counter["n"]
    label = label or f"bg-{task_id}"

    def worker():
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True,
                text=True, timeout=300,
            )
            output = (result.stdout + result.stderr).strip()
            status = "done" if result.returncode == 0 else "failed"
        except subprocess.TimeoutExpired:
            output = "Timeout after 300s"
            status = "failed"
        bg_queue.put({
            "task_id": task_id,
            "label": label,
            "status": status,
            "output": output[:5000],
        })

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return f"Background task {task_id} ({label}) started. You'll be notified when done."
```

2. לפני כל קריאת LLM, רוקנו את התור והזריקו תוצאות שהושלמו.

```python
def drain_bg_queue(messages: list) -> list:
    results = []
    while not bg_queue.empty():
        completed = bg_queue.get_nowait()
        results.append({
            "type": "text",
            "text": (
                f"<background_complete>\n"
                f"Task {completed['task_id']} ({completed['label']}): "
                f"{completed['status']}\n"
                f"{completed['output']}\n"
                f"</background_complete>"
            ),
        })
    if results:
        messages.append({"role": "user", "content": results})
    return messages
```

3. הלולאה הראשית קוראת ל-`drain_bg_queue` לפני כל קריאת LLM.

```python
def agent_loop(messages: list):
    while True:
        messages = drain_bg_queue(messages)  # inject any completions
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

## מה השתנה מ-[מערכת משימות](/he/s07-task-system)

| רכיב | לפני (מערכת משימות) | אחרי (משימות רקע) |
|------|-----------|-----------|
| ביצוע | עוקב בלבד | משימות רקע מקביליות |
| המתנה | חוסם את לולאת הסוכן | הסוכן ממשיך בזמן שהרקע רץ |
| הודעה | N/A | ריקון תור לפני כל קריאת LLM |
| כלי | אין | `run_in_background(command, label)` |

## מסקנה מרכזית

משימות רקע הן תבנית מקביליות לרתמת הסוכן. המודל לא צריך להבין threads — הוא פשוט קורא ל-`run_in_background` ומקבל התראה כשהמשימה מסתיימת. ריקון התור הוא המפתח: זו נקודת הזרקה יחידה שמזינה השלמות חזרה לשיחה בדיוק ברגע הנכון.
