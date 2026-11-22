import { createContext, useContext, type ReactNode } from 'react';
import { resolveLanguage, translate, type Lang } from '../domain/i18n';

const LanguageContext = createContext<Lang>('ca');

export function LanguageGate({ language, children }: { language: string | null | undefined; children: ReactNode }) {
  return <LanguageContext.Provider value={resolveLanguage(language)}>{children}</LanguageContext.Provider>;
}

export function useT(): (source: string) => string {
  const lang = useContext(LanguageContext);
  return (source: string) => translate(lang, source);
}

export function useLang(): Lang {
  return useContext(LanguageContext);
}
