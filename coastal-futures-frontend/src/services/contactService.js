/* ============================================================
   Coastal Futures — service Contact
   ------------------------------------------------------------
   Même architecture que newsletterService : validation + stockage
   via la façade api (localStorage aujourd'hui, HTTP demain).
   ============================================================ */

import { api } from './api';

const RESOURCE = 'contacts';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const ContactError = {
  INVALID: 'INVALID',
  STORAGE: 'STORAGE',
};

/**
 * Enregistre un message de contact.
 * @param {{name?:string, email:string, subject?:string, message:string}} payload
 */
export async function sendMessage(payload = {}) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const subject = String(payload.subject || payload.sujet || '').trim();
  const message = String(payload.message || '').trim();
  const org = String(payload.org || '').trim();
  const pays = String(payload.pays || '').trim();

  if (!EMAIL_RE.test(email) || message.length < 2) {
    const err = new Error('Champs invalides');
    err.code = ContactError.INVALID;
    throw err;
  }

  const record = {
    name,
    email,
    subject,
    org,
    pays,
    message,
    createdAt: new Date().toISOString(),
  };

  // Enregistré chez nous (backend) — l'équipe reçoit un e-mail et le voit
  // dans la console admin. Plus de Google Sheets.
  try {
    await api.create(RESOURCE, record);
  } catch {
    const err = new Error("Échec de l'envoi");
    err.code = ContactError.STORAGE;
    throw err;
  }

  return record;
}

export async function listMessages() {
  return api.list(RESOURCE);
}
