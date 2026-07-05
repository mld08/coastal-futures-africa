/* ============================================================
   Coastal Futures — capture du formulaire de contact legacy
   ------------------------------------------------------------
   Le formulaire #contactForm vit dans les pages legacy et garde son
   propre script (validation, message de succès, toast). Ce contrôleur
   s'ajoute EN PARALLÈLE (sans preventDefault, sans toucher à l'UX) :
   à chaque soumission, il route les données vers notre backend via
   contactService (l'équipe reçoit un e-mail + message visible en admin).
   Le service valide lui-même : une soumission incomplète n'enregistre rien.
   Ce contrôleur câble aussi le petit formulaire newsletter de la page contact
   (#newsForm), qui n'a pas de contrôleur dédié.
   ============================================================ */

import { sendMessage } from './contactService';
import { subscribe } from './newsletterService';

function fieldValue(form, name) {
  const el = form.elements[name];
  return el ? String(el.value || '').trim() : '';
}

/**
 * Lie le formulaire de contact (et la newsletter de la page contact).
 * @returns {() => void} fonction de nettoyage
 */
export function bindContact(root) {
  const cleanups = [];

  const form = root.querySelector('#contactForm');
  if (form) {
    const onSubmit = () => {
      const payload = {
        name: fieldValue(form, 'nom') || fieldValue(form, 'name'),
        email: fieldValue(form, 'email'),
        subject: fieldValue(form, 'sujet'),
        org: fieldValue(form, 'org'),
        pays: fieldValue(form, 'pays'),
        message: fieldValue(form, 'message'),
      };
      sendMessage(payload).catch(() => {});
    };
    form.addEventListener('submit', onSubmit);
    cleanups.push(() => form.removeEventListener('submit', onSubmit));
  }

  // Newsletter de la page contact (#newsForm, champ « nemail »).
  const newsForm = root.querySelector('#newsForm');
  if (newsForm) {
    const onNews = () => {
      const email = fieldValue(newsForm, 'nemail') || fieldValue(newsForm, 'email');
      const lang = document.documentElement.lang === 'en' ? 'en' : 'fr';
      if (email) subscribe(email, lang, 'newsletter · contact').catch(() => {});
    };
    newsForm.addEventListener('submit', onNews);
    cleanups.push(() => newsForm.removeEventListener('submit', onNews));
  }

  return () => cleanups.forEach((fn) => fn());
}
