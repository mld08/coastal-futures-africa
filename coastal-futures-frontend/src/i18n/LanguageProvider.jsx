import { useCallback, useEffect, useState } from 'react';
import { LanguageContext } from './context';
import { translations } from './translations';

const STORAGE_KEY = 'cf-lang'; // même clé que le moteur i18n d'origine

function readInitialLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined' && document.documentElement.lang === 'en') {
    return 'en';
  }
  if (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'fr';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang);

  // Propage la langue à <html lang> + localStorage (compat. pages legacy).
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  // Reste synchronisé si une page legacy change <html lang>.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.lang === 'en' ? 'en' : 'fr';
      setLangState((prev) => (prev === current ? prev : current));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });
    return () => observer.disconnect();
  }, []);

  const setLang = useCallback((next) => {
    setLangState(next === 'en' ? 'en' : 'fr');
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'en' ? 'fr' : 'en'));
  }, []);

  const t = useCallback(
    (key) => translations[lang][key] ?? translations.fr[key] ?? key,
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
