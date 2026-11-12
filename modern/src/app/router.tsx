// Application router setup.
//
// Uses React Router with hash-based history so the migrated application keeps
// the legacy URL shape (e.g. #courses, #calendar). AuthProvider wraps the
// router (in main.tsx) so every route can consume auth state.
//
// Every route renders a PlaceholderRoute until the corresponding feature is
// migrated in later checkpoints.

import { RouterProvider, createHashRouter } from 'react-router-dom';
import { normalizeInitialHash } from '@/lib/legacyHash';
import { DefaultLayout } from '@/layouts/default';
import {
  HomeRoute,
  CoursesRoute,
  CourseDetailRoute,
  LabsRoute,
  CalendarRoute,
  ReadingRoomRoute,
  ReadingRoomIndexRoute,
  AdminRoute,
  NotFoundRoute,
} from '@/features';
import { LoginRoute } from '@/features/auth';

// Rewrite a legacy hash (#course-os/lab, #home, ...) before the hash router
// reads `window.location`. `createHashRouter` captures the location when it is
// constructed, so this must run before the call below rather than in main.tsx.
normalizeInitialHash();

export const router = createHashRouter([
  {
    path: '/',
    Component: DefaultLayout,
    children: [
      { index: true, Component: HomeRoute },
      { path: 'courses', Component: CoursesRoute },
      { path: 'courses/:courseId/:category/*', Component: ReadingRoomRoute },
      { path: 'courses/:courseId', Component: CourseDetailRoute },
      { path: 'labs', Component: LabsRoute },
      { path: 'calendar', Component: CalendarRoute },
      { path: 'reader', Component: ReadingRoomIndexRoute },
      { path: 'admin', Component: AdminRoute },
      { path: 'login', Component: LoginRoute },
      { path: 'migration/not-found', Component: NotFoundRoute },
      { path: '*', Component: NotFoundRoute },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
