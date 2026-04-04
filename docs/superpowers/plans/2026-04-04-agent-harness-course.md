# Agent Harness Course Website — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (EN/HE) static Astro course website with 12 sessions on agent harness engineering, featuring a Deep Space theme, step-through code walkthroughs, beginner explainers, Google AdSense, and Google Analytics.

**Architecture:** Static Astro site using content collections for session markdown, React island for the CodeWalkthrough component, CSS custom properties for the Deep Space theme, URL-based i18n (`/en/*`, `/he/*`) with RTL support, and localStorage for progress tracking.

**Tech Stack:** Astro 4, React (via @astrojs/react), TypeScript, CSS custom properties, Shiki (built-in syntax highlighting), Google Fonts (Inter, Heebo, Fira Code)

---

## File Map

```
agent-course/
├── astro.config.mjs                         # Astro config: i18n, React, Shiki
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
├── src/
│   ├── content/
│   │   ├── config.ts                        # Content collection schema
│   │   └── sessions/
│   │       ├── en/                          # 12 English session .md files
│   │       └── he/                          # 12 Hebrew session .md files
│   ├── components/
│   │   ├── CodeWalkthrough.tsx              # React island (only hydrated component)
│   │   ├── BeginnerExplainer.astro
│   │   ├── ProgressTracker.astro
│   │   ├── LanguageSwitcher.astro
│   │   ├── AdSlot.astro
│   │   ├── SessionNav.astro
│   │   ├── SessionCard.astro
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   ├── Base.astro                       # <html> shell, GA, fonts, RTL
│   │   ├── Landing.astro
│   │   └── Session.astro
│   ├── pages/
│   │   ├── index.astro                      # Redirect → /en/
│   │   ├── en/
│   │   │   ├── index.astro
│   │   │   └── [session].astro
│   │   └── he/
│   │       ├── index.astro
│   │       └── [session].astro
│   ├── styles/
│   │   └── global.css
│   ├── i18n/
│   │   ├── ui.ts                            # Helper: getUI(locale)
│   │   ├── en.json
│   │   └── he.json
│   └── lib/
│       ├── progress.ts                      # localStorage helpers
│       └── sessions.ts                      # Session metadata + ordering
└── docs/superpowers/
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `public/favicon.svg`, `src/pages/index.astro`

- [ ] **Step 1: Initialize Astro project**

```bash
cd /Users/liorpollak/Web/agent-course
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/liorpollak/Web/agent-course
npm install
npm install @astrojs/react react react-dom
npm install -D @types/react @types/react-dom
```

- [ ] **Step 3: Configure Astro**

Replace `astro.config.mjs` with:

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'he'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  markdown: {
    shikiConfig: {
      theme: 'css-variables',
    },
  },
});
```

- [ ] **Step 4: Configure TypeScript**

Replace `tsconfig.json` with:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 5: Create root redirect page**

Create `src/pages/index.astro`:

```astro
---
return Astro.redirect('/en/');
---
```

- [ ] **Step 6: Create favicon**

Create `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#0f0f23"/>
  <text x="16" y="22" text-anchor="middle" font-size="18" font-family="monospace" fill="#ffcc00">&gt;_</text>
</svg>
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add package.json package-lock.json astro.config.mjs tsconfig.json public/ src/pages/index.astro src/env.d.ts
git commit -m "feat: scaffold Astro project with React, i18n, and Shiki config"
```

---

## Task 2: Deep Space Theme

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 1: Create global CSS with all design tokens**

Create `src/styles/global.css`:

```css
/* Deep Space Theme */
:root {
  /* Backgrounds */
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a3e;
  --bg-card: #161b35;
  --bg-code: #0a0a1e;

  /* Borders */
  --border: #333366;

  /* Text */
  --text-primary: #ffffff;
  --text-body: #c0c0e0;
  --text-muted: #a0a0cc;

  /* Accent */
  --accent: #ffcc00;
  --accent-hover: #ffe066;

  /* Code syntax (Shiki css-variables theme tokens) */
  --shiki-color-text: #c0c0e0;
  --shiki-color-background: #0a0a1e;
  --shiki-token-constant: #ff6b6b;
  --shiki-token-string: #98c379;
  --shiki-token-comment: #6a6a9a;
  --shiki-token-keyword: #ff6b6b;
  --shiki-token-parameter: #c0c0e0;
  --shiki-token-function: #ffd43b;
  --shiki-token-string-expression: #98c379;
  --shiki-token-punctuation: #c0c0e0;

  /* Explainer */
  --explainer-bg: #1a1a4a;
  --explainer-border: #4a4aff;

  /* Layout */
  --max-width: 900px;
  --sidebar-width: 300px;
  --header-height: 60px;

  /* Font families */
  --font-body: 'Inter', system-ui, sans-serif;
  --font-code: 'Fira Code', 'Courier New', monospace;
  --font-hebrew: 'Heebo', 'Inter', system-ui, sans-serif;
}

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  background-attachment: fixed;
  color: var(--text-body);
  line-height: 1.75;
  min-height: 100vh;
}

/* Hebrew font override */
html[lang="he"] body {
  font-family: var(--font-hebrew);
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  color: var(--text-primary);
  line-height: 1.3;
  margin-block-end: 0.5em;
}

h1 { font-size: 2.25rem; font-weight: 700; }
h2 { font-size: 1.75rem; font-weight: 700; }
h3 { font-size: 1.35rem; font-weight: 600; }
h4 { font-size: 1.1rem; font-weight: 600; }

p {
  margin-block-end: 1em;
}

a {
  color: var(--accent);
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: var(--accent-hover);
}

/* Code blocks (Shiki) */
pre {
  background: var(--bg-code) !important;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  font-family: var(--font-code);
  font-size: 0.875rem;
  line-height: 1.6;
  margin-block: 1.5em;
}

code {
  font-family: var(--font-code);
  font-size: 0.875em;
}

/* Inline code */
:not(pre) > code {
  background: var(--bg-code);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  border: 1px solid var(--border);
}

/* Lists */
ul, ol {
  padding-inline-start: 1.5em;
  margin-block-end: 1em;
}

li {
  margin-block-end: 0.35em;
}

/* Blockquotes */
blockquote {
  border-inline-start: 3px solid var(--accent);
  padding-inline-start: 1em;
  color: var(--text-muted);
  margin-block: 1em;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin-block: 1.5em;
}

th, td {
  border: 1px solid var(--border);
  padding: 0.5em 0.75em;
  text-align: start;
}

th {
  background: var(--bg-card);
  color: var(--text-primary);
  font-weight: 600;
}

/* Star-field hero background */
.star-field {
  position: relative;
  overflow: hidden;
}

.star-field::before,
.star-field::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 60% 20%, rgba(255,255,255,0.5) 0%, transparent 100%),
    radial-gradient(1px 1px at 80% 50%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 10% 80%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(1px 1px at 70% 90%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.4) 0%, transparent 100%);
  pointer-events: none;
}

.star-field::after {
  animation: twinkle 4s ease-in-out infinite alternate;
  opacity: 0.5;
}

@keyframes twinkle {
  0% { opacity: 0.3; }
  100% { opacity: 0.7; }
}

/* Utility */
.container {
  max-width: var(--max-width);
  margin-inline: auto;
  padding-inline: 1.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
}

/* Responsive */
@media (max-width: 640px) {
  h1 { font-size: 1.75rem; }
  h2 { font-size: 1.4rem; }
  h3 { font-size: 1.15rem; }

  pre {
    font-size: 0.8rem;
    padding: 0.75rem;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/styles/global.css
git commit -m "feat: add Deep Space theme with full design token system and RTL support"
```

---

## Task 3: i18n Setup

**Files:**
- Create: `src/i18n/en.json`, `src/i18n/he.json`, `src/i18n/ui.ts`

- [ ] **Step 1: Create English UI strings**

Create `src/i18n/en.json`:

```json
{
  "site.title": "Agent Harness Course",
  "site.description": "12 sessions from a simple loop to autonomous agent teams",
  "nav.sessions": "Sessions",
  "nav.about": "About",
  "session.markComplete": "Mark as complete",
  "session.completed": "Completed",
  "session.prev": "Previous",
  "session.next": "Next",
  "session.beginnerExplainer": "New to this?",
  "session.readingTime": "min read",
  "landing.hero.title": "Agent Harness Engineering",
  "landing.hero.subtitle": "12 sessions from a simple loop to autonomous agent teams",
  "landing.hero.thesis": "An agent is a model. Not a framework. Not a prompt chain. The model decides. The harness executes. Learn to build the harness.",
  "phase.1": "Phase 1: The Loop",
  "phase.2": "Phase 2: Planning & Knowledge",
  "phase.3": "Phase 3: Persistence",
  "phase.4": "Phase 4: Teams"
}
```

- [ ] **Step 2: Create Hebrew UI strings**

Create `src/i18n/he.json`:

```json
{
  "site.title": "קורס הנדסת רתמה לסוכנים",
  "site.description": "12 שיעורים מלולאה פשוטה ועד צוותי סוכנים אוטונומיים",
  "nav.sessions": "שיעורים",
  "nav.about": "אודות",
  "session.markComplete": "סמן כהושלם",
  "session.completed": "הושלם",
  "session.prev": "הקודם",
  "session.next": "הבא",
  "session.beginnerExplainer": "חדש בנושא?",
  "session.readingTime": "דקות קריאה",
  "landing.hero.title": "הנדסת רתמה לסוכנים",
  "landing.hero.subtitle": "12 שיעורים מלולאה פשוטה ועד צוותי סוכנים אוטונומיים",
  "landing.hero.thesis": "סוכן הוא מודל. לא פריימוורק. לא שרשרת פרומפטים. המודל מחליט. הרתמה מבצעת. למדו לבנות את הרתמה.",
  "phase.1": "שלב 1: הלולאה",
  "phase.2": "שלב 2: תכנון וידע",
  "phase.3": "שלב 3: התמדה",
  "phase.4": "שלב 4: צוותים"
}
```

- [ ] **Step 3: Create i18n helper**

Create `src/i18n/ui.ts`:

```typescript
import en from './en.json';
import he from './he.json';

const ui = { en, he } as const;

export type Locale = keyof typeof ui;
export type UIKey = keyof typeof en;

export function getUI(locale: Locale): Record<UIKey, string> {
  return ui[locale];
}

export function getLangFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/');
  if (lang === 'he') return 'he';
  return 'en';
}

export function getLocalizedPath(path: string, locale: Locale): string {
  // Replace /en/ or /he/ prefix with the target locale
  return path.replace(/^\/(en|he)\//, `/${locale}/`);
}
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/i18n/
git commit -m "feat: add i18n with English and Hebrew UI strings"
```

---

## Task 4: Session Metadata & Content Collection

**Files:**
- Create: `src/lib/sessions.ts`, `src/content/config.ts`, `src/content/sessions/en/s01-the-agent-loop.md`, `src/content/sessions/en/s02-tool-use.md`

- [ ] **Step 1: Create session metadata**

Create `src/lib/sessions.ts`:

```typescript
export interface SessionMeta {
  id: string;
  order: number;
  phase: 1 | 2 | 3 | 4;
  title: string;
  titleHe: string;
  motto: string;
  mottoHe: string;
  slug: string;
  readingTime: number;
}

export const SESSIONS: SessionMeta[] = [
  { id: 's01', order: 1, phase: 1, title: 'The Agent Loop', titleHe: 'לולאת הסוכן', motto: 'One loop & Bash is all you need', mottoHe: 'לולאה אחת ו-Bash זה כל מה שצריך', slug: 's01-the-agent-loop', readingTime: 15 },
  { id: 's02', order: 2, phase: 1, title: 'Tool Use', titleHe: 'שימוש בכלים', motto: 'Adding a tool means adding one handler', mottoHe: 'הוספת כלי פירושה הוספת handler אחד', slug: 's02-tool-use', readingTime: 15 },
  { id: 's03', order: 3, phase: 2, title: 'TodoWrite', titleHe: 'כתיבת משימות', motto: 'An agent without a plan drifts', mottoHe: 'סוכן בלי תוכנית נסחף', slug: 's03-todo-write', readingTime: 20 },
  { id: 's04', order: 4, phase: 2, title: 'Subagents', titleHe: 'תת-סוכנים', motto: 'Break big tasks down; each subtask gets a clean context', mottoHe: 'פרקו משימות גדולות; כל תת-משימה מקבלת הקשר נקי', slug: 's04-subagent', readingTime: 20 },
  { id: 's05', order: 5, phase: 2, title: 'Skills', titleHe: 'מיומנויות', motto: 'Load knowledge when you need it, not upfront', mottoHe: 'טענו ידע כשצריך, לא מראש', slug: 's05-skill-loading', readingTime: 15 },
  { id: 's06', order: 6, phase: 2, title: 'Context Compact', titleHe: 'דחיסת הקשר', motto: 'Context will fill up; you need a way to make room', mottoHe: 'ההקשר יתמלא; צריך דרך לפנות מקום', slug: 's06-context-compact', readingTime: 20 },
  { id: 's07', order: 7, phase: 3, title: 'Tasks', titleHe: 'מערכת משימות', motto: 'Break big goals into small tasks, order them, persist to disk', mottoHe: 'פרקו מטרות גדולות למשימות קטנות, סדרו אותן, שמרו לדיסק', slug: 's07-task-system', readingTime: 25 },
  { id: 's08', order: 8, phase: 3, title: 'Background Tasks', titleHe: 'משימות רקע', motto: 'Run slow operations in the background; the agent keeps thinking', mottoHe: 'הריצו פעולות איטיות ברקע; הסוכן ממשיך לחשוב', slug: 's08-background-tasks', readingTime: 20 },
  { id: 's09', order: 9, phase: 4, title: 'Agent Teams', titleHe: 'צוותי סוכנים', motto: 'When the task is too big for one, delegate to teammates', mottoHe: 'כשהמשימה גדולה מדי לאחד, האצילו לחברי צוות', slug: 's09-agent-teams', readingTime: 25 },
  { id: 's10', order: 10, phase: 4, title: 'Team Protocols', titleHe: 'פרוטוקולי צוות', motto: 'Teammates need shared communication rules', mottoHe: 'חברי צוות צריכים כללי תקשורת משותפים', slug: 's10-team-protocols', readingTime: 30 },
  { id: 's11', order: 11, phase: 4, title: 'Autonomous Agents', titleHe: 'סוכנים אוטונומיים', motto: 'Teammates scan the board and claim tasks themselves', mottoHe: 'חברי צוות סורקים את הלוח ותופסים משימות בעצמם', slug: 's11-autonomous-agents', readingTime: 30 },
  { id: 's12', order: 12, phase: 4, title: 'Worktree + Task Isolation', titleHe: 'בידוד Worktree ומשימות', motto: 'Each works in its own directory, no interference', mottoHe: 'כל אחד עובד בתיקייה שלו, בלי הפרעות', slug: 's12-worktree-task-isolation', readingTime: 30 },
];

export function getSession(slug: string): SessionMeta | undefined {
  return SESSIONS.find(s => s.slug === slug);
}

export function getSessionsByPhase(phase: number): SessionMeta[] {
  return SESSIONS.filter(s => s.phase === phase);
}

export function getAdjacentSessions(slug: string): { prev?: SessionMeta; next?: SessionMeta } {
  const idx = SESSIONS.findIndex(s => s.slug === slug);
  return {
    prev: idx > 0 ? SESSIONS[idx - 1] : undefined,
    next: idx < SESSIONS.length - 1 ? SESSIONS[idx + 1] : undefined,
  };
}
```

- [ ] **Step 2: Create content collection schema**

Create `src/content/config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';

const sessions = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    session: z.string(),
    phase: z.number(),
    motto: z.string(),
    order: z.number(),
    readingTime: z.number(),
    beginnerConcepts: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }),
});

export const collections = { sessions };
```

- [ ] **Step 3: Create s01 English content**

Fetch the source doc from the repo and place it with frontmatter. Create `src/content/sessions/en/s01-the-agent-loop.md`:

```markdown
---
title: "The Agent Loop"
session: "s01"
phase: 1
motto: "One loop & Bash is all you need"
order: 1
readingTime: 15
beginnerConcepts:
  - question: "What's an API?"
    answer: "An API (Application Programming Interface) is a way for programs to talk to each other. When we call the Claude API, we send text and get a response back — like texting a very smart friend."
  - question: "What does 'while True' mean?"
    answer: "It's a loop that runs forever until something tells it to stop. In our agent, it keeps running until the model decides it's done (stop_reason is not 'tool_use')."
  - question: "What's a tool call?"
    answer: "When the AI model wants to do something in the real world (run a command, read a file), it sends back a special 'tool_use' message instead of regular text. Our code then executes that action and sends the result back."
---

<!-- Content will be fetched from source repo during implementation -->
<!-- Placeholder for s01 — the full doc from docs/en/s01-the-agent-loop.md goes here -->

## The Problem

How does a language model go from generating text to actually **doing things** in the real world?

The model can reason, plan, and generate code — but it has no hands. It can't run a command, read a file, or check the result. It's a brain in a jar.

## The Solution

One loop. One tool. That's the entire architecture.

```
while True:
  response = LLM(messages, tools)
  if stop_reason != "tool_use": return
  execute tools
  append results
  loop back
```

The model decides when to call tools and when to stop. The code just executes what the model asks for.

## The Core Loop

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

Four steps, repeated:
1. **Append** the user prompt to messages
2. **Send** messages + tool definitions to the LLM
3. **Check** `stop_reason` — if it's not `tool_use`, the model is done
4. **Execute** each tool call, append the results, loop back

## The Bash Tool

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

One tool definition. One handler. The model now has hands — it can run any shell command and read the output.

## The Full Implementation

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

## Key Takeaway

The entire secret of an AI coding agent is this loop. The model is the intelligence — it decides what to do. The code is just the harness — it gives the model a tool and feeds back results. In the next session, we'll add more tools without changing the loop at all.
```

- [ ] **Step 4: Create s02 English content**

Create `src/content/sessions/en/s02-tool-use.md`:

```markdown
---
title: "Tool Use"
session: "s02"
phase: 1
motto: "Adding a tool means adding one handler"
order: 2
readingTime: 15
beginnerConcepts:
  - question: "What's a dispatch map?"
    answer: "A dictionary that maps tool names to their handler functions. When the model calls 'read_file', the dispatch map looks up which Python function handles that — like a phone directory for tools."
  - question: "Why do we sandbox file paths?"
    answer: "To prevent the agent from reading or writing files outside the project directory. The safe_path() function checks that any requested path stays within the workspace — a basic security boundary."
  - question: "What's path traversal?"
    answer: "A trick where someone uses '../' in a file path to escape the intended directory. For example, '../../etc/passwd' tries to read system files. Our sandbox blocks this."
---

## The Problem

s01 gave the agent one tool: bash. That works, but it's a blunt instrument. Every file read requires `cat`, every write requires `echo >`, every edit requires `sed`. The model wastes tokens on shell syntax when it could use purpose-built tools.

## The Solution

Add tools to the array. Add handlers to the dispatch map. The loop doesn't change.

```
TOOL_HANDLERS = {
    "bash":       run_bash,
    "read_file":  run_read,
    "write_file": run_write,
    "edit_file":  run_edit,
}
```

That's the key insight: **the loop stays identical from s01. Only the tools array and dispatch map grow.**

## The Dispatch Map

```python
def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve()
    if not path.is_relative_to(WORKDIR):
        raise ValueError(f"Path escapes workspace: {p}")
    return path

def run_read(path: str, limit: int = None) -> str:
    text = safe_path(path).read_text()
    lines = text.splitlines()
    if limit and limit < len(lines):
        lines = lines[:limit]
    return "\n".join(lines)[:50000]

def run_write(path: str, content: str) -> str:
    fp = safe_path(path)
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(content)
    return f"Wrote {len(content)} bytes to {path}"

def run_edit(path: str, old_text: str, new_text: str) -> str:
    fp = safe_path(path)
    content = fp.read_text()
    if old_text not in content:
        return f"Error: Text not found in {path}"
    fp.write_text(content.replace(old_text, new_text, 1))
    return f"Edited {path}"

TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"], kw["new_text"]),
}
```

## What Changed from s01

| Component | s01 | s02 |
|-----------|-----|-----|
| Loop | `while True` + `stop_reason` | **Same** |
| Tools | 1 (bash) | 4 (bash, read, write, edit) |
| Dispatch | Direct call | Map: `{name: handler}` |
| Safety | Command blocklist | + Path sandboxing |

The loop is identical. The only growth is in the tools array and the dispatch map. This pattern scales indefinitely — s03 through s12 keep adding tools without touching the loop.

## Key Takeaway

Adding a tool to an agent means two things: (1) a JSON schema the model sees, (2) a handler function the harness calls. The loop never changes. This is the foundation of harness engineering — the model gets more capable without the core architecture growing more complex.
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds. Content collections are parsed.

- [ ] **Step 6: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/lib/sessions.ts src/content/
git commit -m "feat: add content collection schema, session metadata, and first 2 English sessions"
```

---

## Task 5: Base Layout

**Files:**
- Create: `src/layouts/Base.astro`

- [ ] **Step 1: Create the Base layout**

Create `src/layouts/Base.astro`:

```astro
---
import '@/styles/global.css';
import { getLangFromUrl, getUI } from '@/i18n/ui';

interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
const locale = getLangFromUrl(Astro.url);
const ui = getUI(locale);
const dir = locale === 'he' ? 'rtl' : 'ltr';
const fullTitle = `${title} | ${ui['site.title']}`;
const desc = description || ui['site.description'];

// GA Measurement ID — replace with real ID when available
const GA_ID = import.meta.env.PUBLIC_GA_ID || '';
// AdSense Publisher ID — replace with real ID when available
const ADSENSE_ID = import.meta.env.PUBLIC_ADSENSE_ID || '';
---

<!doctype html>
<html lang={locale} dir={dir}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content={desc} />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

  {/* Google Fonts: Inter, Heebo, Fira Code */}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Heebo:wght@400;700&family=Inter:wght@400;600;700&display=swap"
    rel="stylesheet"
  />

  {/* Google Analytics 4 */}
  {GA_ID && (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}></script>
      <script define:vars={{ GA_ID }}>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', GA_ID);
      </script>
    </>
  )}

  {/* Google AdSense */}
  {ADSENSE_ID && (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
      crossorigin="anonymous"
    ></script>
  )}

  <title>{fullTitle}</title>
</head>
<body>
  <slot />
</body>
</html>
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/layouts/Base.astro
git commit -m "feat: add Base layout with GA4, AdSense, fonts, and RTL support"
```

---

## Task 6: Header, Footer, LanguageSwitcher

**Files:**
- Create: `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/LanguageSwitcher.astro`, `src/components/AdSlot.astro`

- [ ] **Step 1: Create LanguageSwitcher**

Create `src/components/LanguageSwitcher.astro`:

```astro
---
import { getLangFromUrl, getLocalizedPath } from '@/i18n/ui';

const locale = getLangFromUrl(Astro.url);
const otherLocale = locale === 'en' ? 'he' : 'en';
const otherPath = getLocalizedPath(Astro.url.pathname, otherLocale);
const otherLabel = otherLocale === 'he' ? 'עב' : 'EN';
const currentLabel = locale === 'he' ? 'עב' : 'EN';
---

<nav class="lang-switcher" aria-label="Language">
  <span class="lang-current">{currentLabel}</span>
  <span class="lang-divider">|</span>
  <a href={otherPath} class="lang-link" data-lang-switch>{otherLabel}</a>
</nav>

<style>
  .lang-switcher {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  .lang-current {
    color: var(--accent);
    font-weight: 600;
  }
  .lang-divider {
    color: var(--border);
  }
  .lang-link {
    color: var(--text-muted);
    transition: color 0.2s;
  }
  .lang-link:hover {
    color: var(--accent-hover);
  }
</style>

<script>
  document.querySelectorAll('[data-lang-switch]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag === 'function') {
        gtag('event', 'language_switch', {
          from: document.documentElement.lang,
          to: link.textContent === 'EN' ? 'en' : 'he',
        });
      }
    });
  });
</script>
```

- [ ] **Step 2: Create Header**

Create `src/components/Header.astro`:

```astro
---
import LanguageSwitcher from './LanguageSwitcher.astro';
import { getLangFromUrl, getUI } from '@/i18n/ui';

const locale = getLangFromUrl(Astro.url);
const ui = getUI(locale);
---

<header class="site-header">
  <div class="header-inner container">
    <a href={`/${locale}/`} class="logo">
      <span class="logo-icon">&gt;_</span>
      <span class="logo-text">AgentCourse</span>
    </a>
    <nav class="header-nav">
      <a href={`/${locale}/`}>{ui['nav.sessions']}</a>
      <LanguageSwitcher />
    </nav>
  </div>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(15, 15, 35, 0.95);
    backdrop-filter: blur(8px);
    border-block-end: 1px solid var(--border);
    height: var(--header-height);
  }
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--text-primary);
  }
  .logo:hover { color: var(--text-primary); }
  .logo-icon {
    color: var(--accent);
    font-family: var(--font-code);
  }
  .header-nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .header-nav a {
    color: var(--text-muted);
    font-size: 0.9rem;
    transition: color 0.2s;
  }
  .header-nav a:hover {
    color: var(--accent);
  }
</style>
```

- [ ] **Step 3: Create AdSlot**

Create `src/components/AdSlot.astro`:

```astro
---
interface Props {
  format: 'banner' | 'sidebar';
  slot?: string;
}

const { format, slot: adSlot } = Astro.props;
const ADSENSE_ID = import.meta.env.PUBLIC_ADSENSE_ID || '';
const adFormat = format === 'banner' ? 'horizontal' : 'rectangle';
const uniqueId = `ad-${format}-${Math.random().toString(36).slice(2, 8)}`;
---

<div class:list={['ad-container', `ad-${format}`]} id={uniqueId} data-ad-lazy>
  {ADSENSE_ID && adSlot ? (
    <ins
      class="adsbygoogle"
      style="display:block"
      data-ad-client={ADSENSE_ID}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={format === 'banner' ? 'true' : 'false'}
    ></ins>
  ) : (
    <div class="ad-placeholder">
      <span>Ad</span>
    </div>
  )}
</div>

<style>
  .ad-container {
    margin-block: 1.5rem;
  }
  .ad-banner {
    max-width: 728px;
    margin-inline: auto;
    min-height: 90px;
  }
  .ad-sidebar {
    width: 300px;
    min-height: 250px;
    position: sticky;
    top: calc(var(--header-height) + 1rem);
  }
  .ad-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-card);
    border: 1px dashed var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 0.8rem;
    min-height: inherit;
    opacity: 0.5;
  }

  @media (max-width: 640px) {
    .ad-sidebar { display: none; }
    .ad-banner { min-height: 50px; }
  }
</style>

<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const container = entry.target as HTMLElement;
        const ins = container.querySelector('.adsbygoogle');
        if (ins && typeof (window as any).adsbygoogle !== 'undefined') {
          try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          } catch {}
        }
        observer.unobserve(container);
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('[data-ad-lazy]').forEach(el => observer.observe(el));
</script>
```

- [ ] **Step 4: Create Footer**

Create `src/components/Footer.astro`:

```astro
---
import AdSlot from './AdSlot.astro';
---

<footer class="site-footer">
  <AdSlot format="banner" />
  <div class="footer-inner container">
    <p class="footer-text">
      Based on <a href="https://github.com/shareAI-lab/learn-claude-code" target="_blank" rel="noopener">learn-claude-code</a> by shareAI-lab. MIT License.
    </p>
    <p class="footer-motto">The model is the agent. The code is the harness.</p>
  </div>
</footer>

<style>
  .site-footer {
    border-block-start: 1px solid var(--border);
    padding-block: 2rem;
    margin-block-start: 4rem;
  }
  .footer-inner {
    text-align: center;
  }
  .footer-text {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .footer-motto {
    color: var(--text-muted);
    font-size: 0.8rem;
    font-style: italic;
    opacity: 0.7;
    margin-block-start: 0.5rem;
  }
</style>
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/components/Header.astro src/components/Footer.astro src/components/LanguageSwitcher.astro src/components/AdSlot.astro
git commit -m "feat: add Header, Footer, LanguageSwitcher, and AdSlot components"
```

---

## Task 7: Landing Page

**Files:**
- Create: `src/components/SessionCard.astro`, `src/layouts/Landing.astro`, `src/pages/en/index.astro`, `src/pages/he/index.astro`

- [ ] **Step 1: Create SessionCard**

Create `src/components/SessionCard.astro`:

```astro
---
import type { SessionMeta } from '@/lib/sessions';
import { getLangFromUrl, getUI } from '@/i18n/ui';

interface Props {
  session: SessionMeta;
}

const { session } = Astro.props;
const locale = getLangFromUrl(Astro.url);
const ui = getUI(locale);
const title = locale === 'he' ? session.titleHe : session.title;
const motto = locale === 'he' ? session.mottoHe : session.motto;
const href = `/${locale}/${session.slug}`;
---

<a href={href} class="session-card" data-session={session.id}>
  <div class="card-header">
    <span class="card-number">{session.id}</span>
    <span class="card-time">{session.readingTime} {ui['session.readingTime']}</span>
  </div>
  <h3 class="card-title">{title}</h3>
  <p class="card-motto">"{motto}"</p>
  <div class="card-footer">
    <span class="card-check" data-progress-check={session.id} aria-hidden="true"></span>
  </div>
</a>

<style>
  .session-card {
    display: block;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.25rem 1.5rem;
    transition: border-color 0.2s, transform 0.2s;
    text-decoration: none;
  }
  .session-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-block-end: 0.5rem;
  }
  .card-number {
    color: var(--accent);
    font-family: var(--font-code);
    font-weight: 600;
    font-size: 0.85rem;
  }
  .card-time {
    color: var(--text-muted);
    font-size: 0.75rem;
  }
  .card-title {
    color: var(--text-primary);
    font-size: 1.15rem;
    margin-block-end: 0.25rem;
  }
  .card-motto {
    color: var(--text-muted);
    font-style: italic;
    font-size: 0.9rem;
    margin-block-end: 0;
  }
  .card-footer {
    display: flex;
    justify-content: flex-end;
    margin-block-start: 0.5rem;
  }
</style>
```

- [ ] **Step 2: Create Landing layout**

Create `src/layouts/Landing.astro`:

```astro
---
import Base from './Base.astro';
import Header from '@/components/Header.astro';
import Footer from '@/components/Footer.astro';
import { getLangFromUrl, getUI } from '@/i18n/ui';

const locale = getLangFromUrl(Astro.url);
const ui = getUI(locale);
---

<Base title={ui['landing.hero.title']}>
  <Header />
  <main>
    <section class="hero star-field">
      <div class="container hero-inner">
        <h1 class="hero-title">{ui['landing.hero.title']}</h1>
        <p class="hero-subtitle">{ui['landing.hero.subtitle']}</p>
        <p class="hero-thesis">{ui['landing.hero.thesis']}</p>
      </div>
    </section>
    <section class="curriculum container">
      <slot />
    </section>
  </main>
  <Footer />
</Base>

<style>
  .hero {
    padding-block: 4rem 3rem;
    text-align: center;
  }
  .hero-inner {
    max-width: 700px;
  }
  .hero-title {
    font-size: 2.5rem;
    margin-block-end: 0.75rem;
    background: linear-gradient(135deg, var(--text-primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero-subtitle {
    color: var(--text-muted);
    font-size: 1.15rem;
    margin-block-end: 1rem;
  }
  .hero-thesis {
    color: var(--text-body);
    font-size: 1rem;
    line-height: 1.8;
    max-width: 600px;
    margin-inline: auto;
  }
  .curriculum {
    padding-block: 2rem 4rem;
  }

  @media (max-width: 640px) {
    .hero { padding-block: 2.5rem 2rem; }
    .hero-title { font-size: 1.75rem; }
  }
</style>
```

- [ ] **Step 3: Create English landing page**

Create `src/pages/en/index.astro`:

```astro
---
import Landing from '@/layouts/Landing.astro';
import SessionCard from '@/components/SessionCard.astro';
import { SESSIONS, getSessionsByPhase } from '@/lib/sessions';
import { getUI } from '@/i18n/ui';

const ui = getUI('en');
const phases = [
  { num: 1, label: ui['phase.1'] },
  { num: 2, label: ui['phase.2'] },
  { num: 3, label: ui['phase.3'] },
  { num: 4, label: ui['phase.4'] },
];
---

<Landing>
  {phases.map(phase => (
    <div class="phase-group">
      <h2 class="phase-header">{phase.label}</h2>
      <div class="phase-sessions">
        {getSessionsByPhase(phase.num).map(session => (
          <SessionCard session={session} />
        ))}
      </div>
    </div>
  ))}
</Landing>

<style>
  .phase-group {
    margin-block-end: 2.5rem;
  }
  .phase-header {
    color: var(--accent);
    font-size: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-block-end: 1rem;
    padding-block-end: 0.5rem;
    border-block-end: 1px solid var(--border);
  }
  .phase-sessions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
```

- [ ] **Step 4: Create Hebrew landing page**

Create `src/pages/he/index.astro`:

```astro
---
import Landing from '@/layouts/Landing.astro';
import SessionCard from '@/components/SessionCard.astro';
import { getSessionsByPhase } from '@/lib/sessions';
import { getUI } from '@/i18n/ui';

const ui = getUI('he');
const phases = [
  { num: 1, label: ui['phase.1'] },
  { num: 2, label: ui['phase.2'] },
  { num: 3, label: ui['phase.3'] },
  { num: 4, label: ui['phase.4'] },
];
---

<Landing>
  {phases.map(phase => (
    <div class="phase-group">
      <h2 class="phase-header">{phase.label}</h2>
      <div class="phase-sessions">
        {getSessionsByPhase(phase.num).map(session => (
          <SessionCard session={session} />
        ))}
      </div>
    </div>
  ))}
</Landing>

<style>
  .phase-group {
    margin-block-end: 2.5rem;
  }
  .phase-header {
    color: var(--accent);
    font-size: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-block-end: 1rem;
    padding-block-end: 0.5rem;
    border-block-end: 1px solid var(--border);
  }
  .phase-sessions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
```

- [ ] **Step 5: Verify build and dev server**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds. Pages `/en/` and `/he/` are generated.

- [ ] **Step 6: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/components/SessionCard.astro src/layouts/Landing.astro src/pages/en/index.astro src/pages/he/index.astro
git commit -m "feat: add landing page with hero, phase groups, and session cards"
```

---

## Task 8: Session Page Layout

**Files:**
- Create: `src/components/SessionNav.astro`, `src/components/BeginnerExplainer.astro`, `src/layouts/Session.astro`, `src/pages/en/[session].astro`, `src/pages/he/[session].astro`

- [ ] **Step 1: Create SessionNav**

Create `src/components/SessionNav.astro`:

```astro
---
import type { SessionMeta } from '@/lib/sessions';
import { getLangFromUrl, getUI } from '@/i18n/ui';

interface Props {
  prev?: SessionMeta;
  next?: SessionMeta;
}

const { prev, next } = Astro.props;
const locale = getLangFromUrl(Astro.url);
const ui = getUI(locale);
---

<nav class="session-nav" aria-label="Session navigation">
  {prev ? (
    <a href={`/${locale}/${prev.slug}`} class="nav-link nav-prev">
      <span class="nav-arrow">&larr;</span>
      <span class="nav-label">{ui['session.prev']}</span>
      <span class="nav-title">{locale === 'he' ? prev.titleHe : prev.title}</span>
    </a>
  ) : <div />}
  {next ? (
    <a href={`/${locale}/${next.slug}`} class="nav-link nav-next">
      <span class="nav-arrow">&rarr;</span>
      <span class="nav-label">{ui['session.next']}</span>
      <span class="nav-title">{locale === 'he' ? next.titleHe : next.title}</span>
    </a>
  ) : <div />}
</nav>

<style>
  .session-nav {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-block: 3rem;
    padding-block-start: 2rem;
    border-block-start: 1px solid var(--border);
  }
  .nav-link {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    text-decoration: none;
    transition: border-color 0.2s;
    max-width: 45%;
  }
  .nav-link:hover { border-color: var(--accent); }
  .nav-next { text-align: end; margin-inline-start: auto; }
  .nav-arrow { color: var(--accent); font-size: 1.2rem; }
  .nav-label { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .nav-title { color: var(--text-primary); font-size: 0.9rem; font-weight: 600; }
</style>
```

- [ ] **Step 2: Create BeginnerExplainer**

Create `src/components/BeginnerExplainer.astro`:

```astro
---
import { getLangFromUrl, getUI } from '@/i18n/ui';

interface Concept {
  question: string;
  answer: string;
}

interface Props {
  concepts: Concept[];
}

const { concepts } = Astro.props;
const locale = getLangFromUrl(Astro.url);
const ui = getUI(locale);
---

{concepts && concepts.length > 0 && (
  <details class="beginner-explainer">
    <summary class="explainer-summary">
      <span class="explainer-icon">💡</span>
      <span>{ui['session.beginnerExplainer']}</span>
    </summary>
    <div class="explainer-content">
      {concepts.map(concept => (
        <div class="concept">
          <h4 class="concept-q">{concept.question}</h4>
          <p class="concept-a">{concept.answer}</p>
        </div>
      ))}
    </div>
  </details>
)}

<style>
  .beginner-explainer {
    background: var(--explainer-bg);
    border: 1px solid var(--explainer-border);
    border-radius: 10px;
    margin-block: 1.5rem;
    overflow: hidden;
  }
  .explainer-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1.25rem;
    cursor: pointer;
    color: var(--text-primary);
    font-weight: 600;
    font-size: 0.95rem;
    list-style: none;
  }
  .explainer-summary::-webkit-details-marker { display: none; }
  .explainer-summary::after {
    content: '▸';
    margin-inline-start: auto;
    transition: transform 0.2s;
    color: var(--explainer-border);
  }
  details[open] .explainer-summary::after {
    transform: rotate(90deg);
  }
  .explainer-icon { font-size: 1.1rem; }
  .explainer-content {
    padding: 0 1.25rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .concept-q {
    color: var(--accent);
    font-size: 0.9rem;
    margin-block-end: 0.25rem;
  }
  .concept-a {
    color: var(--text-body);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }
</style>
```

- [ ] **Step 3: Create Session layout**

Create `src/layouts/Session.astro`:

```astro
---
import Base from './Base.astro';
import Header from '@/components/Header.astro';
import Footer from '@/components/Footer.astro';
import SessionNav from '@/components/SessionNav.astro';
import BeginnerExplainer from '@/components/BeginnerExplainer.astro';
import AdSlot from '@/components/AdSlot.astro';
import ProgressTracker from '@/components/ProgressTracker.astro';
import { getLangFromUrl, getUI } from '@/i18n/ui';
import type { SessionMeta } from '@/lib/sessions';
import { getAdjacentSessions } from '@/lib/sessions';

interface Props {
  session: SessionMeta;
  frontmatter: {
    beginnerConcepts?: { question: string; answer: string }[];
  };
}

const { session, frontmatter } = Astro.props;
const locale = getLangFromUrl(Astro.url);
const ui = getUI(locale);
const title = locale === 'he' ? session.titleHe : session.title;
const motto = locale === 'he' ? session.mottoHe : session.motto;
const { prev, next } = getAdjacentSessions(session.slug);
const phaseKey = `phase.${session.phase}` as const;
const phaseLabel = ui[phaseKey];
---

<Base title={`${session.id}: ${title}`}>
  <Header />
  <main class="session-page">
    <div class="session-layout container">
      <article class="session-content">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href={`/${locale}/`}>{ui['nav.sessions']}</a>
          <span class="breadcrumb-sep">&rsaquo;</span>
          <span>{phaseLabel}</span>
          <span class="breadcrumb-sep">&rsaquo;</span>
          <span>{session.id}</span>
        </nav>

        <header class="session-header">
          <h1>{title}</h1>
          <p class="session-motto">"{motto}"</p>
          <div class="session-meta">
            <span class="meta-time">{session.readingTime} {ui['session.readingTime']}</span>
          </div>
        </header>

        {frontmatter.beginnerConcepts && (
          <BeginnerExplainer concepts={frontmatter.beginnerConcepts} />
        )}

        <div class="prose">
          <slot />
        </div>

        <ProgressTracker sessionId={session.id} />
        <SessionNav prev={prev} next={next} />
      </article>

      <aside class="session-sidebar">
        <AdSlot format="sidebar" />
      </aside>
    </div>
  </main>
  <Footer />
</Base>

<style>
  .session-page {
    padding-block-start: 1.5rem;
  }
  .session-layout {
    display: flex;
    gap: 2rem;
    max-width: calc(var(--max-width) + var(--sidebar-width) + 2rem);
  }
  .session-content {
    flex: 1;
    min-width: 0;
    max-width: var(--max-width);
  }
  .session-sidebar {
    flex-shrink: 0;
    width: var(--sidebar-width);
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-block-end: 1.5rem;
  }
  .breadcrumb a { color: var(--accent); }
  .breadcrumb-sep { opacity: 0.5; }
  .session-header {
    margin-block-end: 2rem;
  }
  .session-motto {
    color: var(--accent);
    font-style: italic;
    font-size: 1.1rem;
    margin-block-start: 0.25rem;
  }
  .session-meta {
    margin-block-start: 0.75rem;
  }
  .meta-time {
    color: var(--text-muted);
    font-size: 0.8rem;
  }
  .prose {
    line-height: 1.75;
  }
  .prose h2 {
    margin-block-start: 2.5rem;
  }
  .prose h3 {
    margin-block-start: 2rem;
  }

  @media (max-width: 1024px) {
    .session-sidebar { display: none; }
    .session-layout { max-width: var(--max-width); }
  }
</style>
```

- [ ] **Step 4: Create ProgressTracker**

Create `src/components/ProgressTracker.astro`:

```astro
---
import { getLangFromUrl, getUI } from '@/i18n/ui';

interface Props {
  sessionId: string;
}

const { sessionId } = Astro.props;
const locale = getLangFromUrl(Astro.url);
const ui = getUI(locale);
---

<div class="progress-tracker" data-session-id={sessionId}>
  <button
    class="progress-btn"
    data-progress-btn={sessionId}
    aria-label={ui['session.markComplete']}
  >
    <span class="btn-check">✓</span>
    <span class="btn-label" data-label-incomplete={ui['session.markComplete']} data-label-complete={ui['session.completed']}>{ui['session.markComplete']}</span>
  </button>
</div>

<style>
  .progress-tracker {
    margin-block: 2rem;
    text-align: center;
  }
  .progress-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.5rem;
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: 8px;
    color: var(--text-body);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .progress-btn:hover {
    border-color: var(--accent);
  }
  .progress-btn.completed {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.1);
    color: #4ade80;
  }
  .btn-check {
    opacity: 0.3;
    transition: opacity 0.2s;
  }
  .progress-btn.completed .btn-check {
    opacity: 1;
  }
</style>

<script>
  const STORAGE_KEY = 'agent-course-progress';

  function getProgress(): Record<string, { completed: boolean; completedAt?: string }> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveProgress(progress: Record<string, { completed: boolean; completedAt?: string }>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  // Initialize all buttons on the page
  document.querySelectorAll<HTMLButtonElement>('[data-progress-btn]').forEach(btn => {
    const sessionId = btn.dataset.progressBtn!;
    const labelEl = btn.querySelector('.btn-label') as HTMLElement;
    const progress = getProgress();
    const isCompleted = progress[sessionId]?.completed;

    if (isCompleted) {
      btn.classList.add('completed');
      labelEl.textContent = labelEl.dataset.labelComplete!;
    }

    btn.addEventListener('click', () => {
      const current = getProgress();
      const wasCompleted = current[sessionId]?.completed;
      current[sessionId] = {
        completed: !wasCompleted,
        completedAt: !wasCompleted ? new Date().toISOString() : undefined,
      };
      saveProgress(current);

      btn.classList.toggle('completed');
      labelEl.textContent = !wasCompleted
        ? labelEl.dataset.labelComplete!
        : labelEl.dataset.labelIncomplete!;

      if (typeof (window as any).gtag === 'function' && !wasCompleted) {
        (window as any).gtag('event', 'session_complete', { session: sessionId });
      }
    });
  });

  // Update landing page checkmarks
  document.querySelectorAll<HTMLElement>('[data-progress-check]').forEach(el => {
    const sessionId = el.dataset.progressCheck!;
    const progress = getProgress();
    if (progress[sessionId]?.completed) {
      el.textContent = '✓';
      el.style.color = '#4ade80';
    }
  });
</script>
```

- [ ] **Step 5: Create English session dynamic page**

Create `src/pages/en/[session].astro`:

```astro
---
import { getCollection } from 'astro:content';
import Session from '@/layouts/Session.astro';
import { getSession, SESSIONS } from '@/lib/sessions';

export async function getStaticPaths() {
  const entries = await getCollection('sessions', (entry) =>
    entry.id.startsWith('en/')
  );
  return entries.map(entry => {
    const slug = entry.id.replace('en/', '').replace('.md', '');
    return {
      params: { session: slug },
      props: { entry },
    };
  });
}

const { entry } = Astro.props;
const slug = entry.id.replace('en/', '').replace('.md', '');
const sessionMeta = getSession(slug);
if (!sessionMeta) throw new Error(`No session metadata for slug: ${slug}`);

const { Content } = await entry.render();
---

<Session session={sessionMeta} frontmatter={entry.data}>
  <Content />
</Session>
```

- [ ] **Step 6: Create Hebrew session dynamic page**

Create `src/pages/he/[session].astro`:

```astro
---
import { getCollection } from 'astro:content';
import Session from '@/layouts/Session.astro';
import { getSession } from '@/lib/sessions';

export async function getStaticPaths() {
  const entries = await getCollection('sessions', (entry) =>
    entry.id.startsWith('he/')
  );
  return entries.map(entry => {
    const slug = entry.id.replace('he/', '').replace('.md', '');
    return {
      params: { session: slug },
      props: { entry },
    };
  });
}

const { entry } = Astro.props;
const slug = entry.id.replace('he/', '').replace('.md', '');
const sessionMeta = getSession(slug);
if (!sessionMeta) throw new Error(`No session metadata for slug: ${slug}`);

const { Content } = await entry.render();
---

<Session session={sessionMeta} frontmatter={entry.data}>
  <Content />
</Session>
```

- [ ] **Step 7: Create placeholder Hebrew content for s01 and s02**

Create `src/content/sessions/he/s01-the-agent-loop.md`:

```markdown
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
---

<!-- Hebrew translation placeholder — full content will be translated in Task 14 -->

## הבעיה

איך מודל שפה עובר מייצור טקסט ל**עשייה** בעולם האמיתי?

המודל יכול לחשוב, לתכנן ולייצר קוד — אבל אין לו ידיים. הוא לא יכול להריץ פקודה, לקרוא קובץ או לבדוק תוצאה. הוא מוח בצנצנת.

## הפתרון

לולאה אחת. כלי אחד. זו כל הארכיטקטורה.
```

Create `src/content/sessions/he/s02-tool-use.md`:

```markdown
---
title: "שימוש בכלים"
session: "s02"
phase: 1
motto: "הוספת כלי פירושה הוספת handler אחד"
order: 2
readingTime: 15
beginnerConcepts:
  - question: "מה זה dispatch map?"
    answer: "מילון שממפה שמות כלים לפונקציות שמטפלות בהם. כשהמודל קורא ל-'read_file', מפת ה-dispatch מחפשת איזו פונקציית Python מטפלת בזה — כמו ספר טלפונים לכלים."
  - question: "למה אנחנו עושים sandbox לנתיבי קבצים?"
    answer: "כדי למנוע מהסוכן לקרוא או לכתוב קבצים מחוץ לתיקיית הפרויקט. הפונקציה safe_path() בודקת שכל נתיב מבוקש נשאר בתוך סביבת העבודה — גבול אבטחה בסיסי."
---

<!-- Hebrew translation placeholder — full content will be translated in Task 14 -->

## הבעיה

s01 נתן לסוכן כלי אחד: bash. זה עובד, אבל זה כלי גס. כל קריאת קובץ דורשת `cat`, כל כתיבה דורשת `echo >`. המודל מבזבז טוקנים על תחביר shell כשהוא יכול להשתמש בכלים ייעודיים.

## הפתרון

הוסיפו כלים למערך. הוסיפו handlers למפת ה-dispatch. הלולאה לא משתנה.
```

- [ ] **Step 8: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds. Session pages are generated at `/en/s01-the-agent-loop`, `/en/s02-tool-use`, `/he/s01-the-agent-loop`, `/he/s02-tool-use`.

- [ ] **Step 9: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/components/SessionNav.astro src/components/BeginnerExplainer.astro src/components/ProgressTracker.astro src/layouts/Session.astro src/pages/en/\[session\].astro src/pages/he/\[session\].astro src/content/sessions/he/
git commit -m "feat: add session page layout with nav, beginner explainer, progress tracker, and dynamic routing"
```

---

## Task 9: CodeWalkthrough React Island

**Files:**
- Create: `src/components/CodeWalkthrough.tsx`

- [ ] **Step 1: Create the CodeWalkthrough component**

Create `src/components/CodeWalkthrough.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';

interface WalkthroughStep {
  lines: [number, number];
  annotation: string;
}

interface CodeWalkthroughProps {
  code: string;
  language: string;
  steps: WalkthroughStep[];
  title?: string;
}

export default function CodeWalkthrough({ code, language, steps, title }: CodeWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const codeRef = useRef<HTMLPreElement>(null);
  const step = steps[currentStep];
  const lines = code.split('\n');

  useEffect(() => {
    // Scroll highlighted lines into view
    if (codeRef.current && step) {
      const firstHighlighted = codeRef.current.querySelector(`[data-line="${step.lines[0]}"]`);
      if (firstHighlighted) {
        firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, step]);

  function handlePrev() {
    setCurrentStep(s => Math.max(0, s - 1));
    fireEvent(currentStep - 1);
  }

  function handleNext() {
    setCurrentStep(s => Math.min(steps.length - 1, s + 1));
    fireEvent(currentStep + 1);
  }

  function fireEvent(stepIndex: number) {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'walkthrough_step', {
        title: title || 'unknown',
        step: stepIndex,
        total: steps.length,
      });
    }
  }

  return (
    <div className="cw-container">
      {title && <div className="cw-title">{title}</div>}

      <div className="cw-body">
        <pre ref={codeRef} className="cw-code">
          <code>
            {lines.map((line, i) => {
              const lineNum = i + 1;
              const isHighlighted = step && lineNum >= step.lines[0] && lineNum <= step.lines[1];
              return (
                <div
                  key={i}
                  data-line={lineNum}
                  className={`cw-line ${isHighlighted ? 'cw-line-active' : ''}`}
                >
                  <span className="cw-line-num">{lineNum}</span>
                  <span className="cw-line-text">{line || ' '}</span>
                </div>
              );
            })}
          </code>
        </pre>

        {step && (
          <div className="cw-annotation">
            <div className="cw-annotation-text">{step.annotation}</div>
          </div>
        )}
      </div>

      <div className="cw-controls">
        <button onClick={handlePrev} disabled={currentStep === 0} className="cw-btn">
          ← Prev
        </button>
        <span className="cw-step-indicator">
          Step {currentStep + 1} of {steps.length}
        </span>
        <button onClick={handleNext} disabled={currentStep === steps.length - 1} className="cw-btn">
          Next →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for CodeWalkthrough**

Append to `src/styles/global.css`:

```css
/* CodeWalkthrough component */
.cw-container {
  background: var(--bg-code);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  margin-block: 2rem;
}

.cw-title {
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border-block-end: 1px solid var(--border);
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-code);
}

.cw-body {
  display: flex;
  gap: 0;
  position: relative;
}

.cw-code {
  flex: 1;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  max-height: 500px;
  overflow-y: auto;
}

.cw-line {
  display: flex;
  padding: 0 1rem;
  transition: background 0.2s;
}

.cw-line-active {
  background: rgba(255, 204, 0, 0.08);
  border-inline-start: 3px solid var(--accent);
}

.cw-line-num {
  display: inline-block;
  width: 3ch;
  text-align: end;
  margin-inline-end: 1rem;
  color: var(--text-muted);
  opacity: 0.4;
  user-select: none;
  flex-shrink: 0;
}

.cw-line-text {
  white-space: pre;
}

.cw-annotation {
  width: 260px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-inline-start: 1px solid var(--border);
  padding: 1rem;
  display: flex;
  align-items: center;
}

.cw-annotation-text {
  color: var(--text-body);
  font-size: 0.85rem;
  line-height: 1.6;
  font-family: var(--font-body);
}

.cw-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: var(--bg-card);
  border-block-start: 1px solid var(--border);
}

.cw-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-body);
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-body);
}

.cw-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.cw-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.cw-step-indicator {
  color: var(--text-muted);
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .cw-body { flex-direction: column; }
  .cw-annotation {
    width: 100%;
    border-inline-start: none;
    border-block-start: 1px solid var(--border);
  }
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds. React component is compiled.

- [ ] **Step 4: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/components/CodeWalkthrough.tsx src/styles/global.css
git commit -m "feat: add CodeWalkthrough React island with step-through code viewer"
```

---

## Task 10: Wire CodeWalkthrough into Session Content

**Files:**
- Modify: `src/content/sessions/en/s01-the-agent-loop.md` (add walkthrough data to frontmatter)
- Create: `src/components/SessionContent.astro` (wrapper that injects walkthroughs)

Note: Astro content collections render markdown to HTML, but we can't embed React components directly in `.md` files without MDX. Instead, we define walkthrough data in frontmatter and render the CodeWalkthrough component in the Session layout based on that data.

- [ ] **Step 1: Update content collection schema to support walkthroughs**

Update `src/content/config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';

const sessions = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    session: z.string(),
    phase: z.number(),
    motto: z.string(),
    order: z.number(),
    readingTime: z.number(),
    beginnerConcepts: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    walkthroughs: z.array(z.object({
      title: z.string(),
      code: z.string(),
      language: z.string(),
      steps: z.array(z.object({
        lines: z.tuple([z.number(), z.number()]),
        annotation: z.string(),
      })),
    })).optional(),
  }),
});

export const collections = { sessions };
```

- [ ] **Step 2: Add walkthrough data to s01 frontmatter**

Add to the frontmatter of `src/content/sessions/en/s01-the-agent-loop.md`, after `beginnerConcepts`:

```yaml
walkthroughs:
  - title: "The Core Agent Loop"
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
        annotation: "The infinite loop. It keeps running until the model decides to stop. This is the heartbeat of every agent."
      - lines: [3, 7]
        annotation: "Send the full conversation history + tool definitions to the LLM. The model sees everything that happened so far."
      - lines: [8, 9]
        annotation: "Append the model's response to the conversation history so it remembers what it said."
      - lines: [11, 12]
        annotation: "The exit condition. If the model didn't ask to use a tool, it's done thinking — return to the user."
      - lines: [14, 21]
        annotation: "Execute each tool call the model requested. Collect the results into tool_result messages."
      - lines: [22, 22]
        annotation: "Feed the tool results back as a 'user' message. The model will see these results on the next iteration and decide what to do next."
```

- [ ] **Step 3: Update Session layout to render walkthroughs after content**

Add the CodeWalkthrough import and rendering to `src/layouts/Session.astro`. Add this import at the top of the frontmatter:

```astro
import CodeWalkthrough from '@/components/CodeWalkthrough';
```

Then in the template, after `<slot />` and before `<ProgressTracker>`, add:

```astro
        {frontmatter.walkthroughs && frontmatter.walkthroughs.length > 0 && (
          <section class="walkthroughs">
            <h2>Interactive Code Walkthrough</h2>
            {frontmatter.walkthroughs.map((wt: any) => (
              <CodeWalkthrough
                client:visible
                code={wt.code}
                language={wt.language}
                steps={wt.steps}
                title={wt.title}
              />
            ))}
          </section>
        )}
```

Also update the Props interface to include walkthroughs:

```typescript
interface Props {
  session: SessionMeta;
  frontmatter: {
    beginnerConcepts?: { question: string; answer: string }[];
    walkthroughs?: {
      title: string;
      code: string;
      language: string;
      steps: { lines: [number, number]; annotation: string }[];
    }[];
  };
}
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds. The CodeWalkthrough renders on `/en/s01-the-agent-loop`.

- [ ] **Step 5: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/content/config.ts src/content/sessions/en/s01-the-agent-loop.md src/layouts/Session.astro
git commit -m "feat: wire CodeWalkthrough into session pages via frontmatter walkthrough data"
```

---

## Task 11: Fetch Remaining English Content (s03-s12)

**Files:**
- Create: `src/content/sessions/en/s03-todo-write.md` through `src/content/sessions/en/s12-worktree-task-isolation.md`

- [ ] **Step 1: Fetch all English doc files from source repo**

For each session s03-s12, fetch the doc content from the source repo and create the corresponding markdown file with frontmatter. Use the GitHub raw content URLs:

```bash
cd /Users/liorpollak/Web/agent-course
for session in s03-todo-write s04-subagent s05-skill-loading s06-context-compact s07-task-system s08-background-tasks s09-agent-teams s10-team-protocols s11-autonomous-agents s12-worktree-task-isolation; do
  echo "Fetching $session..."
  curl -sL "https://raw.githubusercontent.com/shareAI-lab/learn-claude-code/main/docs/en/${session}.md" -o "/tmp/${session}-raw.md"
done
```

Then for each file, prepend the appropriate frontmatter and save to `src/content/sessions/en/`. The frontmatter for each session uses the metadata from `src/lib/sessions.ts`. Each file needs:

- `title`, `session`, `phase`, `motto`, `order`, `readingTime` from the SESSIONS array
- `beginnerConcepts` with 3-5 beginner-friendly Q&A pairs appropriate for that session
- Content: the fetched markdown verbatim

This step requires manual composition for each file — fetch the raw content, add frontmatter, and save. The implementing agent should:
1. Fetch each raw doc
2. Read the SESSIONS metadata from `src/lib/sessions.ts` for that session
3. Author 3-5 beginner concepts appropriate to the session topic
4. Combine frontmatter + raw content into the final file

- [ ] **Step 2: Verify all sessions build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds. All 12 English session pages are generated.

- [ ] **Step 3: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/content/sessions/en/
git commit -m "feat: add all 12 English session content from source repo"
```

---

## Task 12: Hebrew Content Placeholders (s03-s12)

**Files:**
- Create: `src/content/sessions/he/s03-todo-write.md` through `src/content/sessions/he/s12-worktree-task-isolation.md`

- [ ] **Step 1: Create Hebrew placeholder files**

For each session s03-s12, create a Hebrew markdown file with translated frontmatter and placeholder content. The implementing agent should:

1. Copy the English file's frontmatter
2. Translate the `title` and `motto` fields using the values from `src/lib/sessions.ts` (`titleHe`, `mottoHe`)
3. Author Hebrew `beginnerConcepts` (translate from English)
4. Add placeholder body content with the first 2-3 sections translated to Hebrew

Each file follows this pattern:

```markdown
---
title: "<titleHe from sessions.ts>"
session: "<session id>"
phase: <phase number>
motto: "<mottoHe from sessions.ts>"
order: <order number>
readingTime: <reading time>
beginnerConcepts:
  - question: "<Hebrew question>"
    answer: "<Hebrew answer>"
---

<!-- Hebrew content for this session -->
```

- [ ] **Step 2: Verify all Hebrew sessions build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds. All 12 Hebrew session pages are generated.

- [ ] **Step 3: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/content/sessions/he/
git commit -m "feat: add Hebrew session content with translated frontmatter"
```

---

## Task 13: Full Hebrew Translation

**Files:**
- Modify: All `src/content/sessions/he/*.md` files

- [ ] **Step 1: Translate all Hebrew session content**

For each Hebrew session file, translate the full English content to Hebrew. Guidelines:
- Technical terms (API, model, tool_use, bash, etc.) stay in English
- Code blocks stay in English — only comments get translated
- Keep the same markdown structure and headings
- Maintain all ASCII diagrams as-is
- Translate prose paragraphs naturally into Hebrew

Process each file:
1. Read the corresponding English file
2. Translate prose content to Hebrew
3. Preserve code blocks and diagrams
4. Save the updated Hebrew file

- [ ] **Step 2: Verify all translations build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add src/content/sessions/he/
git commit -m "feat: complete Hebrew translations for all 12 sessions"
```

---

## Task 14: Environment Variables and .gitignore

**Files:**
- Create: `.env.example`, `.gitignore`

- [ ] **Step 1: Create .env.example**

Create `.env.example`:

```
# Google Analytics 4 Measurement ID (e.g., G-XXXXXXXXXX)
PUBLIC_GA_ID=

# Google AdSense Publisher ID (e.g., ca-pub-XXXXXXXXXX)
PUBLIC_ADSENSE_ID=
```

- [ ] **Step 2: Create .gitignore**

Create `.gitignore`:

```
# Astro
dist/
.astro/

# Node
node_modules/

# Environment
.env
.env.local

# OS
.DS_Store

# Superpowers
.superpowers/

# Editor
.vscode/
*.swp
```

- [ ] **Step 3: Commit**

```bash
cd /Users/liorpollak/Web/agent-course
git add .env.example .gitignore
git commit -m "feat: add .env.example and .gitignore"
```

---

## Task 15: Build Verification and Dev Server Test

**Files:** None (verification only)

- [ ] **Step 1: Full production build**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro build 2>&1
```

Expected: Build succeeds with no errors. Output shows all pages generated:
- `/en/index.html`
- `/he/index.html`
- `/en/s01-the-agent-loop/index.html` through `/en/s12-worktree-task-isolation/index.html`
- `/he/s01-the-agent-loop/index.html` through `/he/s12-worktree-task-isolation/index.html`
- Root `index.html` (redirect)

Total: 27 pages (1 redirect + 2 landing + 24 session pages)

- [ ] **Step 2: Start dev server and verify landing page**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro dev --port 4321 &
sleep 3
curl -s http://localhost:4321/en/ | head -50
kill %1
```

Expected: HTML output includes the hero title, phase headers, and session cards.

- [ ] **Step 3: Verify RTL Hebrew page**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro dev --port 4321 &
sleep 3
curl -s http://localhost:4321/he/ | grep -o 'dir="rtl"'
kill %1
```

Expected: Output shows `dir="rtl"`.

- [ ] **Step 4: Verify session page renders content**

```bash
cd /Users/liorpollak/Web/agent-course && npx astro dev --port 4321 &
sleep 3
curl -s http://localhost:4321/en/s01-the-agent-loop | grep -o 'agent_loop'
kill %1
```

Expected: Output shows `agent_loop` (from the code blocks in the content).

- [ ] **Step 5: Check dist output size**

```bash
cd /Users/liorpollak/Web/agent-course && du -sh dist/
```

Expected: Under 5MB total (static site with no images).
