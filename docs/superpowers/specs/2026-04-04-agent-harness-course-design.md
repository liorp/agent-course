# Agent Harness Course Website — Design Spec

## Overview

A bilingual (English/Hebrew) interactive course website teaching agent harness engineering, based verbatim on the [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) repository's 12-session curriculum. Built as a static Astro site with a Deep Space visual theme, step-through code walkthroughs, beginner-friendly explainer overlays, Google AdSense ads, and Google Analytics.

## Audience

- **Primary**: Developers and technical learners who know some Python, Linux, and LLM basics
- **Secondary**: Semi-technical readers who want to understand agent harness concepts
- **Content strategy**: Original repo content reproduced verbatim; collapsible beginner explainer boxes added before complex sections for accessibility

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Astro | Content-heavy site, ships near-zero JS, built-in i18n routing, static output |
| Interactive islands | React (via `@astrojs/react`) | Only for CodeWalkthrough component; hydrated with `client:visible` |
| Styling | CSS (custom, no framework) | Deep Space theme, CSS logical properties for RTL, minimal footprint |
| Fonts | Inter (EN), Heebo (HE) via Google Fonts | Heebo has excellent Hebrew support; Inter is clean for code-adjacent text |
| Ads | Google AdSense | Bottom banner + sidebar on session pages |
| Analytics | Google Analytics 4 | Tag in `<head>`, automatic page view tracking |
| Hosting | Static (Vercel/Netlify/Cloudflare Pages) | No backend needed; decision deferred to deployment |
| Progress | localStorage | Session completion checkmarks, no accounts, no backend |

## Content Source

All 12 sessions from the GitHub repo:

| Phase | Session | Title | Motto |
|-------|---------|-------|-------|
| 1: The Loop | s01 | The Agent Loop | "One loop & Bash is all you need" |
| 1: The Loop | s02 | Tool Use | "Adding a tool means adding one handler" |
| 2: Planning & Knowledge | s03 | TodoWrite | "An agent without a plan drifts" |
| 2: Planning & Knowledge | s04 | Subagents | "Break big tasks down; each subtask gets a clean context" |
| 2: Planning & Knowledge | s05 | Skills | "Load knowledge when you need it, not upfront" |
| 2: Planning & Knowledge | s06 | Context Compact | "Context will fill up; you need a way to make room" |
| 3: Persistence | s07 | Tasks | "Break big goals into small tasks, order them, persist to disk" |
| 3: Persistence | s08 | Background Tasks | "Run slow operations in the background; the agent keeps thinking" |
| 4: Teams | s09 | Agent Teams | "When the task is too big for one, delegate to teammates" |
| 4: Teams | s10 | Team Protocols | "Teammates need shared communication rules" |
| 4: Teams | s11 | Autonomous Agents | "Teammates scan the board and claim tasks themselves" |
| 4: Teams | s12 | Worktree + Task Isolation | "Each works in its own directory, no interference" |

Each session includes:
- Documentation (markdown from `docs/en/` in the source repo)
- Python reference implementation (from `agents/` in the source repo)
- ASCII diagrams and code examples (verbatim)

Hebrew translations will be created for all content. The README's philosophical introduction ("The Model IS the Agent") is included as the landing page hero and an introductory page.

## Site Structure

```
agent-course/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── fonts/
│   └── favicon.svg
├── src/
│   ├── content/
│   │   ├── config.ts                    # Content collection schema
│   │   └── sessions/
│   │       ├── en/
│   │       │   ├── s01-the-agent-loop.md
│   │       │   ├── s02-tool-use.md
│   │       │   ├── ...
│   │       │   └── s12-worktree-task-isolation.md
│   │       └── he/
│   │           ├── s01-the-agent-loop.md
│   │           ├── ...
│   │           └── s12-worktree-task-isolation.md
│   ├── components/
│   │   ├── CodeWalkthrough.tsx          # React island: step-through code viewer
│   │   ├── BeginnerExplainer.astro      # Collapsible "what does this mean?" box
│   │   ├── ProgressTracker.astro        # localStorage checkmarks (client script)
│   │   ├── LanguageSwitcher.astro       # EN/HE toggle in nav
│   │   ├── AdSlot.astro                 # AdSense wrapper with lazy loading
│   │   ├── SessionNav.astro             # Prev/Next + phase breadcrumb
│   │   ├── SessionCard.astro            # Card on landing page
│   │   ├── Header.astro                 # Site header with nav
│   │   └── Footer.astro                 # Footer with ad slot
│   ├── layouts/
│   │   ├── Base.astro                   # <html> shell, head, GA, ads script, RTL
│   │   ├── Landing.astro                # Homepage layout
│   │   └── Session.astro                # Session reading layout
│   ├── pages/
│   │   ├── index.astro                  # Redirect to /en/
│   │   ├── en/
│   │   │   ├── index.astro              # English landing
│   │   │   └── [...session].astro       # Dynamic session pages
│   │   └── he/
│   │       ├── index.astro              # Hebrew landing (RTL)
│   │       └── [...session].astro       # Hebrew session pages
│   ├── styles/
│   │   └── global.css                   # Deep Space theme + RTL support
│   ├── i18n/
│   │   ├── en.json                      # UI strings (nav, buttons, labels)
│   │   └── he.json                      # Hebrew UI strings
│   └── lib/
│       └── progress.ts                  # localStorage read/write helpers
└── docs/
    └── superpowers/specs/               # This spec
```

## Pages

### Landing Page (`/en/`, `/he/`)

1. **Hero section**: Course title, one-line description, the "Model IS the Agent" thesis condensed to 2-3 sentences. Subtle CSS star-field animation in the background.
2. **Curriculum progression**: 12 session cards in a vertical list, grouped under 4 phase headers. Each card shows:
   - Session number and title
   - Motto (italic)
   - Tags: estimated reading time, difficulty indicator
   - Completion checkmark (from localStorage)
   - Click → navigates to session page
3. **Phase separators**: Gold-accented phase headers ("Phase 1: The Loop", etc.) between groups
4. **Bottom ad banner**: 728x90 desktop, responsive mobile

### Session Page (`/en/s01`, `/he/s01`)

1. **Phase breadcrumb**: `Phase 1: The Loop > s01: The Agent Loop`
2. **Session header**: Title, motto, estimated reading time
3. **Beginner explainer**: Collapsible blue box at the top — "New to this?" with simplified concepts needed for this session. Closed by default.
4. **Main content**: Verbatim markdown from the source repo, rendered with:
   - Styled headings, paragraphs, lists
   - ASCII diagrams preserved in monospace blocks
   - Code blocks with syntax highlighting (Shiki, built into Astro)
   - **CodeWalkthrough** components for key code examples (the agent loop, tool dispatch, etc.)
5. **Session navigation**: Previous/Next buttons at the bottom
6. **Mark complete button**: Saves to localStorage, updates landing page checkmark
7. **Ads**:
   - Sidebar (300x250) on the right side (desktop), flips to left on RTL
   - Bottom banner below session navigation
   - Both load lazily via IntersectionObserver

## Key Components

### CodeWalkthrough (React island)

The signature interactive element. Takes a code block and a list of annotated steps.

**Props**:
```typescript
interface WalkthroughStep {
  lines: [number, number]  // start and end line to highlight
  annotation: string       // explanation text shown in the margin
}

interface CodeWalkthroughProps {
  code: string             // full source code
  language: string         // "python"
  steps: WalkthroughStep[]
  title?: string           // e.g. "The Core Agent Loop"
}
```

**Behavior**:
- Displays full code block with line numbers
- Step indicator: "Step 1 of 5" with prev/next buttons
- Current step highlights the relevant lines (gold border + background glow)
- Annotation panel slides in beside the highlighted lines
- Also advances on scroll (IntersectionObserver on step markers)
- Mobile: annotation appears below the code block instead of beside it

**Usage in markdown** (via Astro component directive in `.md` files or as embedded JSX):
Each session's markdown will include CodeWalkthrough instances for key code examples. The step annotations will be authored as part of the content.

### BeginnerExplainer

A `<details>` element styled as a collapsible box.

**Visual**: Subtle blue/purple gradient border, "New to this?" header with a down-arrow icon. Expands to show simplified explanations.

**Content per session** (authored in markdown frontmatter or as inline components):
- s01: "What's an API?", "What does `while True` mean?", "What's a tool call?"
- s02: "What's a dispatch map?", "Why do we sandbox file paths?"
- (etc. — one explainer per session, 3-5 concepts each)

### ProgressTracker

Client-side only (no hydration needed — uses a `<script>` tag in the Astro component).

**localStorage schema**:
```json
{
  "agent-course-progress": {
    "s01": { "completed": true, "completedAt": "2026-04-04T10:00:00Z" },
    "s02": { "completed": false }
  }
}
```

Renders checkmarks on the landing page and a "Mark complete" button on session pages.

### LanguageSwitcher

A toggle button in the header: `EN | עב`

Behavior: Navigates to the equivalent page in the other language. E.g., `/en/s01` → `/he/s01`. Preserves scroll position via URL hash if possible.

### AdSlot

Wrapper around AdSense `<ins>` tags.

- Accepts `slot` (ad unit ID), `format` ("banner" | "sidebar"), `responsive` boolean
- Uses IntersectionObserver to only initialize the ad when the slot scrolls into view
- Renders a styled placeholder ("Ad") until the ad loads
- Respects `prefers-reduced-motion` and ad blockers gracefully (hides slot if ad fails)

## Visual Theme: Deep Space

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0f0f23` | Page background |
| `--bg-secondary` | `#1a1a3e` | Gradient end, card hover |
| `--bg-card` | `#161b35` | Cards, panels |
| `--bg-code` | `#0a0a1e` | Code block background |
| `--border` | `#333366` | Card borders, dividers |
| `--text-primary` | `#ffffff` | Headings |
| `--text-body` | `#c0c0e0` | Body text |
| `--text-muted` | `#a0a0cc` | Secondary text, mottos |
| `--accent` | `#ffcc00` | Gold — phase labels, links, highlights, CTAs |
| `--accent-hover` | `#ffe066` | Gold hover state |
| `--code-keyword` | `#ff6b6b` | Python keywords in code |
| `--code-function` | `#ffd43b` | Function names in code |
| `--code-string` | `#98c379` | String literals |
| `--code-comment` | `#6a6a9a` | Comments |
| `--explainer-bg` | `#1a1a4a` | Beginner explainer box |
| `--explainer-border` | `#4a4aff` | Explainer accent border |

### Typography

- **Headings**: Inter 700, `--text-primary`
- **Body**: Inter 400, `--text-body`, `line-height: 1.75`
- **Code**: Fira Code, `font-size: 14px`
- **Hebrew body**: Heebo 400, same sizes and line heights
- **Hebrew headings**: Heebo 700

### Landing Page Hero

CSS star-field: small white dots (`radial-gradient`) on the `--bg-primary` background, with a subtle `@keyframes twinkle` animation. The course title appears centered with a gold underline accent.

### Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| `< 640px` | Single column, no sidebar ad, bottom ads only, code walkthrough annotations below code |
| `640–1024px` | Single column with wider margins, sidebar ad appears |
| `> 1024px` | Full layout with sidebar |

## i18n Implementation

### Astro Config

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'he'],
    routing: { prefixDefaultLocale: true }
  }
})
```

### RTL Support

Hebrew pages render with `<html dir="rtl" lang="he">`. All layout CSS uses logical properties:

- `margin-inline-start` / `margin-inline-end` (not `left` / `right`)
- `padding-inline-start` / `padding-inline-end`
- `text-align: start` / `end`
- `float: inline-start`

The sidebar ad slot flips from right to left automatically. Session navigation arrows flip direction.

### UI Strings

Stored in `src/i18n/en.json` and `src/i18n/he.json`:

```json
{
  "nav.sessions": "Sessions",
  "nav.about": "About",
  "session.markComplete": "Mark as complete",
  "session.completed": "Completed",
  "session.prev": "Previous",
  "session.next": "Next",
  "session.beginnerExplainer": "New to this?",
  "landing.hero.title": "Agent Harness Engineering",
  "landing.hero.subtitle": "12 sessions from a simple loop to autonomous agent teams",
  "phase.1": "Phase 1: The Loop",
  "phase.2": "Phase 2: Planning & Knowledge",
  "phase.3": "Phase 3: Persistence",
  "phase.4": "Phase 4: Teams"
}
```

## Ads Integration

### Google AdSense Setup

- AdSense script loaded once in `Base.astro` `<head>` with `async` attribute
- Individual ad units rendered by `AdSlot.astro`
- Two ad formats:
  - **Bottom banner**: `data-ad-format="horizontal"`, responsive, placed in `Footer.astro`
  - **Sidebar**: `data-ad-format="rectangle"` (300x250), placed in `Session.astro` layout

### Ad Behavior

- Lazy-loaded: ads initialize only when their container enters the viewport
- Graceful degradation: if ad blocker detected, the slot collapses (no empty space)
- No ads above the fold on the landing page
- Session pages: sidebar ad is sticky (follows scroll within the content area, desktop only)

## Google Analytics 4

- Global site tag in `Base.astro` `<head>`
- Page view events fire automatically on each Astro page navigation
- Custom events:
  - `session_complete`: fired when user clicks "Mark as complete"
  - `language_switch`: fired when user toggles EN/HE
  - `walkthrough_step`: fired when user advances a code walkthrough step

## Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 95+ |
| First Contentful Paint | < 1s |
| Total JS shipped (non-ad) | < 30KB gzip |
| Time to Interactive | < 1.5s |

**Strategy**:
- Static HTML output (Astro default)
- Only one React island (CodeWalkthrough), hydrated with `client:visible`
- Fonts: preloaded, subsetted via `&display=swap`
- Ads load lazily, never block initial render
- No client-side routing — full page navigations (fast since pages are pre-rendered)

## Content Pipeline

1. Fetch all English markdown docs from the source repo (`docs/en/s01-s12`)
2. Fetch all Python implementations from the source repo (`agents/s01-s12 + s_full`)
3. Place English docs in `src/content/sessions/en/` with frontmatter added (title, phase, motto, order, reading time)
4. Create Hebrew translations in `src/content/sessions/he/` with matching frontmatter (AI-assisted translation with manual review for technical accuracy)
5. For each session, author:
   - BeginnerExplainer content (3-5 beginner concepts)
   - CodeWalkthrough step definitions (which lines to highlight, what annotations to show)
6. README philosophical intro → landing page hero content + optional `/en/intro` page

## Out of Scope

- User accounts / authentication
- Backend / database
- Comments or discussion features
- Certificate of completion
- Video content
- Mobile app
