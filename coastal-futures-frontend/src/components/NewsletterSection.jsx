import { useState } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { subscribe, NewsletterError } from '../services/newsletterService';

/**
 * Section newsletter — version 100 % React.
 * Réutilise les classes `.cf-news` d'origine (style identique) et route
 * l'inscription via la couche services (newsletterService).
 */
export default function NewsletterSection() {
  const { lang, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState({ type: null, msg: '' }); // type: 'ok' | 'err'

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await subscribe(email, lang);
      setFeedback({ type: 'ok', msg: t('news.ok') });
      setEmail('');
    } catch (err) {
      if (err.code === NewsletterError.ALREADY_SUBSCRIBED) {
        setFeedback({ type: 'ok', msg: t('news.already') });
        setEmail('');
      } else if (err.code === NewsletterError.INVALID_EMAIL) {
        setFeedback({ type: 'err', msg: t('news.err') });
      } else {
        setFeedback({ type: 'err', msg: t('news.fail') });
      }
    }
  };

  return (
    <section className="cf-news" id="cf-news">
      <div className="cf-news-in">
        <div className="cf-news-txt">
          <div className="cf-news-k">{t('news.k')}</div>
          <h2>{t('news.h')}</h2>
          <p>{t('news.p')}</p>
        </div>
        <form className="cf-news-form" onSubmit={onSubmit} noValidate>
          <div className="cf-news-row">
            <label className="sr-only" htmlFor="cfnEmail">{t('news.label')}</label>
            <input
              type="email"
              id="cfnEmail"
              autoComplete="email"
              placeholder={t('news.ph')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="cf-news-btn">
              {t('news.b')} <i className="ti ti-arrow-right" />
            </button>
          </div>
          <p className="cf-news-priv" dangerouslySetInnerHTML={{ __html: t('news.priv') }} />
          <div className={`cf-news-err${feedback.type === 'err' ? ' show' : ''}`}>{feedback.type === 'err' ? feedback.msg : ''}</div>
          <div className={`cf-news-ok${feedback.type === 'ok' ? ' show' : ''}`}>
            {feedback.type === 'ok' ? <><i className="ti ti-circle-check" />{feedback.msg}</> : ''}
          </div>
        </form>
      </div>
    </section>
  );
}
