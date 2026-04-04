import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://agent-course.vercel.app',
  integrations: [react(), sitemap()],
  vite: {
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind-ui.js'],
      },
    },
  },
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
