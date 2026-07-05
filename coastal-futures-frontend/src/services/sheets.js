/* ============================================================
   Coastal Futures — envoi vers Google Sheets (sans backend)
   ------------------------------------------------------------
   Un seul Web App Google Apps Script (voir google-apps-script/Code.gs)
   reçoit les données et les range dans le bon onglet selon `record.type`
   ('newsletter' ou 'contact').

   CORS : on envoie une "simple request" (Content-Type text/plain) qui ne
   déclenche PAS de préflight (OPTIONS) — qu'Apps Script ne gère pas. Le Web App
   renvoie des en-têtes CORS lisibles, donc on lit la réponse JSON
   ({ ok, duplicate?, error? }). Le miroir localStorage côté service assure le
   retour utilisateur immédiat ; le script Apps Script dé-duplique côté feuille.

   Activation : définir VITE_SHEETS_URL (URL .../exec du déploiement).
   Sans cette variable, l'envoi est ignoré (mode démo localStorage seul).
   ============================================================ */

const SHEETS_URL = import.meta.env.VITE_SHEETS_URL || '';

export function isSheetsConfigured() {
  return Boolean(SHEETS_URL);
}

/**
 * Envoie un enregistrement vers Google Sheets (best-effort, fire-and-forget).
 * @param {{type:'newsletter'|'contact', [key:string]:any}} record
 */
export async function postToSheets(record) {
  if (!SHEETS_URL) return { skipped: true };

  const res = await fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(record),
  });

  // Réponse lisible (CORS) : { ok, duplicate?, error? }
  try {
    return await res.json();
  } catch {
    return { ok: res.ok };
  }
}
