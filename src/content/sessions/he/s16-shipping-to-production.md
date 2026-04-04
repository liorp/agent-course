---
title: "שילוח לפרודקשן"
session: "s16"
phase: 5
motto: "סוכן דמו זה קל; סוכן אמין זו הנדסה"
order: 16
readingTime: 30
prerequisites:
  - "s01-the-agent-loop"
  - "s13-agent-evals"
  - "s14-guardrails"
  - "s15-observability"
whatYouBuild: "פריסת סוכן מוכנה לפרודקשן עם streaming, לוגיקת retry, מעקב עלויות, ניתוב מודלים, וניטור בריאות."
beginnerConcepts:
  - question: "מה זה streaming?"
    answer: "במקום לחכות לתשובת ה-LLM השלמה בבת אחת, streaming מעביר טוקנים בזמן שהם נוצרים — כמו לצפות במישהו מקליד. זה גורם לסוכן להרגיש רספונסיבי גם בהפקות ארוכות."
  - question: "מה זה model routing?"
    answer: "שימוש במודלים שונים למשימות שונות. מודלים מהירים וזולים (Haiku) להחלטות פשוטות. מודלים חזקים ויקרים (Opus) לחשיבה מורכבת. זה חותך עלויות 60-80% בלי לפגוע באיכות."
  - question: "מה זה exponential backoff?"
    answer: "אסטרטגיית retry שבה ממתינים יותר זמן בין כל ניסיון: 1 שנייה, 2 שניות, 4 שניות, 8 שניות. זה מונע הפצצה של API כושל ונותן לו זמן להתאושש."
walkthroughs:
  - title: "סוכן פרודקשן עם Streaming ו-Retries"
    language: "python"
    code: |
      def agent_loop_production(messages: list, tracer: AgentTracer):
          while True:
              response = call_with_retry(messages)
              tracer.record("llm_call", {
                  "tokens": response.usage.input_tokens + response.usage.output_tokens,
                  "model": response.model,
              })
              messages.append({"role": "assistant", "content": response.content})
              if response.stop_reason != "tool_use":
                  return

              for block in response.content:
                  if block.type == "tool_use":
                      verdict = guardrail.check(block.name, block.input)
                      if verdict == "DENIED":
                          result = "Error: Tool call denied by guardrail"
                      elif verdict == "COST_CAP_EXCEEDED":
                          result = "Error: Cost cap exceeded"
                      elif verdict == "NEEDS_APPROVAL":
                          result = human_approve(block)
                      else:
                          result = execute_tool(block)
                      tracer.record("tool_exec", {"tool": block.name})
                      messages.append(tool_result(block.id, result))

      def call_with_retry(messages, max_retries=4):
          for attempt in range(max_retries):
              try:
                  return client.messages.create(
                      model=select_model(messages),
                      messages=messages, tools=TOOLS, max_tokens=8000,
                  )
              except anthropic.RateLimitError:
                  wait = 2 ** attempt
                  time.sleep(wait)
          raise RuntimeError("API unavailable after retries")

      def select_model(messages) -> str:
          token_count = count_tokens(messages)
          if token_count < 2000:
              return "claude-haiku-4-5-20251001"
          return "claude-sonnet-4-6-20250610"
    steps:
      - lines: [1, 10]
        annotation: "לולאת הפרודקשן משלבת הכל: ה-tracer מתעד כל קריאה, ה-guardrail בודק כל כלי, retries מטפלים בכשלים. זו לולאת s01 אחרי שגדלה."
      - lines: [12, 24]
        annotation: "ביצוע כלים עובר עכשיו דרך ה-guardrail קודם. כל פסק דין ממפה לפעולה שונה: דחייה, תקרה, אישור אנושי, או ביצוע אוטומטי."
      - lines: [26, 35]
        annotation: "`call_with_retry()` ממש exponential backoff ל-rate limits. כל retry מחכה 2^attempt שניות. אחרי 4 כשלים, זורק — לא לנסות לנצח."
      - lines: [37, 41]
        annotation: "`select_model()` מנתב משימות זולות ל-Haiku ויקרות ל-Sonnet. ההיוריסטיקה הפשוטה הזו יכולה לחתוך עלויות 60-80%."
challenges:
  - tier: "warmup"
    text: "חשבו את הפרש העלויות: הרצת 100 משימות סוכן שכל אחת משתמשת ב-10k input + 2k output טוקנים. השוו הכל-Sonnet מול ניתוב 70% ל-Haiku."
    hint: "בדקו תמחור נוכחי ב-docs.anthropic.com. Haiku זול בערך פי 10-20 לטוקן."
  - tier: "build"
    text: "הוסיפו streaming ללולאת הסוכן: השתמשו ב-`client.messages.stream()` והדפיסו טוקנים כשהם מגיעים. הציגו spinner בזמן ביצוע כלים."
    hint: "השתמשו ב-`with client.messages.stream(...) as stream: for text in stream.text_stream: print(text, end='', flush=True)`"
  - tier: "stretch"
    text: "בנו דשבורד בריאות: endpoint HTTP פשוט שמדווח על סוכנים פעילים, סך טוקנים שנצרכו היום, שיעור שגיאות, וזמן תגובה ממוצע."
    hint: "השתמשו ב-`http.server` או Flask. קראו מתיקיית `.traces/` כדי לחשב מטריקות."
---

## הבעיה

בניתם סוכן. הוא עובד על הלפטופ שלכם. אתם עושים דמו וזה נראה מדהים. אז אתם שולחים אותו.

המשתמש הראשון פוגע ב-rate limit ומקבל stack trace. המשתמש השני ממתין 45 שניות בוהה במסך ריק. המשתמש השלישי מריץ לולאה ששורפת $200 בטוקנים לפני שמישהו שם לב. הפער בין "עובד על הלפטופ שלי" ל"אמין בפרודקשן" הוא עצום.

## הפתרון

שכבו דאגות פרודקשן על הרתמה הקיימת. אתם לא משכתבים את [לולאת הסוכן](/he/s01-the-agent-loop) — אתם עוטפים אותה עם התשתית שהיא צריכה כדי לשרוד תעבורה אמיתית:

```
Streaming      →  UX רספונסיבי, בלי מסכים ריקים
Retries        →  לשרוד rate limits וכשלים חולפים
ניתוב מודלים   →  לחתוך עלויות 60-80% בלי לאבד איכות
מעקב עלויות   →  לדעת מה מוציאים, לעצור לפני חריגה
ניטור בריאות   →  לראות בעיות לפני שמשתמשים מדווחים
```

## Streaming תשובות

```python
def stream_response(messages: list) -> anthropic.types.Message:
    with client.messages.stream(
        model="claude-sonnet-4-6-20250610",
        messages=messages,
        tools=TOOLS,
        max_tokens=8000,
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
        print()
    return stream.get_final_message()
```

## Retry עם Exponential Backoff

```python
def call_with_retry(messages: list, max_retries: int = 4):
    for attempt in range(max_retries):
        try:
            return client.messages.create(
                model=select_model(messages),
                messages=messages,
                tools=TOOLS,
                max_tokens=8000,
            )
        except anthropic.RateLimitError:
            wait = 2 ** attempt
            print(f"Rate limited. Retrying in {wait}s...")
            time.sleep(wait)
        except anthropic.APITimeoutError:
            if attempt == max_retries - 1:
                raise
            time.sleep(1)
    raise RuntimeError("API unavailable after retries")
```

דפוס exponential backoff — המתנה של 1s, 2s, 4s, 8s — נותן ל-API זמן להתאושש.

## ניתוב מודלים

```python
def select_model(messages: list) -> str:
    token_count = count_tokens(messages)
    if token_count < 2000:
        return "claude-haiku-4-5-20251001"
    return "claude-sonnet-4-6-20250610"
```

חישוב עלות קונקרטי: ל-100 משימות סוכן, כל אחת 10k input + 2k output:
- **הכל-Sonnet**: **$6.00**
- **70% Haiku + 30% Sonnet**: **$2.92**

חיסכון של 51% עם היוריסטיקת ניתוב נאיבית.

## מה השתנה מ[תצפית](/he/s15-observability)

| רכיב | תצפית (s15) | פרודקשן (s16) |
|------|-------------|---------------|
| מיקוד | לראות מה הסוכן עושה | להפוך את הסוכן לאמין |
| כשלים | לתעד שגיאות ל-post-mortem | לנסות מחדש שגיאות חולפות אוטומטית |
| לאטנסי | למדוד זמני תגובה | להפחית לאטנסי נתפס עם streaming |
| עלות | לעקוב אחר הוצאה ב-traces | לאכוף תקציבים, לנתב למודלים זולים |

## נקודה מרכזית

סוכן פרודקשן הוא לא סוכן שונה — הוא אותה [לולאה מ-s01](/he/s01-the-agent-loop) עטופה בהנדסה שהיא צריכה כדי לשרוד את העולם האמיתי. Streaming לרספונסיביות. Retries לעמידות. ניתוב מודלים לעלות. מעקב תקציב לבטיחות. ניטור בריאות לנראות. כל אחד שכבה קטנה ועצמאית. ביחד הם ההבדל בין דמו לשירות.
