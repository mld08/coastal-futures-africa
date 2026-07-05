/* ============================================================
   Coastal Futures — couche d'accès aux données (façade)
   ------------------------------------------------------------
   AUCUN composant ne lit/écrit la donnée directement : tout
   passe par les services (newsletterService, contactService…),
   qui eux-mêmes passent par cette façade `api`.

   Aujourd'hui (démo publique Vercel) : pas de backend.
   -> backend "localStorage", amorcé depuis /data/*.json.

   Demain (vrai backend) : mettre VITE_USE_API=true et
   VITE_API_BASE_URL=https://api.exemple.org. Les requêtes
   HTTP remplacent alors le localStorage SANS toucher aux
   services ni aux composants.
   ============================================================ */

const USE_API = import.meta.env.VITE_USE_API === 'true';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const storeKey = (resource) => `cf:${resource}`;

const localStore = {
  read(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / mode privé : on ignore silencieusement */
    }
    return value;
  },
};

// Amorçage : si le localStorage est vide pour cette ressource,
// on charge le jeu de démonstration depuis le fichier JSON public.
async function seedIfEmpty(resource, seedUrl) {
  const key = storeKey(resource);
  if (localStorage.getItem(key) != null) return localStore.read(key);
  let data = [];
  if (seedUrl) {
    try {
      const res = await fetch(seedUrl);
      if (res.ok) data = await res.json();
    } catch {
      data = [];
    }
  }
  return localStore.write(key, data);
}

async function httpFetch(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    // `credentials: 'include'` : envoie/reçoit le cookie de session httpOnly
    // posé par le backend Flask (connexion). Indispensable pour l'auth par
    // cookie ; le backend autorise cette origine via CORS (supports_credentials).
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = new Error(`Erreur API (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  USE_API,
  API_BASE,

  /** Liste les enregistrements d'une ressource. */
  async list(resource, { seed } = {}) {
    if (USE_API) return httpFetch(`/${resource}`);
    return seedIfEmpty(resource, seed);
  },

  /** Crée un enregistrement. */
  async create(resource, record) {
    if (USE_API) {
      return httpFetch(`/${resource}`, {
        method: 'POST',
        body: JSON.stringify(record),
      });
    }
    const key = storeKey(resource);
    const all = localStore.read(key);
    all.push(record);
    localStore.write(key, all);
    return record;
  },

  /** Remplace l'intégralité d'une collection (usage admin/démo). */
  async replaceAll(resource, records) {
    if (USE_API) {
      return httpFetch(`/${resource}`, {
        method: 'PUT',
        body: JSON.stringify(records),
      });
    }
    return localStore.write(storeKey(resource), records);
  },
};
