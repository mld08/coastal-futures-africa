/* ============================================================
   Coastal Futures — chargeur de pages "legacy"
   ------------------------------------------------------------
   La migration suit le motif "strangler-fig" : le site React
   sert de coquille (routing, services, hooks) et rend chaque
   page d'origine telle quelle (HTML + CSS inliné + scripts),
   ce qui garantit un rendu pixel-perfect identique à l'original
   pour les 100+ écrans, tout en restant une vraie application
   React + React Router + couche services.

   Ce module se charge de :
   1. récupérer le document HTML d'origine ;
   2. injecter ses <style> et <link> spécifiques à la page ;
   3. injecter le markup du <body> ;
   4. ré-exécuter ses <script> dans l'ordre (en attendant les
      scripts externes comme Leaflet avant de poursuivre).
   ============================================================ */

// Feuilles de style déjà chargées globalement (voir index.html) :
// inutile de les ré-injecter par page.
const GLOBAL_STYLESHEETS = [
  'cf-fonts.css',
  'cf-icons.css',
  'cf-nav.css',
  'leaflet.css',
];

// Le HTML d'origine ne change jamais : on met en cache le texte brut.
const htmlCache = new Map();

export async function fetchLegacyHtml(slug) {
  if (htmlCache.has(slug)) return htmlCache.get(slug);
  const res = await fetch(`/legacy/${slug}.html`, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`Page introuvable : ${slug} (HTTP ${res.status})`);
  }
  const html = await res.text();
  htmlCache.set(slug, html);
  return html;
}

export function parseLegacyHtml(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function isGlobalStylesheet(href) {
  return GLOBAL_STYLESHEETS.some((name) => href.includes(name));
}

// Les scripts liés au formulaire newsletter sont volontairement neutralisés :
// le contrôleur React (newsletterController) reprend ce formulaire pour le
// router à travers la couche services.
function isNewsletterScript(scriptEl) {
  if (scriptEl.src) return false;
  const text = scriptEl.textContent || '';
  return text.includes('cfnForm');
}

// Script inline qui construit le drawer mobile sombre moderne (#cfMdrawer).
function isModernDrawerScript(scriptEl) {
  if (scriptEl.src) return false;
  return (scriptEl.textContent || '').includes('cfMdrawer');
}

// Guard d'authentification PTF : redirige via window.location.replace vers
// connexion-bailleur.html. Dans le contexte React Router, ce rechargement
// plein casse la navigation SPA. On neutralise le script ici et on délègue
// la protection à <PtfRoute> au niveau des routes React.
function isPtfGuardScript(scriptEl) {
  return scriptEl.id === 'cf-ptf-guard';
}

function isExecutableScript(scriptEl) {
  const type = (scriptEl.getAttribute('type') || '').toLowerCase();
  return (
    type === '' ||
    type === 'text/javascript' ||
    type === 'module' ||
    type === 'application/javascript'
  );
}

function runScript(oldScript, container) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    for (const attr of oldScript.attributes) {
      s.setAttribute(attr.name, attr.value);
    }
    if (oldScript.src) {
      // .src est résolu en URL absolue contre la page courante (routes plates).
      s.src = oldScript.src;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      container.appendChild(s);
    } else {
      s.textContent = oldScript.textContent;
      container.appendChild(s);
      resolve();
    }
  });
}

/**
 * Monte une page legacy dans `container`.
 * @param {HTMLElement} container
 * @param {Document} doc  document parsé
 * @param {{ isCancelled?: () => boolean }} [opts]
 */
export async function mountLegacyPage(container, doc, opts = {}) {
  const isCancelled = opts.isCancelled || (() => false);

  container.innerHTML = '';

  // 1) feuilles de style propres à la page (head) non chargées globalement
  doc.head
    .querySelectorAll('link[rel="stylesheet"]')
    .forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!isGlobalStylesheet(href)) {
        container.appendChild(link.cloneNode(true));
      }
    });

  // 2) <style> inline du head (contient notamment le design system)
  doc.head.querySelectorAll('style').forEach((style) => {
    container.appendChild(style.cloneNode(true));
  });

  // Certaines pages embarquent DEUX drawers mobiles : l'ancien drawer blanc
  // (#cfMob, ouvert par cf-nav.js) ET un drawer sombre construit dynamiquement
  // par le script inline cf-mobnav-js (#cfMdrawer). Les deux s'ouvrent sur le
  // même burger. On uniformise sur le DRAWER BLANC partout : si la page possède
  // #cfMob, on neutralise le script qui construit le drawer sombre (étape 4).
  // Les rares pages sans #cfMob conservent le drawer sombre (pour garder un menu).
  const hasWhiteDrawer = !!doc.body.querySelector('#cfMob');

  // 3) markup du body (les <style> inline du body sont conservés ;
  //    les <script> inertes sont retirés puis ré-exécutés à l'étape 4)
  const bodyWrap = document.createElement('div');
  bodyWrap.innerHTML = doc.body.innerHTML;
  bodyWrap.querySelectorAll('script').forEach((s) => s.remove());
  while (bodyWrap.firstChild) {
    container.appendChild(bodyWrap.firstChild);
  }

  // 4) ré-exécution des scripts, dans l'ordre du document (head puis body)
  const scripts = [
    ...doc.head.querySelectorAll('script'),
    ...doc.body.querySelectorAll('script'),
  ];
  for (const old of scripts) {
    if (isCancelled()) return;
    if (!isExecutableScript(old)) continue; // ignore ld+json, importmap…
    if (isNewsletterScript(old)) continue; // géré par newsletterController
    if (hasWhiteDrawer && isModernDrawerScript(old)) continue; // drawer blanc partout
    if (isPtfGuardScript(old)) continue; // protection déléguée à <PtfRoute>
    await runScript(old, container);
  }
}
