import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { slugToPath } from '../routes';

/**
 * Les pages legacy contiennent des liens internes en `xxx.html`.
 * On intercepte ces clics pour naviguer via React Router (SPA),
 * en conservant query string et ancre. Les liens externes,
 * mailto:, tel:, #ancre et target=_blank sont laissés intacts.
 */
export default function LinkInterceptor() {
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = e.target.closest && e.target.closest('a[href]');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) return;

      const match = href.match(/^\.?\/?([a-z0-9-]+)\.html(\?[^#]*)?(#.*)?$/i);
      if (!match) return;

      e.preventDefault();
      const [, slug, query = '', hash = ''] = match;
      navigate(`${slugToPath(slug)}${query}${hash}`);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);

  return null;
}
