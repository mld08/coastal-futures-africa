import { LEGACY_PAGES } from './legacyPages';

export const HOME_SLUG = 'index';
export const NOT_FOUND_SLUG = 'pages-erreur';

// Slugs gérés par une page React dédiée au lieu de la page legacy.
// /inscription est ré-ouverte (page d'origine + inscription réelle via le backend) ;
// /inscription-evenement reste temporairement remplacée par une page d'information.
export const OVERRIDDEN_SLUGS = ['inscription-evenement'];

/** Convertit un slug de page en chemin de route. */
export const slugToPath = (slug) => (slug === HOME_SLUG ? '/' : `/${slug}`);

/** Liste des routes [{ slug, path }] dérivée du manifeste des pages. */
export const routes = LEGACY_PAGES.map((slug) => ({
  slug,
  path: slugToPath(slug),
}));
