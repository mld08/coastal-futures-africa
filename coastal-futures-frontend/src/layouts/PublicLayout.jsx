import { Outlet } from 'react-router-dom';
import AnnouncementBar from '../components/AnnouncementBar';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { LanguageProvider } from '../i18n/LanguageProvider';
import '../styles/chrome.css';

/**
 * Layout des pages publiques 100 % React : assemble les composants
 * partagés réutilisables (bandeau, navbar, footer) autour du contenu.
 */
export default function PublicLayout() {
  return (
    <LanguageProvider>
      <AnnouncementBar />
      <Navbar />
      <main id="cf-content">
        <Outlet />
      </main>
      <Footer />
    </LanguageProvider>
  );
}
