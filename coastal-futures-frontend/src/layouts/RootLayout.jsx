import { Outlet } from 'react-router-dom';
import LinkInterceptor from '../components/LinkInterceptor';

/**
 * Layout racine. Chaque page legacy embarque déjà sa propre navbar
 * et son footer ; le layout se contente donc de la mécanique commune
 * (interception des liens internes pour la navigation SPA).
 */
export default function RootLayout() {
  return (
    <>
      <LinkInterceptor />
      <Outlet />
    </>
  );
}
