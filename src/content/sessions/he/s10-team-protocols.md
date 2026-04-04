---
title: "פרוטוקולי צוות"
session: "s10"
phase: 4
motto: "חברי צוות צריכים כללי תקשורת משותפים"
order: 10
readingTime: 30
beginnerConcepts:
  - question: "מה זה פרוטוקול בתקשורת סוכנים?"
    answer: "לחיצת יד מובנית — צד אחד שולח בקשה עם מזהה ייחודי, השני מגיב תוך הפניה למזהה הזה. פרוטוקולים מונעים אי הבנות: 'האם סיימת משימה X?' / 'כן, הנה תוצאה X.' במקום הודעות חופשיות."
  - question: "מה זה פרוטוקול כיבוי (shutdown)?"
    answer: "לחיצת יד דו-שלבית שבה המוביל שולח shutdown_req (עם מזהה ייחודי), וחבר הצוות מאשר (מסיים עבודה נוכחית ויוצא) או דוחה (עדיין עסוק, נסה מאוחר יותר). זה מונע הריגת חבר צוות באמצע משימה ומותרת קבצים פגומים."
  - question: "מה זה אישור תוכנית?"
    answer: "לפני שחבר צוות מתחיל משימה בסיכון גבוה, הוא שולח את תוכניתו למוביל לביקורת. המוביל יכול לאשר (להמשיך) או לדחות (לשנות את התוכנית). זה יוצר נקודת בדיקה של אדם בלולאה לפעולות מסוכנות."
---

## הבעיה

בסשן צוותי הסוכנים, חברי הצוות עובדים ומתקשרים אבל חסר להם תיאום מובנה:

**כיבוי**: הריגת thread משאירה קבצים חצי-כתובים ו-config.json מיושן. צריך לחיצת יד: המוביל מבקש, חבר הצוות מאשר (מסיים ויוצא) או דוחה (ממשיך לעבוד).

**אישור תוכנית**: כשהמוביל אומר "ערוך את מודול האימות," חבר הצוות מתחיל מיד. לשינויים בסיכון גבוה, המוביל צריך לבדוק את התוכנית קודם.

שניהם חולקים את אותו המבנה: צד אחד שולח בקשה עם מזהה ייחודי, השני מגיב תוך הפניה למזהה הזה.

## הפתרון

```
Shutdown Protocol            Plan Approval Protocol
==================           ======================

Lead             Teammate    Teammate           Lead
  |                 |           |                 |
  |--shutdown_req-->|           |--plan_req------>|
  | {req_id:"abc"}  |           | {req_id:"xyz"}  |
  |                 |           |                 |
  |<--shutdown_resp-|           |<--plan_resp-----|
  | {req_id:"abc",  |           | {req_id:"xyz",  |
  |  approved:true} |           |  approved:false,|
  |                 |           |  feedback:"..."}|
```

## איך זה עובד

1. מזהי בקשות הם UUIDs קצרים. הבקשה והתגובה נושאות את אותו המזהה.

```python
import uuid

def new_req_id() -> str:
    return uuid.uuid4().hex[:8]

def send_shutdown_request(teammate_name: str) -> str:
    req_id = new_req_id()
    send_message(teammate_name, "lead", json.dumps({
        "type": "shutdown_req",
        "req_id": req_id,
    }))
    return req_id  # caller stores this to match the response

def handle_shutdown_request(msg: dict, name: str) -> None:
    req_id = msg["req_id"]
    # Teammate decides: approve if idle, reject if mid-task
    currently_working = get_status(name) == "WORKING"
    send_message("lead", name, json.dumps({
        "type": "shutdown_resp",
        "req_id": req_id,
        "approved": not currently_working,
        "reason": "finishing current task" if currently_working else "ready to shutdown",
    }))
    if not currently_working:
        update_status(name, "SHUTDOWN")
```

2. אישור תוכנית משתמש באותה התבנית, מורחב עם תוכן תוכנית מובנה.

```python
def request_plan_approval(plan: str, task_id: int) -> str:
    req_id = new_req_id()
    send_message("lead", "self", json.dumps({
        "type": "plan_req",
        "req_id": req_id,
        "task_id": task_id,
        "plan": plan,
    }))
    return req_id

def handle_plan_request(msg: dict) -> dict:
    """Lead reviews and approves/rejects the plan."""
    # Lead's agent loop sees this in its inbox and decides
    req_id = msg["req_id"]
    teammate = msg.get("from")
    # The LLM reviews the plan and calls approve_plan or reject_plan tool
    return {"req_id": req_id, "teammate": teammate, "plan": msg["plan"]}
```

3. הלולאה של חבר הצוות בודקת סוגי הודעות לפני פעולה.

```python
def process_inbox(name: str) -> None:
    messages = drain_inbox(name)
    for msg_raw in messages:
        try:
            msg = json.loads(msg_raw["content"])
            msg_type = msg.get("type", "plain")
        except (json.JSONDecodeError, KeyError):
            msg_type = "plain"
            msg = msg_raw

        if msg_type == "shutdown_req":
            handle_shutdown_request(msg, name)
        elif msg_type == "plan_resp":
            handle_plan_response(msg, name)
        else:
            # Plain task assignment — start working
            start_task(msg_raw["content"], name)
```

## מה השתנה מ-צוותי סוכנים

| רכיב | לפני (צוותי סוכנים) | אחרי (פרוטוקולי צוות) |
|------|-----------|-----------|
| כיבוי | הרג thread | לחיצת יד req/resp מסודרת |
| סקירת תוכנית | אין | בקשת תוכנית + אישור מוביל |
| פורמט הודעות | טקסט חופשי | JSON מוקלד עם req_id |
| בטיחות | נמוכה | נקודות בדיקה מפורשות לסיכון |

## מסקנה מרכזית

פרוטוקולים הופכים תקשורת חופשית למשא ומתן מובנה. תבנית req_id היא המפתח — היא מאפשרת לך להתאים תגובה לבקשה שגרמה לה, גם כשהודעות מגיעות שלא בסדר או עם עיכובים. אותה תבנית דו-שלבית (שלח בקשה, המתן לתגובה עם מזהה תואם) עובדת עבור כל צורך תיאום.
