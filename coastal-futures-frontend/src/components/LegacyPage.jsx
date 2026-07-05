import { useLegacyPage } from '../hooks/useLegacyPage';

/**
 * Rend une page d'origine (HTML + CSS inliné + scripts) à l'identique.
 * Sert de pont entre React Router et le contenu legacy pixel-perfect.
 */
export default function LegacyPage({ slug }) {
  const { ref, status } = useLegacyPage(slug);

  return (
    <>
      {status === 'error' && (
        <div className="cf-legacy-error">
          <p>Cette page n’a pas pu être chargée.</p>
        </div>
      )}
      <div ref={ref} className="cf-legacy-root" data-legacy={slug} />
    </>
  );
}
