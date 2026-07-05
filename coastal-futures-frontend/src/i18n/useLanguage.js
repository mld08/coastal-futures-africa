import { useContext } from 'react';
import { LanguageContext } from './context';

/** Accès à la langue courante et aux helpers de traduction. */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage doit être utilisé dans <LanguageProvider>');
  return ctx;
}
