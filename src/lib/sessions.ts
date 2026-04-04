export interface SessionMeta {
  id: string;
  order: number;
  phase: 1 | 2 | 3 | 4 | 5;
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
  { id: 's13', order: 13, phase: 5, title: 'Agent Evals', titleHe: 'הערכת סוכנים', motto: "You can't improve what you can't measure", mottoHe: 'אי אפשר לשפר מה שלא מודדים', slug: 's13-agent-evals', readingTime: 25 },
  { id: 's14', order: 14, phase: 5, title: 'Guardrails & Safety', titleHe: 'מעקות בטיחות', motto: 'Trust but verify — then verify again', mottoHe: 'סמכו אבל תבדקו — ואז תבדקו שוב', slug: 's14-guardrails', readingTime: 25 },
  { id: 's15', order: 15, phase: 5, title: 'Observability & Debugging', titleHe: 'תצפית ודיבאג', motto: 'When the agent derails at 2am, logs are your only witness', mottoHe: 'כשהסוכן יורד מהפסים בשתיים בלילה, הלוגים הם העד היחיד', slug: 's15-observability', readingTime: 25 },
  { id: 's16', order: 16, phase: 5, title: 'Shipping to Production', titleHe: 'שילוח לפרודקשן', motto: 'A demo agent is easy; a reliable agent is engineering', mottoHe: 'סוכן דמו זה קל; סוכן אמין זו הנדסה', slug: 's16-shipping-to-production', readingTime: 30 },
  { id: 's17', order: 17, phase: 5, title: 'Capstone: Code Review Agent', titleHe: 'פרויקט גמר: סוכן סקירת קוד', motto: 'Everything you learned, one system', mottoHe: 'כל מה שלמדתם, במערכת אחת', slug: 's17-capstone', readingTime: 35 },
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
