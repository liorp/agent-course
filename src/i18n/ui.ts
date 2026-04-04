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
  return path.replace(/^\/(en|he)\//, `/${locale}/`);
}
