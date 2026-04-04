---
title: "ניראות ודיבאג"
session: "s15"
phase: 5
motto: "כשהסוכן יורד מהפסים בשעה 2 בלילה, הלוגים הם העד היחיד שלך"
order: 15
readingTime: 25
prerequisites:
  - "s01-the-agent-loop"
  - "s06-context-compact"
  - "s13-agent-evals"
whatYouBuild: "מערכת לוגים מובנית ומעקב שמתעדת כל קריאת LLM, הרצת כלי ונקודת החלטה — עם יכולת הפעלה מחדש (replay) לצורך דיבאג."
beginnerConcepts:
  - question: "מה זה לוגים מובנים (structured logging)?"
    answer: "במקום להדפיס טקסט פשוט כמו 'tool called', מתעדים אובייקטי JSON עם שדות: חותמת זמן, סוג אירוע, שם כלי, קלט, פלט, משך זמן, ספירת token. זה הופך את הלוגים לניתנים לחיפוש ולניתוח."
  - question: "מה זה trace?"
    answer: "trace עוקב אחר משימה אחת של סוכן מתחילתה ועד סופה — כל קריאת LLM, הרצת כלי והחלטה. חשבו על זה כמו קופסה שחורה במטוס. כשמשהו משתבש, מפעילים מחדש את ה-trace כדי לראות בדיוק מה קרה."
  - question: "מה זה דיבאג בהפעלה מחדש (replay debugging)?"
    answer: "הקלטת כל תשובות ה-LLM כדי שניתן יהיה להריץ מחדש את הסוכן בלי לבצע קריאות API אמיתיות. זה מאפשר לשחזר באגים באופן דטרמיניסטי ולבדוק תיקונים בזול — אפס token מבוזבזים בהפעלה מחדש."
walkthroughs:
  - title: "מערכת מעקב לסוכן"
    language: "python"
    code: |
      @dataclass
      class TraceEvent:
          timestamp: str
          event_type: str  # "llm_call", "tool_exec", "error", "compact"
          data: dict
          duration_ms: int = 0
          tokens: int = 0

      class AgentTracer:
          def __init__(self, task_id: str):
              self.task_id = task_id
              self.events: list[TraceEvent] = []
              self.trace_file = Path(f".traces/{task_id}.jsonl")
              self.trace_file.parent.mkdir(exist_ok=True)

          def record(self, event_type: str, data: dict,
                     duration_ms: int = 0, tokens: int = 0):
              event = TraceEvent(
                  timestamp=datetime.utcnow().isoformat(),
                  event_type=event_type, data=data,
                  duration_ms=duration_ms, tokens=tokens,
              )
              self.events.append(event)
              with open(self.trace_file, "a") as f:
                  f.write(json.dumps(asdict(event)) + "\n")

          def replay(self) -> list[TraceEvent]:
              lines = self.trace_file.read_text().strip().split("\n")
              return [TraceEvent(**json.loads(l)) for l in lines]
    steps:
      - lines: [1, 7]
        annotation: "`TraceEvent` מייצג דבר אחד שקרה. ה-`event_type` מסווג אותו (קריאת LLM, הרצת כלי, שגיאה, דחיסה). `duration_ms` ו-`tokens` מאפשרים ניתוח ביצועים — אילו כלים איטיים? אילו קריאות יקרות?"
      - lines: [9, 14]
        annotation: "`AgentTracer` מאותחל לכל משימה. מעקבים נשמרים כקובצי JSONL ב-`.traces/` — שורה אחת לכל אירוע. JSONL ידידותי להוספה ול-grep, מושלם לדיבאג."
      - lines: [16, 24]
        annotation: "`record()` נקרא בכל נקודת החלטה בלולאת הסוכן. הוא גם שומר אירועים בזיכרון (לניתוח חי) וגם מוסיף לדיסק (לדיבאג לאחר קריסה). הכתיבה הכפולה מבטיחה שמעקבים שורדים קריסות."
      - lines: [26, 28]
        annotation: "`replay()` קורא בחזרה את כל האירועים מהדיסק. זהו הבסיס לדיבאג בהפעלה מחדש — הזנת תשובות LLM מוקלטות בחזרה ללולאת הסוכן במקום ביצוע קריאות API אמיתיות."
challenges:
  - tier: "warmup"
    text: "הוסיפו קריאות `tracer.record()` ללולאת הסוכן מ-s01. הריצו משימה ובדקו את קובץ ה-JSONL ב-`.traces/`. אילו דפוסים אתם מזהים?"
    hint: "תעדו אירועים ב: לפני קריאת LLM, אחרי תשובת LLM, לפני הרצת כלי, אחרי הרצת כלי."
  - tier: "build"
    text: "בנו פונקציית `trace_summary()` שקוראת קובץ trace ומדפיסה: סך הסיבובים, סך ה-token, משך כולל, הכלי הנפוץ ביותר, וכל שגיאה."
    hint: "קבצו אירועים לפי event_type באמצעות collections.Counter"
  - tier: "stretch"
    text: "ממשו דיבאג מלא בהפעלה מחדש: הקליטו תשובות LLM בזמן הרצה חיה, ואז צרו MockClient שמגיש תשובות מוקלטות. וודאו שהסוכן מייצר קריאות כלים זהות."
    hint: "החליפו את `client.messages.create` בפונקציה ששולפת מרשימת תשובות מוקלטות."
---

## הבעיה

יש לכם סשן סוכן של 30 סיבובים. הוא קרא ל-15 כלים, דחס את ההקשר פעמיים ([דחיסת הקשר](/he/s06-context-compact)), ובסופו של דבר הפיק פלט שגוי. איפה הוא טעה? סיבוב 7? סיבוב 22? האם זו הייתה תוצאת כלי שגויה או החלטת LLM שגויה?

הדפסות (print) לא מתרחבות כאן. שורת `print("calling tool")` לא אומרת לכם כלום על *איזה* כלי, *מה* הקלט שהוא קיבל, *כמה זמן* זה לקח, או *מה* ה-LLM חשב כשבחר את הכלי הזה. הכפילו את זה על פני צוות סוכנים אוטונומי ([סוכנים אוטונומיים](/he/s11-autonomous-agents)) ואתם טסים בעיוורון.

הסשן [הערכות סוכנים](/he/s13-agent-evals) לימד אתכם למדוד האם סוכנים מצליחים. הסשן הזה מלמד אתכם להבין *למה* הם נכשלים.

## הפתרון

מעקב מובנה: עטיפת כל נקודת החלטה בלולאת הסוכן עם מתעד שלוכד אירועים מתויגי זמן ומסווגים. אחסון כ-JSONL — אובייקט JSON אחד לשורה, הוספה בלבד, ידידותי ל-grep. כל קריאת LLM, הרצת כלי, שגיאה ודחיסת הקשר הופכים לאירוע שניתן לחיפוש.

שלוש יכולות נובעות מכך:

1. **ניתוח לאחר קריסה** — קראו את קובץ ה-trace אחרי כשל וראו בדיוק מה קרה, לפי סדר.
2. **פרופיל ביצועים** — אילו כלים איטיים? אילו קריאות LLM שורפות הכי הרבה token?
3. **דיבאג בהפעלה מחדש** — הריצו מחדש את הסוכן עם תשובות LLM מוקלטות, ללא צורך בקריאות API.

## מערכת המעקב

הליבה מורכבת משני חלקים: dataclass של `TraceEvent` ו-`AgentTracer` שכותב אירועים לדיסק.

```python
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

@dataclass
class TraceEvent:
    timestamp: str
    event_type: str  # "llm_call", "tool_exec", "error", "compact"
    data: dict
    duration_ms: int = 0
    tokens: int = 0

class AgentTracer:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.events: list[TraceEvent] = []
        self.trace_file = Path(f".traces/{task_id}.jsonl")
        self.trace_file.parent.mkdir(exist_ok=True)

    def record(self, event_type: str, data: dict,
               duration_ms: int = 0, tokens: int = 0):
        event = TraceEvent(
            timestamp=datetime.utcnow().isoformat(),
            event_type=event_type, data=data,
            duration_ms=duration_ms, tokens=tokens,
        )
        self.events.append(event)
        with open(self.trace_file, "a") as f:
            f.write(json.dumps(asdict(event)) + "\n")

    def replay(self) -> list[TraceEvent]:
        """Read all events back from disk."""
        lines = self.trace_file.read_text().strip().split("\n")
        return [TraceEvent(**json.loads(line)) for line in lines]
```

לכל אירוע יש סוג, חותמת זמן, מטען נתונים, ושדות ביצועים אופציונליים. פורמט JSONL מאפשר לכם להריץ `grep "error" .traces/task_42.jsonl` ולמצוא כשלים מיד.

## שילוב עם לולאת הסוכן

הנה לולאת הסוכן מ[לולאת הסוכן](/he/s01-the-agent-loop), כעת עם מכשור מעקב בכל נקודת החלטה.

```python
import time

def agent_loop(prompt: str, tools: list, task_id: str) -> str:
    tracer = AgentTracer(task_id)
    messages = [{"role": "user", "content": prompt}]

    while True:
        # Record the LLM call
        t0 = time.time()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            tools=tools,
            messages=messages,
        )
        duration = int((time.time() - t0) * 1000)
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        tracer.record("llm_call", {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "stop_reason": response.stop_reason,
        }, duration_ms=duration, tokens=tokens_used)

        # Check for end_turn
        if response.stop_reason == "end_turn":
            final = next(b.text for b in response.content if hasattr(b, "text"))
            tracer.record("end_turn", {"response_length": len(final)})
            return final

        # Process tool calls
        for block in response.content:
            if block.type == "tool_use":
                t0 = time.time()
                try:
                    result = execute_tool(block.name, block.input)
                    tool_duration = int((time.time() - t0) * 1000)
                    tracer.record("tool_exec", {
                        "tool": block.name,
                        "input": block.input,
                        "output_preview": str(result)[:200],
                    }, duration_ms=tool_duration)
                except Exception as e:
                    tracer.record("error", {
                        "tool": block.name,
                        "input": block.input,
                        "error": str(e),
                    })
                    result = f"Error: {e}"

                messages.append({"role": "assistant", "content": response.content})
                messages.append({
                    "role": "user",
                    "content": [{"type": "tool_result",
                                 "tool_use_id": block.id,
                                 "content": str(result)}],
                })
```

ארבע נקודות מעקב: לפני/אחרי קריאות LLM, אחרי הרצות כלים, ובשגיאות. שדה ה-`output_preview` חותך את פלט הכלי ל-200 תווים — מספיק לדיבאג, לא מספיק כדי לנפח את קובץ ה-trace.

## ניתוח מעקב

קובצי JSONL גולמיים שימושיים ל-grep, אבל ניתוח מובנה חושף דפוסים לאורך הרצה שלמה.

```python
from collections import Counter

def trace_summary(task_id: str) -> dict:
    tracer = AgentTracer(task_id)
    events = tracer.replay()

    summary = {
        "total_events": len(events),
        "total_tokens": sum(e.tokens for e in events),
        "total_duration_ms": sum(e.duration_ms for e in events),
        "turns": sum(1 for e in events if e.event_type == "llm_call"),
        "errors": [e.data for e in events if e.event_type == "error"],
    }

    # Tool usage stats
    tool_events = [e for e in events if e.event_type == "tool_exec"]
    tool_names = [e.data["tool"] for e in tool_events]
    summary["tool_counts"] = dict(Counter(tool_names))
    summary["slowest_tool_calls"] = sorted(
        [{"tool": e.data["tool"], "duration_ms": e.duration_ms} for e in tool_events],
        key=lambda x: x["duration_ms"], reverse=True,
    )[:5]

    return summary

def print_trace_summary(task_id: str):
    s = trace_summary(task_id)
    print(f"Turns: {s['turns']}  |  Tokens: {s['total_tokens']}  |  Duration: {s['total_duration_ms']}ms")
    print(f"Tools used: {s['tool_counts']}")
    if s["errors"]:
        print(f"ERRORS ({len(s['errors'])}):")
        for err in s["errors"]:
            print(f"  - {err['tool']}: {err['error']}")
    print("Slowest calls:")
    for call in s["slowest_tool_calls"]:
        print(f"  {call['tool']}: {call['duration_ms']}ms")
```

זה עונה מיד על שאלות דיבאג: האם הסוכן שרף token על לולאה? האם כלי נכשל באופן עקבי? האם קריאת כלי אחת הייתה אחראית לרוב ההשהיה?

## דיבאג בהפעלה מחדש

היכולת החזקה ביותר: הקלטת תשובות LLM בזמן הרצה חיה, ואז הפעלתן מחדש ללא בזבוז token.

```python
class RecordingClient:
    """Wraps the real client and records every response."""
    def __init__(self, real_client, tracer: AgentTracer):
        self.real_client = real_client
        self.tracer = tracer

    def create(self, **kwargs):
        response = self.real_client.messages.create(**kwargs)
        # Store the full response for replay
        self.tracer.record("llm_response", {
            "content": [block_to_dict(b) for b in response.content],
            "stop_reason": response.stop_reason,
            "usage": {"input": response.usage.input_tokens,
                      "output": response.usage.output_tokens},
        })
        return response


class ReplayClient:
    """Serves recorded responses instead of calling the API."""
    def __init__(self, task_id: str):
        tracer = AgentTracer(task_id)
        events = tracer.replay()
        self.responses = [
            e.data for e in events if e.event_type == "llm_response"
        ]
        self.index = 0

    def create(self, **kwargs):
        if self.index >= len(self.responses):
            raise RuntimeError("Replay exhausted — agent took a different path")
        data = self.responses[self.index]
        self.index += 1
        return MockResponse(data)
```

תהליך העבודה: הריצו פעם אחת עם `RecordingClient` כדי ללכוד את ה-trace. כשבאג צץ, החליפו ל-`ReplayClient` והריצו מחדש. הסוכן מקבל תשובות LLM זהות, אז הוא מבצע קריאות כלים זהות. עכשיו אפשר להוסיף הדפסות, לעבור שלב-שלב עם debugger, או לבדוק תיקון — הכל בלי לבזבז token אחד.

אם הסוכן סוטה במהלך ההפעלה מחדש (קריאת כלי שונה מהצפוי), ההפעלה מחדש מעלה שגיאה. הסטייה עצמה היא סימן: היא אומרת שהתיקון שלכם שינה את התנהגות הסוכן בדיוק בנקודה הזו.

## מה השתנה מ[מגנונים](/he/s14-guardrails)

| רכיב             | לפני (מגנונים)                | אחרי (ניראות)                              |
|-------------------|-------------------------------|---------------------------------------------|
| טיפול בשגיאות     | חסימת פעולות מסוכנות           | תיעוד כל פעולה לצורך ניתוח                   |
| מצב כשל           | מניעת תוצאות גרועות           | אבחון למה תוצאות גרועות קרו                  |
| לוגים             | הדפסות אד-הוק                | JSONL מובנה עם אירועים מסווגים               |
| דיבאג             | הרצה מחדש ותקווה לשחזור       | הפעלה מחדש של תשובות LLM מדויקות באופן דטרמיניסטי |
| ביצועים           | לא נמדדים                    | משך זמן וספירת token לכל אירוע               |
| היקף              | ולידציה של סיבוב בודד         | trace מלא על פני כל הסיבובים                 |

## מסקנה מרכזית

סוכן ללא ניראות הוא קופסה שחורה. מעקב מובנה הופך אותו לקופסה שקופה — כל קריאת LLM, הרצת כלי ושגיאה מתועדת עם חותמות זמן ונתוני ביצועים. דיבאג בהפעלה מחדש מבטל את החלק המתסכל ביותר בפיתוח סוכנים: כשלים שלא ניתן לשחזר. הקליטו פעם אחת, הפעילו מחדש לנצח, תקנו בביטחון. זהו הבסיס להרצת סוכנים בסביבת ייצור, שם הכשל של השעה 2 בלילה צריך להיות מאובחן בשעה 9 בבוקר מקובץ trace בלבד.
