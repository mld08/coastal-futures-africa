import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { useScrollElevation } from '../hooks/useScrollElevation';

const NAV_LINKS = [
  { to: '/a-propos', key: 'nav.prog' },
  { to: '/carte-impact', key: 'nav.map' },
  { to: '/ecosysteme', key: 'nav.eco' },
  { to: '/actualites', key: 'nav.res' },
  { to: '/contact', key: 'nav.contact' },
];

const LOGO = '/assets/logos/logo-horizontal-light.svg';

export default function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const elevated = useScrollElevation();
  const [langOpen, setLangOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const globeRef = useRef(null);
  const popRef = useRef(null);

  // Ferme le popover langue au clic extérieur / Échap.
  useEffect(() => {
    if (!langOpen) return undefined;
    const onClick = (e) => {
      if (
        popRef.current && !popRef.current.contains(e.target) &&
        globeRef.current && !globeRef.current.contains(e.target)
      ) {
        setLangOpen(false);
      }
    };
    const onKey = (e) => e.key === 'Escape' && setLangOpen(false);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  // Verrouille le scroll du body quand le drawer est ouvert.
  useEffect(() => {
    document.body.classList.toggle('cf-noscroll', drawerOpen);
    return () => document.body.classList.remove('cf-noscroll');
  }, [drawerOpen]);

  const pickLang = (l) => {
    setLang(l);
    setLangOpen(false);
  };

  return (
    <>
      <div className="nav-outer">
        <nav className={`cf-nav${elevated ? ' scrolled' : ''}`} id="cfNav">
          <div className="nav-inner">
            <button
              className="cf-burger"
              aria-label="Menu"
              aria-expanded={drawerOpen}
              type="button"
              onClick={() => setDrawerOpen(true)}
            >
              <i className="ti ti-menu-2" />
            </button>

            <Link className="brand" to="/">
              <img decoding="async" width="1310" height="188" src={LOGO} alt="Coastal Futures Network" />
            </Link>

            <div className="nav-links">
              {NAV_LINKS.map(({ to, key }) => (
                <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'on' : undefined)}>
                  {t(key)}
                </NavLink>
              ))}
            </div>

            <div className="nav-r">
              <Link to="/recherche" className="nav-icn" aria-label={t('nav.search')}>
                <i className="ti ti-search" />
              </Link>

              <div className="nav-glob-wrap">
                <button
                  ref={globeRef}
                  className={`nav-glob${langOpen ? ' on' : ''}`}
                  type="button"
                  aria-label="Langue · Language"
                  aria-haspopup="true"
                  aria-expanded={langOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLangOpen((v) => !v);
                  }}
                >
                  <i className="ti ti-world" />
                </button>
                <div ref={popRef} className="lang-pop" hidden={!langOpen} role="listbox" aria-label="Choisir la langue">
                  {['fr', 'en'].map((l) => (
                    <button
                      key={l}
                      className={`lang-opt${lang === l ? ' active' : ''}`}
                      type="button"
                      role="option"
                      aria-selected={lang === l}
                      onClick={() => pickLang(l)}
                    >
                      <span className="lang-name">{l === 'fr' ? 'Français' : 'English'}</span>
                      <i className="ti ti-check lc" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>

              <Link to="/connexion" className="nav-cta">{t('nav.espace')}</Link>
            </div>
          </div>
        </nav>
      </div>

      {/* Drawer mobile */}
      <div className={`cf-mob${drawerOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Navigation">
        <div className="mob-head">
          <Link className="brand" to="/" onClick={() => setDrawerOpen(false)}>
            <img decoding="async" src={LOGO} alt="Coastal Futures Network" style={{ height: 28, width: 'auto' }} />
          </Link>
          <button className="mob-x" type="button" aria-label="Fermer" onClick={() => setDrawerOpen(false)}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="mob-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : undefined)} onClick={() => setDrawerOpen(false)}>
            <i className="ti ti-home" /><span>{t('nav.home')}</span>
          </NavLink>
          {NAV_LINKS.map(({ to, key }, i) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'on' : undefined)} onClick={() => setDrawerOpen(false)}>
              <i className={`ti ${['ti-info-circle', 'ti-map-2', 'ti-plant-2', 'ti-news', 'ti-mail'][i]}`} />
              <span>{t(key)}</span>
            </NavLink>
          ))}
          <div className="mob-sep" />
          <div className="mob-sec">{t('nav.section.institut')}</div>
          <Link to="/a-propos" onClick={() => setDrawerOpen(false)}><i className="ti ti-heart-handshake" /><span>{t('util.partners')}</span></Link>
          <Link to="/mediatheque" onClick={() => setDrawerOpen(false)}><i className="ti ti-photo" /><span>{t('util.press')}</span></Link>
          <Link to="/plan-du-site" onClick={() => setDrawerOpen(false)}><i className="ti ti-sitemap" /><span>{t('util.sitemap')}</span></Link>
        </div>
        <div className="mob-foot">
          <div className="mob-lang">
            {['fr', 'en'].map((l) => (
              <button key={l} type="button" className={lang === l ? 'active' : undefined} onClick={() => setLang(l)}>
                {l === 'fr' ? 'Français' : 'English'}
              </button>
            ))}
          </div>
          <Link to="/connexion" className="mob-cta" onClick={() => setDrawerOpen(false)}>
            <i className="ti ti-user-circle" /><span>{t('nav.espace')}</span>
          </Link>
        </div>
      </div>
      <div className={`cf-scrim${drawerOpen ? ' show' : ''}`} onClick={() => setDrawerOpen(false)} />
    </>
  );
}
