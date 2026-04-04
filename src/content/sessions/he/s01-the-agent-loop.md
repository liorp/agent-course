---
title: "לולאת הסוכן"
session: "s01"
phase: 1
motto: "לולאה אחת ו-Bash זה כל מה שצריך"
order: 1
readingTime: 15
beginnerConcepts:
  - question: "מה זה API?"
    answer: "API (ממשק תכנות יישומים) הוא דרך לתוכנות לדבר זו עם זו. כשאנחנו קוראים ל-API של Claude, אנחנו שולחים טקסט ומקבלים תשובה — כמו לשלוח הודעה לחבר מאוד חכם."
  - question: "מה זה 'while True'?"
    answer: "זו לולאה שרצה לנצח עד שמשהו אומר לה לעצור. בסוכן שלנו, היא ממשיכה לרוץ עד שהמודל מחליט שהוא סיים (stop_reason שונה מ-'tool_use')."
  - question: "מה זה קריאת כלי (tool call)?"
    answer: "כשמודל הבינה המלאכותית רוצה לעשות משהו בעולם האמיתי (להריץ פקודה, לקרוא קובץ), הוא שולח בחזרה הודעת 'tool_use' מיוחדת במקום טקסט רגיל. הקוד שלנו מבצע את הפעולה ושולח את התוצאה בחזרה."
walkthroughs:
  - title: "לולאת הסוכן המרכזית"
    language: "python"
    code: |
      def agent_loop(messages):
          while True:
              response = client.messages.create(
                  model=MODEL, system=SYSTEM,
                  messages=messages, tools=TOOLS,
                  max_tokens=8000,
              )
              messages.append({"role": "assistant",
                               "content": response.content})

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
    steps:
      - lines: [2, 2]
        annotation: "הלולאה האינסופית. היא ממשיכה לרוץ עד שהמודל מחליט לעצור. זהו פעימת הלב של כל סוכן."
      - lines: [3, 7]
        annotation: "שליחת כל היסטוריית השיחה + הגדרות הכלים ל-LLM. המודל רואה את כל מה שקרה עד כה."
      - lines: [8, 9]
        annotation: "הוספת תשובת המודל להיסטוריית השיחה כדי שיזכור מה אמר."
      - lines: [11, 12]
        annotation: "תנאי היציאה. אם המודל לא ביקש להשתמש בכלי, הוא סיים לחשוב — חזרה למשתמש."
      - lines: [14, 22]
        annotation: "ביצוע כל קריאת כלי שהמודל ביקש. איסוף התוצאות להודעות `tool_result`."
      - lines: [23, 23]
        annotation: "הזנת תוצאות הכלי בחזרה כהודעת `'user'`. המודל יראה את התוצאות באיטרציה הבאה ויחליט מה לעשות."
diagram:
  title: "זרימת לולאת הסוכן"
  nodes:
    - { id: "user", label: "User Prompt", x: 100, y: 60, type: "data" }
    - { id: "llm", label: "LLM API", x: 300, y: 60, type: "agent" }
    - { id: "check", label: "Tool Use?", x: 300, y: 175, type: "decision" }
    - { id: "exec", label: "Execute Tool", x: 500, y: 175, type: "tool" }
    - { id: "result", label: "Return to User", x: 100, y: 175, type: "data" }
  edges:
    - { from: "user", to: "llm", label: "messages", animated: true }
    - { from: "llm", to: "check", label: "response" }
    - { from: "check", to: "exec", label: "yes" }
    - { from: "exec", to: "llm", label: "tool_result", animated: true }
    - { from: "check", to: "result", label: "no" }
  steps:
    - title: "1. שליחה ל-LLM"
      description: "הפרומפט של המשתמש נשלח ל-LLM יחד עם כל היסטוריית השיחה והגדרות הכלים."
      activeNodes: ["user", "llm"]
      activeEdges: [0]
    - title: "2. בדיקת סיבת עצירה"
      description: "הרתמה בודקת אם המודל רוצה להשתמש בכלי. אם stop_reason הוא 'tool_use', ממשיכים. אחרת, סיימנו."
      activeNodes: ["llm", "check"]
      activeEdges: [1]
    - title: "3. הרצת כלי"
      description: "הרתמה מריצה את הכלי המבוקש (למשל, פקודת bash) ואוספת את הפלט."
      activeNodes: ["check", "exec"]
      activeEdges: [2]
    - title: "4. הזנת תוצאות בחזרה"
      description: "תוצאות הכלי מצורפות כהודעת user ונשלחות בחזרה ל-LLM. הלולאה ממשיכה."
      activeNodes: ["exec", "llm"]
      activeEdges: [3]
    - title: "5. החזרה למשתמש"
      description: "כשלמודל אין יותר קריאות כלים, תשובת הטקסט הסופית מוחזרת למשתמש."
      activeNodes: ["check", "result"]
      activeEdges: [4]
challenge:
  text: "שכפלו את הריפו, הריצו `python agents/s01_agent_loop.py`, ובקשו ממנו ליצור קובץ. עקבו אחר קריאות הכלים בטרמינל."
  hint: "הגדירו `MODEL_ID=claude-sonnet-4-20250514` בקובץ `.env` שלכם"
---

## הבעיה

איך מודל שפה עובר מייצור טקסט ל**עשייה** בעולם האמיתי?

המודל יכול לחשוב, לתכנן ולייצר קוד — אבל אין לו ידיים. הוא לא יכול להריץ פקודה, לקרוא קובץ או לבדוק תוצאה. הוא מוח בצנצנת.

## הפתרון

לולאה אחת. כלי אחד. זו כל הארכיטקטורה.

```
while True:
  response = LLM(messages, tools)
  if stop_reason != "tool_use": return
  execute tools
  append results
  loop back
```

המודל מחליט מתי לקרוא לכלים ומתי לעצור. הקוד רק מבצע את מה שהמודל מבקש.

## הלולאה המרכזית

```python
def agent_loop(messages):
    while True:
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

ארבעה שלבים, חוזרים על עצמם:
1. **הוסף** את ההנחיה של המשתמש להיסטוריית ההודעות
2. **שלח** הודעות + הגדרות כלים ל-LLM
3. **בדוק** `stop_reason` — אם זה לא `tool_use`, המודל סיים
4. **בצע** כל קריאת כלי, הוסף את התוצאות, חזור ללולאה

## כלי ה-Bash

```python
TOOLS = [{
    "name": "bash",
    "description": "Run a shell command.",
    "input_schema": {
        "type": "object",
        "properties": {"command": {"type": "string"}},
        "required": ["command"],
    },
}]

def run_bash(command: str) -> str:
    dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]
    if any(d in command for d in dangerous):
        return "Error: Dangerous command blocked"
    r = subprocess.run(command, shell=True, cwd=os.getcwd(),
                       capture_output=True, text=True, timeout=120)
    out = (r.stdout + r.stderr).strip()
    return out[:50000] if out else "(no output)"
```

הגדרת כלי אחת. handler אחד. כעת יש למודל ידיים — הוא יכול להריץ כל פקודת shell ולקרוא את הפלט.

## המימוש המלא

```python
#!/usr/bin/env python3
"""s01_agent_loop.py - The Agent Loop"""

import os, subprocess
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv(override=True)
client = Anthropic()
MODEL = os.environ["MODEL_ID"]
SYSTEM = f"You are a coding agent at {os.getcwd()}. Use bash to solve tasks."

TOOLS = [{
    "name": "bash",
    "description": "Run a shell command.",
    "input_schema": {
        "type": "object",
        "properties": {"command": {"type": "string"}},
        "required": ["command"],
    },
}]

def run_bash(command: str) -> str:
    dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]
    if any(d in command for d in dangerous):
        return "Error: Dangerous command blocked"
    try:
        r = subprocess.run(command, shell=True, cwd=os.getcwd(),
                           capture_output=True, text=True, timeout=120)
        out = (r.stdout + r.stderr).strip()
        return out[:50000] if out else "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: Timeout (120s)"

def agent_loop(messages: list):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return
        results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"\033[33m$ {block.input['command']}\033[0m")
                output = run_bash(block.input["command"])
                print(output[:200])
                results.append({"type": "tool_result",
                                "tool_use_id": block.id,
                                "content": output})
        messages.append({"role": "user", "content": results})

if __name__ == "__main__":
    history = []
    while True:
        try:
            query = input("\033[36ms01 >> \033[0m")
        except (EOFError, KeyboardInterrupt):
            break
        if query.strip().lower() in ("q", "exit", ""):
            break
        history.append({"role": "user", "content": query})
        agent_loop(history)
```

## מסקנה מרכזית

הסוד השלם של סוכן קוד מבוסס AI הוא הלולאה הזו. המודל הוא הבינה — הוא מחליט מה לעשות. הקוד הוא הרתמה — הוא נותן למודל כלי ומזין חזרה תוצאות. בסשן הבא ([שימוש בכלים](/he/s02-tool-use)), נוסיף עוד כלים מבלי לשנות את הלולאה כלל.
