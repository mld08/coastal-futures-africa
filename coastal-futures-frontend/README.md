# Coastal Futures Network — Frontend (React + Vite)

Plateforme web de l'Institut Africain de la Gouvernance (IAG) : former et connecter
4 000 jeunes entrepreneurs verts dans cinq pays côtiers d'Afrique de l'Ouest.

Cette application est la migration **React + Vite** du site d'origine (HTML/CSS/JS
vanilla, 100+ écrans). Le rendu est **identique** à l'original (design system,
animations, bilingue FR/EN, cartes Leaflet), et le code est désormais structuré
en application React moderne avec **routing**, **hooks** et une **couche services**.

---

## 🚀 Démarrage rapide

```bash
npm install        # installer les dépendances
npm run dev        # serveur de développement (http://localhost:5173)
npm run build      # build de production (dossier dist/)
npm run preview    # prévisualiser le build de production
npm run lint       # vérifier le code (ESLint)
```

Node.js 18+ recommandé.

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── LegacyPage.jsx        # rend une page d'origine (pixel-perfect)
│   └── LinkInterceptor.jsx   # transforme les liens "xxx.html" en navigation SPA
├── pages/                    # (réservé aux futures pages 100 % React)
├── layouts/
│   └── RootLayout.jsx        # coquille commune (Outlet + interception des liens)
├── hooks/
│   └── useLegacyPage.js      # charge/monte une page + branche la newsletter
├── services/                 # ⚠️ SEUL point d'accès aux données
│   ├── api.js                # façade : localStorage (démo) ↔ HTTP (plus tard)
│   ├── newsletterService.js  # inscription : validation, dédoublonnage, date
│   ├── contactService.js     # messages de contact
│   └── newsletterController.js # branche le <form> legacy sur le service
├── utils/
│   └── legacyLoader.js       # fetch + injection HTML/CSS + ré-exécution des scripts
├── styles/
│   └── global.css            # styles minimes de la coquille
├── assets/                   # assets propres à React (vide pour l'instant)
├── legacyPages.js            # manifeste des 103 pages
├── routes.js                 # génération des routes
├── App.jsx                   # routeur
└── main.jsx                  # point d'entrée (BrowserRouter)

public/
├── assets/   # design system d'origine (CSS, JS, polices, icônes, médias)
├── uploads/  # médias additionnels
├── legacy/   # les 103 pages HTML d'origine (servies par le chargeur)
├── data/
│   └── newsletters.json      # base de démonstration des inscrits
├── favicon.svg · robots.txt · sitemap.xml
```

### Stratégie de migration « strangler-fig »

Vu le volume (100+ écrans avec un design system entièrement inliné), la migration
suit le motif **strangler-fig** :

1. **Coquille React** — React Router gère une route par page d'origine. Le layout,
   les hooks et la couche services sont du React idiomatique.
2. **Chargeur de pages legacy** (`legacyLoader.js` + `useLegacyPage.js`) — chaque
   page d'origine est rendue **telle quelle** : son HTML, son CSS inliné et ses
   scripts (i18n FR/EN, cartes Leaflet, navbar, cookies, animations `reveal`,
   count-up…) sont réinjectés et ré-exécutés. **Résultat pixel-perfect garanti.**
3. Une page peut ensuite être **réécrite en composants React purs** (dossier
   `pages/` / `components/`) sans rien casser autour : on remplace simplement sa
   route. C'est l'évolution naturelle prévue par cette architecture.

> Les feuilles de style partagées (`cf-fonts.css`, `cf-icons.css`, `cf-nav.css`,
> Leaflet) sont chargées **globalement** dans `index.html` ; les `<style>` et
> `<link>` propres à chaque page sont injectés par le chargeur.

---

## 📰 Newsletter (démo sans backend)

Le formulaire d'inscription (présent sur ~37 pages, `#cfnForm`) est repris par
`newsletterController.js` et routé vers `newsletterService.js`, qui :

- **valide** le format de l'e-mail ;
- **évite les doublons** ;
- **ajoute la date** d'inscription (`createdAt`, ISO 8601) ;
- **gère les erreurs** (codes `INVALID_EMAIL`, `ALREADY_SUBSCRIBED`, `STORAGE`).

Comme Vercel ne permet pas d'écrire sur le système de fichiers après déploiement :

- le **stockage réel** se fait dans `localStorage` (clé `cf:newsletters`) ;
- `public/data/newsletters.json` sert de **base de démonstration** (amorce le
  `localStorage` au premier chargement).

### Collecte centralisée sans backend → Google Sheets

Le `localStorage` est **par navigateur** : pour collecter réellement les données
de tous les visiteurs, on les envoie en plus dans une **feuille Google Sheets**
via un Web App **Google Apps Script** (aucun serveur à héberger). Un seul Web App
gère **les deux formulaires** (newsletter + contact), rangés dans deux onglets.

1. Suivre les étapes en tête de [`google-apps-script/Code.gs`](google-apps-script/Code.gs)
   (créer la feuille, coller le script, déployer en « Application Web »).
2. Définir **une** variable d'environnement avec l'URL `.../exec` obtenue :
   ```
   VITE_SHEETS_URL=https://script.google.com/macros/s/XXXX/exec
   ```
   (en local dans `.env`, sur Vercel dans *Project Settings ▸ Environment Variables*).
3. Rebuild/redeploy. Les onglets sont créés automatiquement :
   - **Newsletter** : `Email · Langue · Date` (dé-duplication côté feuille) ;
   - **Contact** : `Date · Nom · Email · Sujet · Message`.

Implémentation :
- `src/services/sheets.js` — envoi générique en `no-cors` (best-effort), routé
  par `record.type` (`newsletter` / `contact`) ;
- `src/services/newsletterController.js` — reprend le formulaire `#cfnForm` ;
- `src/services/contactController.js` — capture le formulaire `#contactForm`
  **en parallèle** de son script d'origine (sans en modifier l'UX).

Le `localStorage` reste un **miroir local** (retour utilisateur immédiat,
dé-duplication côté client). Sans `VITE_SHEETS_URL`, le comportement de démo
(localStorage seul) est conservé.

---

## 🔌 Brancher un vrai backend plus tard

Toute la donnée passe par `src/services/` : **aucun composant n'accède
directement au stockage**. Pour remplacer le localStorage par une API HTTP,
**aucune modification des composants** n'est nécessaire :

1. Créer un fichier `.env` (voir `.env.example`) :
   ```
   VITE_USE_API=true
   VITE_API_BASE_URL=https://api.coastalfutures.exemple.org
   ```
2. C'est tout. `src/services/api.js` bascule alors sur `fetch` :
   - `GET  {API_BASE}/newsletters` (liste)
   - `POST {API_BASE}/newsletters` (inscription)
   - `POST {API_BASE}/contacts` (contact)

Les signatures de `newsletterService` / `contactService` restent identiques.

---

## ▲ Déploiement Vercel

Le projet est immédiatement déployable :

1. Importer le dépôt dans Vercel (framework détecté : **Vite**).
   - Build command : `npm run build`
   - Output directory : `dist`
2. `vercel.json` est déjà configuré : il réécrit toutes les routes vers
   `index.html` (SPA) **tout en servant directement** `/assets`, `/uploads`,
   `/legacy`, `/data` et les fichiers racine (`robots.txt`, `sitemap.xml`).
3. (Optionnel) Variables d'environnement `VITE_USE_API` / `VITE_API_BASE_URL`
   à renseigner dans les réglages du projet Vercel le jour du branchement API.

Déploiement en ligne de commande :

```bash
npm i -g vercel
vercel            # préversion
vercel --prod     # production
```

---

## 🧩 Composants React réutilisables

Première étape de la reactification (motif strangler-fig) : les éléments de
chrome partagés existent désormais en composants React purs, réutilisables par
toute future page 100 % React.

| Composant | Rôle |
|---|---|
| `components/Navbar.jsx` | barre de navigation (liens actifs, popover langue, drawer mobile, élévation au scroll) |
| `components/Footer.jsx` | pied de page complet (colonnes, liens utilitaires, bascule de langue) |
| `components/NewsletterSection.jsx` | section newsletter câblée sur `newsletterService` |
| `components/AnnouncementBar.jsx` | bandeau d'annonce (fermeture mémorisée par session) |
| `layouts/PublicLayout.jsx` | assemble bandeau + navbar + contenu + footer |
| `i18n/` | `LanguageProvider`, hook `useLanguage`, dictionnaire FR/EN |
| `styles/chrome.css` | design system extrait **verbatim** de l'original (fidélité garantie) |

Ces composants réutilisent les **classes CSS d'origine** : le rendu est identique
au site. La langue est synchronisée avec les pages legacy via `<html lang>` +
`localStorage` (clé `cf-lang`).

➡️ Ils sont **prêts à l'emploi** pour migrer les pages legacy une par une :
créer la page dans `pages/`, l'envelopper dans `PublicLayout`, puis remplacer sa
route dans `App.jsx`.

---

## 🌍 Bilingue FR/EN

Le moteur i18n d'origine (dictionnaire inliné + bascule via le globe de la navbar)
est conservé et fonctionne à l'identique. La langue est mémorisée dans
`localStorage` (`cf-lang`) et persiste entre les pages.
