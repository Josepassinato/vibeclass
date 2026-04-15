import ptBR from './pt-BR.json';
import enUS from './en-US.json';
import esES from './es-ES.json';

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES';

export const LOCALES: Record<SupportedLocale, { label: string; messages: Record<string, string> }> = {
  'pt-BR': { label: 'Portugues', messages: ptBR },
  'en-US': { label: 'English', messages: enUS },
  'es-ES': { label: 'Espanol', messages: esES },
};

export const DEFAULT_LOCALE: SupportedLocale = 'pt-BR';

const STORAGE_KEY = 'vibe-class-locale';

export function getSavedLocale(): SupportedLocale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in LOCALES) return stored as SupportedLocale;
  return DEFAULT_LOCALE;
}

export function saveLocale(locale: SupportedLocale) {
  localStorage.setItem(STORAGE_KEY, locale);
}
