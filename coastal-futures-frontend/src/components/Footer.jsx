import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';

const COLS = [
  {
    h: 'ft.h1',
    links: [
      ['/a-propos', 'ft.about'],
      ['/carte-impact', 'ft.map'],
      ['/actualites', 'ft.news'],
      ['/evenements', 'ft.events'],
      ['/appels-candidatures', 'ft.calls'],
      ['/parcours-entrepreneur', 'ft.parcours'],
    ],
  },
  {
    h: 'ft.h2',
    links: [
      ['/ecosysteme', 'ft.eco'],
      ['/annuaire-entrepreneurs', 'ft.dent'],
      ['/annuaire-mentors', 'ft.dmen'],
      ['/carte-impact', 'ft.countries'],
    ],
  },
  {
    h: 'ft.h3',
    links: [
      ['/mediatheque', 'ft.media'],
      ['/bibliotheque', 'ft.research'],
      ['/methodologie-indicateurs', 'ft.method'],
      ['/contact', 'ft.press'],
    ],
  },
  {
    h: 'ft.h4',
    links: [
      ['/a-propos', 'ft.iag'],
      ['/a-propos', 'ft.partners'],
      ['/contact', 'ft.contact'],
      ['/plan-du-site', 'ft.sitemap'],
    ],
  },
];

const UTIL_LINKS = [
  ['/plan-du-site', 'ft.sitemap'],
  ['/confidentialite', 'ft.privacy'],
  ['/declaration-accessibilite', 'ft.access'],
  ['/mentions-legales', 'ft.legal'],
  ['/contact', 'ft.contact'],
  ['/connexion-bailleur', 'ft.donorarea'],
];

export default function Footer() {
  const { lang, toggleLang, t } = useLanguage();

  return (
    <footer className="footer">
      <div className="cf-mesh" />
      <div className="cf-coastline cf-coastline--top" aria-hidden="true">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path pathLength="1" d="M-10,70 C80,62 140,50 196,52 C236,53 256,76 300,78 C356,81 392,54 458,58 C540,63 586,98 668,94 C730,91 772,62 850,65 C946,69 998,104 1092,98 C1166,93 1212,64 1296,68 C1372,71 1418,96 1452,90" />
        </svg>
      </div>

      <div className="footer-top">
        <div className="footer-brand">
          <img decoding="async" width="1310" height="188" src="/assets/logos/logo-horizontal-dark.svg" alt="Coastal Futures Network" />
          <p className="footer-mission">{t('ft.brand')}</p>
          <p className="footer-affil" style={{ color: 'rgba(255,255,255,.85)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13.5px', margin: '14px 0 0' }}>
            {t('ft.affil')}
          </p>
          <a className="footer-email" href="mailto:contact@africagovernanceinstitute.org" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--teal-bright)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, marginTop: 18 }}>
            <i className="ti ti-mail" />contact@africagovernanceinstitute.org
          </a>
        </div>

        <div className="footer-cols">
          {COLS.map((col) => (
            <div className="footer-col" key={col.h}>
              <h3>{t(col.h)}</h3>
              {col.links.map(([to, key], i) => (
                <Link to={to} key={`${col.h}-${key}-${i}`}>{t(key)}</Link>
              ))}
            </div>
          ))}
          <div className="footer-col">
            <h3>{t('ft.h5')}</h3>
            <span role="button" tabIndex={0}>LinkedIn</span>
            <span role="button" tabIndex={0}>X (Twitter)</span>
            <span role="button" tabIndex={0}>YouTube</span>
            <Link to="/contact" className="fnews" dangerouslySetInnerHTML={{ __html: t('ft.newsletter') }} />
          </div>
        </div>
      </div>

      <div className="footer-util">
        {UTIL_LINKS.map(([to, key], i) => (
          <Link to={to} key={`${key}-${i}`}>{t(key)}</Link>
        ))}
      </div>

      <div className="footer-base">
        <span className="caption">{t('ft.copy')}</span>
        <button className="cf-langtog" type="button" aria-label="Choisir la langue, français ou anglais" onClick={toggleLang}>
          <i className="ti ti-world" />
          <span className="cf-seg">
            <b className={`l-fr${lang === 'fr' ? ' on' : ''}`}>FR</b>
            <span className="l-sep">/</span>
            <b className={`l-en${lang === 'en' ? ' on' : ''}`}>EN</b>
          </span>
        </button>
      </div>
    </footer>
  );
}
