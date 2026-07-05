/**
 * Coastal Futures — collecte Newsletter + Contact dans Google Sheets
 * ============================================================================
 * Stockage SANS backend : ce script tourne sur les serveurs de Google et range
 * chaque envoi dans le bon onglet selon le champ `type` :
 *   - type "newsletter" -> onglet « Newsletter » (Email | Langue | Date)
 *   - type "contact"    -> onglet « Contact »    (Date | Nom | Email | Sujet | Message)
 * Les onglets manquants sont créés automatiquement (avec en-têtes).
 *
 * ─── INSTALLATION (5 minutes) ───────────────────────────────────────────────
 * 1. Créer une feuille Google Sheets (sheets.new).
 * 2. Menu  Extensions ▸ Apps Script.
 * 3. Supprimer le code par défaut, coller TOUT ce fichier, puis Enregistrer.
 * 4. Déployer ▸ Nouveau déploiement ▸ Type « Application Web » :
 *      - Exécuter en tant que : Moi
 *      - Qui a accès           : Tout le monde
 *    Déployer, autoriser l'accès, puis COPIER l'URL « .../exec ».
 * 5. Dans le projet React, définir UNE variable d'environnement (les deux
 *    formulaires utilisent la même URL) :
 *      VITE_SHEETS_URL=https://script.google.com/macros/s/XXXX/exec
 *    (en local dans .env ; sur Vercel dans Project Settings ▸ Environment Variables)
 * 6. Rebuild / redeploy. Newsletter ET contact alimentent alors la feuille.
 *
 * Astuce : après toute modification du script, refaire « Déployer ▸ Gérer les
 * déploiements ▸ (crayon) ▸ Nouvelle version » pour publier les changements.
 * ============================================================================
 */

var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var type = String(data.type || 'newsletter').toLowerCase();

    var lock = LockService.getScriptLock();
    lock.waitLock(20000); // évite les écritures concurrentes
    try {
      return type === 'contact' ? handleContact(data) : handleNewsletter(data);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

// Test rapide dans le navigateur (ouvrir l'URL .../exec).
function doGet() {
  return jsonOut({ ok: true, service: 'coastal-futures-sheets' });
}

function handleNewsletter(data) {
  var email = String(data.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return jsonOut({ ok: false, error: 'INVALID_EMAIL' });

  var sheet = getOrCreateSheet('Newsletter', ['Email', 'Langue', "Date d'inscription"]);

  // Dé-duplication sur la colonne Email.
  var last = sheet.getLastRow();
  if (last >= 2) {
    var col = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < col.length; i++) {
      if (String(col[i][0]).trim().toLowerCase() === email) {
        return jsonOut({ ok: true, duplicate: true });
      }
    }
  }

  sheet.appendRow([email, data.lang === 'en' ? 'en' : 'fr', data.createdAt || new Date().toISOString()]);
  return jsonOut({ ok: true });
}

function handleContact(data) {
  var email = String(data.email || '').trim().toLowerCase();
  var message = String(data.message || '').trim();
  if (!EMAIL_RE.test(email) || message.length < 2) {
    return jsonOut({ ok: false, error: 'INVALID' });
  }

  var sheet = getOrCreateSheet('Contact', ['Date', 'Nom', 'Email', 'Sujet', 'Message']);
  sheet.appendRow([
    data.createdAt || new Date().toISOString(),
    String(data.name || '').trim(),
    email,
    String(data.subject || '').trim(),
    message,
  ]);
  return jsonOut({ ok: true });
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
