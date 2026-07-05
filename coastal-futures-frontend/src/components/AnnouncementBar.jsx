import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';

const DISMISS_KEY = 'cf-ann-dismissed';

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export default function AnnouncementBar() {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="cf-annbar" id="cfAnn">
      <div className="wrap">
        <i className="ti ti-calendar-event cf-annicon" aria-hidden="true" />
        <span className="cf-anntxt">
          <span className="ann-full" dangerouslySetInnerHTML={{ __html: t('ann.txt') }} />
          <span className="ann-short">{t('ann.short')}</span>
        </span>
        <span className="cf-annlinks">
          <Link to="/evenement" dangerouslySetInnerHTML={{ __html: t('ann.see') }} />
        </span>
        <button className="cf-annx" type="button" aria-label={t('ann.close')} onClick={close}>
          <i className="ti ti-x" />
        </button>
      </div>
    </div>
  );
}
