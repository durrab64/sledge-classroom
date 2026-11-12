// Shared layout shell: fixed navbar, routed page content, and footer.
// Page sections supply their own `.page` wrappers so legacy page styles
// (#page-home, #page-courses) keep applying.

import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { GlobalExperience } from '@/features/global/GlobalExperience';

export function DefaultLayout() {
  return (
    <div className="min-h-sledge-surface">
      <Navbar />
      <main className="main-content" id="main-content">
        <Outlet />
      </main>
      <Footer />
      <GlobalExperience />
    </div>
  );
}
