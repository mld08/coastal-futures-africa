/* ============================================================
   Coastal Futures — pont API pour les pages legacy
   ------------------------------------------------------------
   Les 100+ pages d'origine lisent/écrivent leurs données via la
   couche synchrone CFCol (localStorage), sans passer par la façade
   React `api.js`. Ce pont fait deux choses, activées uniquement
   quand VITE_USE_API=true :

   1) Il expose `window.CFApi` : un petit client HTTP (cookies de
      session inclus) que les scripts inline legacy appellent au
      point de décision (connexion, dépôt de candidature).

   2) `hydrateLegacyCollections(slug)` : AVANT de monter une page,
      il recopie les collections concernées depuis l'API dans les
      clés localStorage de CFCol (`cf-col-<name>`). Comme CFCol lit
      le localStorage en priorité, la page affiche alors les données
      réelles du backend, sans modifier le code legacy.

   Quand VITE_USE_API n'est pas activé : no-op total, la maquette
   (localStorage + seeds) fonctionne exactement comme avant.
   ============================================================ */

const USE_API = import.meta.env.VITE_USE_API === 'true';
const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include', // cookie de session httpOnly (auth)
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try {
    data = res.status === 204 ? null : await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error((data && data.message) || `Erreur API (${res.status})`);
    err.status = res.status;
    err.code = data && data.error;
    throw err;
  }
  return data;
}

const client = {
  useApi: USE_API,
  base: BASE,
  request,
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body || {}) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/** Installe le client global consommé par les scripts inline legacy, et
 *  l'écriture-retour des registres stockés en localStorage brut (cf-map-projects). */
export function installLegacyApiBridge() {
  window.CFApi = client;
  installRawWriteBack();
}

// Intercepte localStorage.setItem : quand une page écrit un registre « brut »
// (ex. admin-projets/admin-carte -> cf-map-projects), on reflète le tableau
// complet vers l'API (PUT, débouncé). L'hydratation est exclue (suppress flag).
function installRawWriteBack() {
  // On patche Storage.prototype.setItem (et non l'instance localStorage, dont la
  // méthode est protégée : l'assignation directe est silencieusement ignorée).
  if (!USE_API || typeof Storage === 'undefined' || Storage.prototype.__cfRawWrap) return;
  const orig = Storage.prototype.setItem;
  const timers = {};
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    orig.call(this, key, value);
    const path = RAW_WRITE[key];
    if (path && !suppressRawWriteBack) {
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => {
        try {
          const arr = JSON.parse(value);
          if (Array.isArray(arr)) {
            request(path, { method: 'PUT', body: JSON.stringify(arr) }).catch(() => {});
          }
        } catch {
          /* valeur non-JSON : ignorer */
        }
      }, 400);
    }
  };
  Storage.prototype.__cfRawWrap = true;
}

// Collections à charger depuis l'API avant qu'une page legacy ne se monte.
// clé = slug de page ; valeur = noms de collections CFCol / ressources API.
const HYDRATE = {
  'admin-candidatures': ['applications', 'calls'],
  'admin-appels': ['calls'],
  'admin-console': ['applications', 'contact_messages', 'subscribers', 'users', 'news', 'events'],
  'admin-utilisateurs': ['users'],
  'admin-newsletter': ['subscribers'],
  'appels-candidatures': ['calls'],
  candidature: ['calls'],
  // CMS : actualités, événements, pages
  index: ['news', 'events'],
  actualites: ['news'],
  article: ['news'],
  evenements: ['events'],
  'admin-contenus': ['news', 'events'],
  'admin-editeur-contenu': ['news'],
  'admin-editeur-evenement': ['events'],
  'admin-site': ['pages'],
  'admin-editeur-page': ['pages'],
  // Annuaires : entrepreneurs, mentors
  'annuaire-entrepreneurs': ['entrepreneurs'],
  'annuaire-mentors': ['mentors'],
  'espace-entrepreneurs': ['entrepreneurs'],
  'espace-mentors': ['mentors'],
  'profil-mentor': ['mentors'],
  'admin-annuaires': ['entrepreneurs', 'mentors'],
  // Messagerie admin
  'admin-messagerie': ['threads', 'messages'],
  // Projets / carte d'impact / reporting bailleurs (indicateurs dérivés côté client)
  'carte-impact': ['projects'],
  'espace-carte': ['projects'],
  'admin-projets': ['projects'],
  'admin-carte': ['projects'],
  'admin-indicateurs': ['projects', 'applications'],
  'tableau-de-bord-partenaire': ['projects', 'applications', 'mentors', 'entrepreneurs'],
  'analyses-bailleur': ['projects', 'applications', 'mentors', 'entrepreneurs'],
};

// Ressources stockées sous une clé localStorage brute (hors préfixe cf-col-),
// avec la ressource REST correspondante pour l'écriture-retour.
const RAW_KEYS = { projects: 'cf-map-projects' };
const RAW_WRITE = { 'cf-map-projects': '/projects' };
// Collections dont le nom CFCol diffère du chemin REST (pour l'hydratation).
const COLL_PATH = { contact_messages: '/contacts', subscribers: '/newsletters' };
let suppressRawWriteBack = false; // vrai pendant l'hydratation (évite un PUT en boucle)

// Collections dont les écritures CFCol sont répercutées vers l'API.
//   path      : ressource REST correspondante
//   patchKeys : si défini, restreint le corps d'un PATCH à ces champs
//               (sinon on transmet la totalité du partiel — cas du CMS)
//   upsert    : 'post' (défaut) crée/fusionne ; 'patch' met à jour par id ;
//               'skip' n'envoie rien (l'écriture publique passe ailleurs)
const WRITE_BACK = {
  applications: { path: '/applications', patchKeys: ['status', 'assignee', 'evaluation', 'history'] },
  news: { path: '/news' },
  events: { path: '/events' },
  pages: { path: '/pages' },
  entrepreneurs: { path: '/entrepreneurs' },
  mentors: { path: '/mentors' },
  threads: { path: '/threads' },
  messages: { path: '/messages' },
  // Contact : l'admin marque lu via upsert -> PATCH /contacts/<id> ; remove -> DELETE.
  contact_messages: { path: '/contacts', upsert: 'patch' },
  // Newsletter : l'admin ne fait que supprimer (remove -> DELETE) ; l'abonnement
  // public passe par le contrôleur React, pas par CFCol -> upsert ignoré.
  subscribers: { path: '/newsletters', upsert: 'skip' },
  // Comptes : l'admin (dé)suspend -> PATCH /users/<id> {status} uniquement.
  users: { path: '/users', patchKeys: ['status'] },
};

/**
 * Rend les écritures CFCol persistantes côté backend pour les collections API.
 * À appeler APRÈS le montage d'une page (CFCol vient d'être (re)créé par
 * cf-collections.js). Enveloppe patch/upsert/remove : la mise à jour locale
 * reste synchrone (retour visuel immédiat) et un appel best-effort persiste en
 * base. Idempotent : ne ré-enveloppe pas un CFCol déjà instrumenté.
 */
export function installCollectionWriteBack() {
  if (!USE_API || !window.CFCol || window.CFCol.__apiWriteBack) return;
  const origPatch = window.CFCol.patch;
  const origUpsert = window.CFCol.upsert;
  const origRemove = window.CFCol.remove;
  const origPush = window.CFCol.push;

  window.CFCol.patch = function patched(name, id, partial) {
    const result = origPatch.call(this, name, id, partial);
    const entry = WRITE_BACK[name];
    if (entry && id && partial && typeof partial === 'object') {
      let body = partial;
      if (entry.patchKeys) {
        body = {};
        entry.patchKeys.forEach((k) => { if (k in partial) body[k] = partial[k]; });
      }
      if (Object.keys(body).length) client.patch(`${entry.path}/${id}`, body).catch(() => {});
    }
    return result;
  };

  // upsert -> POST (création/fusion) ou PATCH (mise à jour par id) selon la conf.
  window.CFCol.upsert = function upserted(name, obj) {
    const result = origUpsert.call(this, name, obj);
    const entry = WRITE_BACK[name];
    if (entry && !entry.patchKeys && obj && typeof obj === 'object') {
      const mode = entry.upsert || 'post';
      if (mode === 'post') client.post(entry.path, obj).catch(() => {});
      else if (mode === 'patch' && obj.id != null) client.patch(`${entry.path}/${obj.id}`, obj).catch(() => {});
      // 'skip' -> rien
    }
    return result;
  };

  // remove -> DELETE.
  window.CFCol.remove = function removed(name, id) {
    const result = origRemove.call(this, name, id);
    const entry = WRITE_BACK[name];
    if (entry && !entry.patchKeys && id) {
      client.del(`${entry.path}/${id}`).catch(() => {});
    }
    return result;
  };

  // push (ajout en tête, ex. envoi d'un message) -> POST.
  window.CFCol.push = function pushed(name, obj) {
    const result = origPush.call(this, name, obj);
    const entry = WRITE_BACK[name];
    if (entry && !entry.patchKeys && obj && typeof obj === 'object') {
      client.post(entry.path, obj).catch(() => {});
    }
    return result;
  };

  window.CFCol.__apiWriteBack = true;
}

/**
 * Pré-remplit les collections CFCol depuis l'API pour le slug donné.
 * Best-effort : en cas d'échec (non connecté, hors-ligne), on conserve
 * les seeds locaux — la page reste fonctionnelle.
 * @param {string} slug
 */
export async function hydrateLegacyCollections(slug) {
  if (!USE_API) return;
  const names = HYDRATE[slug];
  if (!names) return;
  await Promise.all(
    names.map(async (name) => {
      try {
        const data = await request(COLL_PATH[name] || `/${name}`);
        if (Array.isArray(data)) {
          const key = RAW_KEYS[name] || `cf-col-${name}`;
          // Écriture d'hydratation : ne PAS la répercuter en PUT (boucle).
          suppressRawWriteBack = true;
          try {
            localStorage.setItem(key, JSON.stringify(data));
          } finally {
            suppressRawWriteBack = false;
          }
        }
      } catch {
        /* on garde la copie locale */
      }
    }),
  );
}
