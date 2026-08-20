import { Navigate } from 'react-router-dom';

function isPtfAuthenticated() {
  try {
    return localStorage.getItem('cf-ptf-auth') === '1';
  } catch {
    return false;
  }
}

/**
 * Protège les pages de l'espace bailleurs PTF.
 * Redirige vers /connexion-bailleur si non authentifié —
 * remplace le cf-ptf-guard inline neutralisé dans legacyLoader.
 */
export default function PtfRoute({ children }) {
  if (!isPtfAuthenticated()) {
    return <Navigate to="/connexion-bailleur" replace />;
  }
  return children;
}
