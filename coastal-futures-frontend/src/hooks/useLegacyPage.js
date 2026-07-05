import { useEffect, useRef, useState } from 'react';
import {
  fetchLegacyHtml,
  parseLegacyHtml,
  mountLegacyPage,
} from '../utils/legacyLoader';
import { bindNewsletter } from '../services/newsletterController';
import { bindContact } from '../services/contactController';
import { hydrateLegacyCollections, installCollectionWriteBack } from '../services/legacyBridge';

/**
 * Charge et monte une page legacy dans un conteneur, puis branche
 * le formulaire newsletter sur la couche services. Re-monte quand
 * le slug change (navigation React Router).
 *
 * @param {string} slug  nom de fichier sans extension (ex. "a-propos")
 */
export function useLegacyPage(slug) {
  const ref = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;

    let cancelled = false;
    let cleanupNewsletter = () => {};
    let cleanupContact = () => {};
    const previousBodyClass = document.body.className;
    // Référence des enfants du <body> AVANT montage : les scripts legacy
    // ajoutent des éléments directement au body (drawer #cfMdrawer, bandeau
    // cookies, splash, toasts…). On les retirera au démontage pour éviter
    // qu'ils s'accumulent au fil de la navigation SPA.
    const bodyChildrenBefore = new Set(Array.from(document.body.children));

    setStatus('loading');

    (async () => {
      try {
        const html = await fetchLegacyHtml(slug);
        if (cancelled) return;

        // Recopie les collections du backend dans CFCol AVANT le montage
        // (no-op si VITE_USE_API n'est pas activé). La page legacy lit alors
        // les données réelles sans qu'on touche à son code.
        await hydrateLegacyCollections(slug);
        if (cancelled) return;

        const doc = parseLegacyHtml(html);

        const title = doc.querySelector('title');
        if (title && title.textContent) document.title = title.textContent;

        // Certaines pages stylent via une classe sur <body>.
        const bodyClass = doc.body.getAttribute('class');
        if (bodyClass) document.body.className = bodyClass;

        await mountLegacyPage(container, doc, { isCancelled: () => cancelled });
        if (cancelled) return;

        // CFCol vient d'être (re)créé par la page : on instrumente ses écritures
        // pour les persister en base (no-op si VITE_USE_API n'est pas activé).
        installCollectionWriteBack();

        cleanupNewsletter = bindNewsletter(container);
        cleanupContact = bindContact(container);
        window.scrollTo(0, 0);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          console.error('[legacy] échec du chargement de', slug, err);
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanupNewsletter();
      cleanupContact();
      container.innerHTML = '';
      document.body.className = previousBodyClass;
      // Retire les éléments ajoutés au body par les scripts de cette page.
      Array.from(document.body.children).forEach((node) => {
        if (!bodyChildrenBefore.has(node)) node.remove();
      });
    };
  }, [slug]);

  return { ref, status };
}
