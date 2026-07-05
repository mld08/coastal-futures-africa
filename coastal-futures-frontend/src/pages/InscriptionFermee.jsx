import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewsletterSection from '../components/NewsletterSection';
import { useLanguage } from '../i18n/useLanguage';

/**
 * Page d'information « bientôt disponible » réutilisable.
 * Remplace temporairement un parcours non encore ouvert (création de compte,
 * inscription aux événements…). Conçue avec le design system (mesh, type scale,
 * boutons), bilingue, via PublicLayout (navbar + footer partagés).
 *
 * @param {{ variant?: 'account' | 'event' }} props
 */

const COPY = {
  account: {
    fr: {
      title: 'Coastal Futures | Inscriptions bientôt disponibles',
      kicker: 'Inscriptions',
      h1: 'Les inscriptions ouvriront bientôt',
      lead:
        "La plateforme Coastal Futures Network vient d'être lancée. La création de compte n'est pas encore ouverte : elle le sera prochainement, en même temps que le premier appel à candidatures.",
      points: [
        { icon: 'ti-calendar-event', t: 'Ouverture prochaine', d: 'Les inscriptions seront activées dans les prochaines semaines.' },
        { icon: 'ti-bell', t: 'Soyez prévenu·e', d: "Abonnez-vous à la newsletter ci-dessous pour être informé·e dès l'ouverture." },
        { icon: 'ti-compass', t: 'En attendant', d: "Explorez le programme, l'écosystème et les pays d'intervention." },
      ],
      buttons: [
        { to: '/a-propos', label: 'Découvrir le programme', primary: true },
        { to: '/appels-candidatures', label: 'Appels à candidatures' },
        { to: '/contact', label: 'Nous contacter' },
      ],
    },
    en: {
      title: 'Coastal Futures | Registrations open soon',
      kicker: 'Registrations',
      h1: 'Registrations open soon',
      lead:
        'The Coastal Futures Network platform has just launched. Account creation is not open yet: it will be available shortly, alongside the first call for applications.',
      points: [
        { icon: 'ti-calendar-event', t: 'Opening soon', d: 'Registrations will be activated in the coming weeks.' },
        { icon: 'ti-bell', t: 'Get notified', d: 'Subscribe to the newsletter below to be informed as soon as it opens.' },
        { icon: 'ti-compass', t: 'In the meantime', d: 'Explore the programme, the ecosystem and the countries of operation.' },
      ],
      buttons: [
        { to: '/a-propos', label: 'Discover the programme', primary: true },
        { to: '/appels-candidatures', label: 'Calls for applications' },
        { to: '/contact', label: 'Contact us' },
      ],
    },
  },
  event: {
    fr: {
      title: 'Coastal Futures | Inscription aux événements bientôt disponible',
      kicker: 'Événements',
      h1: "L'inscription aux événements ouvrira bientôt",
      lead:
        "Coastal Futures Network vient d'être lancé. L'inscription en ligne aux événements n'est pas encore ouverte : elle le sera très prochainement. En attendant, découvrez l'agenda du programme.",
      points: [
        { icon: 'ti-calendar-event', t: 'Ouverture prochaine', d: "L'inscription aux événements sera activée dans les prochaines semaines." },
        { icon: 'ti-bell', t: 'Soyez prévenu·e', d: 'Abonnez-vous à la newsletter pour connaître les prochaines dates et leur ouverture.' },
        { icon: 'ti-calendar', t: 'En attendant', d: "Consultez l'agenda et le détail des événements à venir." },
      ],
      buttons: [
        { to: '/evenements', label: 'Voir les événements', primary: true },
        { to: '/a-propos', label: 'Découvrir le programme' },
        { to: '/contact', label: 'Nous contacter' },
      ],
    },
    en: {
      title: 'Coastal Futures | Event registration open soon',
      kicker: 'Events',
      h1: 'Event registration opens soon',
      lead:
        "Coastal Futures Network has just launched. Online event registration is not open yet: it will be available very soon. In the meantime, explore the programme agenda.",
      points: [
        { icon: 'ti-calendar-event', t: 'Opening soon', d: 'Event registration will be activated in the coming weeks.' },
        { icon: 'ti-bell', t: 'Get notified', d: 'Subscribe to the newsletter to hear about upcoming dates and their opening.' },
        { icon: 'ti-calendar', t: 'In the meantime', d: 'Browse the agenda and the details of upcoming events.' },
      ],
      buttons: [
        { to: '/evenements', label: 'See the events', primary: true },
        { to: '/a-propos', label: 'Discover the programme' },
        { to: '/contact', label: 'Contact us' },
      ],
    },
  },
};

export default function InscriptionFermee({ variant = 'account' }) {
  const { lang } = useLanguage();
  const set = COPY[variant] || COPY.account;
  const t = set[lang] || set.fr;

  useEffect(() => {
    document.title = t.title;
  }, [t.title]);

  return (
    <>
      <header className="cf-mesh-surface" style={{ padding: '92px 0 72px' }}>
        <div className="cf-mesh" />
        <div className="wrap" style={{ position: 'relative', textAlign: 'center' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'rgba(62,203,176,.16)',
              border: '1px solid rgba(255,255,255,.18)',
              color: 'var(--teal-bright)',
              fontSize: 32,
              marginBottom: 22,
            }}
          >
            <i className="ti ti-hourglass-high" />
          </span>
          <div className="kicker" style={{ color: 'var(--teal-bright)', marginBottom: 12 }}>
            {t.kicker}
          </div>
          <h1 className="display-xl" style={{ color: '#fff', maxWidth: 640, margin: '0 auto' }}>
            {t.h1}
          </h1>
          <p
            className="lead"
            style={{ color: 'rgba(255,255,255,.82)', maxWidth: 600, margin: '20px auto 0' }}
          >
            {t.lead}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: 30,
            }}
          >
            {t.buttons.map((b) => (
              <Link key={b.to + b.label} to={b.to} className={`btn btn-lg ${b.primary ? 'btn-light' : 'btn-glass'}`}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <section style={{ background: 'var(--canvas)', padding: '64px 0' }}>
        <div
          className="wrap"
          style={{
            display: 'grid',
            gap: 24,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {t.points.map((p) => (
            <div
              key={p.icon + p.t}
              style={{
                background: 'var(--canvas-soft)',
                border: '1px solid var(--hair)',
                borderRadius: 'var(--r-lg)',
                padding: '26px 24px',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--teal-bg)',
                  color: 'var(--teal)',
                  fontSize: 22,
                  marginBottom: 14,
                }}
              >
                <i className={`ti ${p.icon}`} />
              </span>
              <h3 className="display-sm" style={{ margin: '0 0 6px' }}>
                {p.t}
              </h3>
              <p className="body-sm" style={{ margin: 0 }}>
                {p.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
