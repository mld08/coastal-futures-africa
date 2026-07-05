import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { installLegacyApiBridge } from './services/legacyBridge';
import './styles/global.css';

// Expose window.CFApi aux pages legacy (connexion, candidature…) avant le rendu.
installLegacyApiBridge();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
