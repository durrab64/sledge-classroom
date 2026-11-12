import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import './styles/legacy-home-courses.css';
import './styles/legacy-labs-calendar.css';
import './styles/legacy-reading-room.css';
import './styles/cp6-supplement.css';
import './styles/cp9-global.css';
import { AuthProvider } from '@/contexts';
import { GlobalExperienceProvider } from '@/features/global/GlobalExperienceContext';
import { Router } from './app/router';
import { installLegacyHashBridge } from '@/lib/legacyHash';

// Legacy hash normalization runs in `app/router.tsx` before the router is
// constructed. This listener handles legacy links clicked after mount.
installLegacyHashBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <GlobalExperienceProvider>
        <Router />
      </GlobalExperienceProvider>
    </AuthProvider>
  </React.StrictMode>,
);
