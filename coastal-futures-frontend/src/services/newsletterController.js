/* ============================================================
   Coastal Futures — contrôleur DOM du formulaire newsletter
   ------------------------------------------------------------
   Le markup du formulaire (#cfnForm) vit dans les pages legacy.
   Le script d'origine qui le pilotait est neutralisé par le
   chargeur (legacyLoader). Ce contrôleur reprend la main :
   - rend les libellés FR/EN (et réagit au changement de langue) ;
   - intercepte la soumission et la route vers newsletterService.

   Aucun accès direct au stockage ici : tout passe par le service.
   ============================================================ */

import { subscribe, NewsletterError } from './newsletterService';

const T = {
  fr: {
    h: 'Restez informé du programme',
    p: 'Recevez les appels à candidatures, les événements et les actualités de Coastal Futures, une fois par mois.',
    b: "S'inscrire",
    ph: 'Votre adresse e-mail',
    err: 'Veuillez saisir une adresse e-mail valide.',
    ok: 'Merci, votre inscription est enregistrée.',
    already: 'Cette adresse est déjà inscrite à la newsletter.',
    note: 'Une fois par mois. Désinscription en un clic.',
    fail: "Une erreur est survenue. Veuillez réessayer.",
  },
  en: {
    h: 'Stay informed about the programme',
    p: 'Get calls for applications, events and news from Coastal Futures, once a month.',
    b: 'Subscribe',
    ph: 'Your email address',
    err: 'Please enter a valid email address.',
    ok: 'Thank you, your subscription is recorded.',
    already: 'This address is already subscribed to the newsletter.',
    note: 'Once a month. Unsubscribe in one click.',
    fail: 'Something went wrong. Please try again.',
  },
};

const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'fr');

/**
 * Lie le formulaire newsletter présent dans `root`.
 * @returns {() => void} fonction de nettoyage
 */
export function bindNewsletter(root) {
  const form = root.querySelector('#cfnForm');
  if (!form) return () => {};

  const H = root.querySelector('#cfnH');
  const P = root.querySelector('#cfnP');
  const B = root.querySelector('#cfnBtn');
  const E = root.querySelector('#cfnEmail');
  const ER = root.querySelector('#cfnErr');
  const OK = root.querySelector('#cfnOk');
  const NOTE = root.querySelector('#cfnNote');

  const render = () => {
    const t = T[lang()];
    if (H) H.textContent = t.h;
    if (P) P.textContent = t.p;
    if (B) B.innerHTML = `${t.b} <i class="ti ti-arrow-right"></i>`;
    if (E) E.placeholder = t.ph;
    if (ER) ER.textContent = t.err;
    if (NOTE) NOTE.textContent = t.note;
  };
  render();

  let observer;
  try {
    observer = new MutationObserver(render);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });
  } catch {
    observer = null;
  }

  const showOk = (msg) => {
    if (ER) ER.classList.remove('show');
    if (OK) {
      OK.innerHTML = `<i class="ti ti-circle-check"></i>${msg}`;
      OK.classList.add('show');
    }
    if (E) E.value = '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const t = T[lang()];
    try {
      await subscribe(E ? E.value : '', lang());
      showOk(t.ok);
    } catch (err) {
      if (err.code === NewsletterError.ALREADY_SUBSCRIBED) {
        showOk(t.already);
      } else if (err.code === NewsletterError.INVALID_EMAIL) {
        if (OK) OK.classList.remove('show');
        if (ER) ER.classList.add('show');
      } else {
        if (OK) OK.classList.remove('show');
        if (ER) {
          ER.textContent = t.fail;
          ER.classList.add('show');
        }
      }
    }
  };

  form.addEventListener('submit', onSubmit);

  return () => {
    if (observer) observer.disconnect();
    form.removeEventListener('submit', onSubmit);
  };
}
