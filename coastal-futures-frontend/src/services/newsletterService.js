/* ============================================================
   Coastal Futures — service Newsletter
   ------------------------------------------------------------
   Responsabilités :
   - valider le format de l'e-mail ;
   - éviter les doublons ;
   - ajouter la date d'inscription ;
   - gérer les erreurs (codes explicites).

   Stockage actuel : localStorage, amorcé depuis
   /data/newsletters.json. Pour brancher un vrai backend, voir
   src/services/api.js (aucune modification ici nécessaire).
   ============================================================ */

import { api } from './api';

const RESOURCE = 'newsletters';
const SEED_URL = '/data/newsletters.json';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const NewsletterError = {
  INVALID_EMAIL: 'INVALID_EMAIL',
  ALREADY_SUBSCRIBED: 'ALREADY_SUBSCRIBED',
  STORAGE: 'STORAGE',
};

export function isValidEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

export async function listSubscribers() {
  return api.list(RESOURCE, { seed: SEED_URL });
}

/**
 * Inscrit un e-mail à la newsletter.
 * @param {string} emailRaw
 * @param {'fr'|'en'} [lang]
 * @returns {Promise<{email:string, lang:string, createdAt:string}>}
 * @throws {Error} avec .code ∈ NewsletterError
 */
export async function subscribe(emailRaw, lang = 'fr', source = 'newsletter') {
  const email = String(emailRaw || '').trim().toLowerCase();

  if (!isValidEmail(email)) {
    const err = new Error('Adresse e-mail invalide');
    err.code = NewsletterError.INVALID_EMAIL;
    throw err;
  }

  // Mode maquette (sans backend) : dé-duplication locale. En mode API, la
  // dé-duplication est faite côté serveur (la liste n'est plus publique).
  if (!api.USE_API) {
    let subscribers;
    try {
      subscribers = await listSubscribers();
    } catch {
      const err = new Error("Impossible d'accéder aux inscriptions");
      err.code = NewsletterError.STORAGE;
      throw err;
    }
    if (subscribers.some((s) => s.email === email)) {
      const err = new Error('Adresse déjà inscrite');
      err.code = NewsletterError.ALREADY_SUBSCRIBED;
      throw err;
    }
  }

  const record = {
    email,
    lang: lang === 'en' ? 'en' : 'fr',
    source,
    createdAt: new Date().toISOString(),
  };

  let saved;
  try {
    saved = await api.create(RESOURCE, record);
  } catch {
    const err = new Error("Échec de l'enregistrement");
    err.code = NewsletterError.STORAGE;
    throw err;
  }

  // Le backend signale une adresse déjà inscrite (200 + existing) -> même UX.
  if (saved && saved.existing) {
    const err = new Error('Adresse déjà inscrite');
    err.code = NewsletterError.ALREADY_SUBSCRIBED;
    throw err;
  }

  return record;
}
