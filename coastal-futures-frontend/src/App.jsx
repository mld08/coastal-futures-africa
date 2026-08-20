import { Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import PublicLayout from './layouts/PublicLayout';
import LegacyPage from './components/LegacyPage';
import PtfRoute from './components/PtfRoute';
import InscriptionFermee from './pages/InscriptionFermee';
import { routes, NOT_FOUND_SLUG, slugToPath, OVERRIDDEN_SLUGS } from './routes';

const overridden = new Set(OVERRIDDEN_SLUGS);

// Pages de l'espace bailleurs protégées par PtfRoute
const PTF_PROTECTED = new Set([
  'tableau-de-bord-partenaire',
  'impact-par-pays',
  'analyses-bailleur',
  'aide-reporting',
  'espace-partenaire',
  'espace-parametres-partenaire',
]);

export default function App() {
  return (
    <Routes>
      {/* Pages React dédiées (PublicLayout = navbar + footer partagés) */}
      <Route element={<PublicLayout />}>
        {/* /inscription est ré-ouverte : rendue par la page legacy (branchée sur
            le backend). Seule l'inscription aux événements reste fermée. */}
        <Route path="/inscription-evenement" element={<InscriptionFermee variant="event" />} />
      </Route>

      <Route element={<RootLayout />}>
        {/* Une route par page d'origine (hors pages surchargées en React) */}
        {routes
          .filter(({ slug }) => !overridden.has(slug))
          .map(({ slug, path }) => (
            <Route
              key={slug}
              path={path}
              element={
                PTF_PROTECTED.has(slug)
                  ? <PtfRoute><LegacyPage slug={slug} /></PtfRoute>
                  : <LegacyPage slug={slug} />
              }
            />
          ))}

        {/* Compatibilité : les anciens liens en /xxx.html redirigent vers /xxx */}
        {routes.map(({ slug }) =>
          slug === 'index' ? null : (
            <Route
              key={`${slug}.html`}
              path={`/${slug}.html`}
              element={<Navigate to={slugToPath(slug)} replace />}
            />
          ),
        )}
        <Route path="/index.html" element={<Navigate to="/" replace />} />

        {/* 404 : on réutilise la page d'erreur d'origine */}
        <Route path="*" element={<LegacyPage slug={NOT_FOUND_SLUG} />} />
      </Route>
    </Routes>
  );
}
