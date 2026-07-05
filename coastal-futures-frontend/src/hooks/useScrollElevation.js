import { useEffect, useState } from 'react';

/**
 * Renvoie `true` dès que la page est défilée au-delà de `threshold` px.
 * Reproduit l'élévation de la navbar d'origine (classe `.scrolled`).
 */
export function useScrollElevation(threshold = 4) {
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop || 0;
      setElevated(y > threshold);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return elevated;
}
