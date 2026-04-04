import type { APIRoute, GetStaticPaths } from 'astro';
import { SESSIONS } from '@/lib/sessions';

export const getStaticPaths: GetStaticPaths = () => {
  const paths: { params: { slug: string } }[] = [];
  for (const session of SESSIONS) {
    paths.push({ params: { slug: `en/${session.slug}` } });
    paths.push({ params: { slug: `he/${session.slug}` } });
  }
  // Landing pages
  paths.push({ params: { slug: 'en' } });
  paths.push({ params: { slug: 'he' } });
  return paths;
};

export const GET: APIRoute = ({ params }) => {
  const slug = params.slug!;
  const parts = slug.split('/');
  const locale = parts[0];
  const sessionSlug = parts[1];

  let title: string;
  let subtitle: string;

  if (sessionSlug) {
    const session = SESSIONS.find(s => s.slug === sessionSlug);
    if (!session) return new Response('Not found', { status: 404 });
    title = locale === 'he' ? session.titleHe : session.title;
    subtitle = locale === 'he' ? session.mottoHe : session.motto;
  } else {
    title = locale === 'he' ? 'הנדסת רתמה לסוכנים' : 'Agent Harness Engineering';
    subtitle = locale === 'he' ? '12 שיעורים מלולאה פשוטה ועד צוותי סוכנים אוטונומיים' : '12 sessions from a simple loop to autonomous agent teams';
  }

  // Escape XML entities
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0f23"/>
      <stop offset="100%" style="stop-color:#1a1a3e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="80" y="100" font-size="28" fill="#ffcc00" font-family="monospace" font-weight="bold">🤖 AgentCourse</text>
  <text x="80" y="280" font-size="56" fill="#ffffff" font-family="system-ui,sans-serif" font-weight="bold">${esc(title)}</text>
  <text x="80" y="360" font-size="28" fill="#a0a0cc" font-family="system-ui,sans-serif" font-style="italic">"${esc(subtitle)}"</text>
  <text x="80" y="560" font-size="22" fill="#666699" font-family="monospace">agent-course.vercel.app</text>
</svg>`;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
};
