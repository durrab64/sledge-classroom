// Application router setup.
//
// Uses React Router with hash-based history so the migrated application keeps
// the legacy URL shape (e.g. #courses, #calendar). AuthProvider wraps the
// router (in main.tsx) so every route can consume auth state.
//
// Feature routes are loaded lazily so the initial payload stays small: the
// home screen does not need the admin, reading-room or calendar bundles. The
// legacy URL shape and route structure are unchanged.

import { RouterProvider, createHashRouter } from 'react-router-dom';
import { normalizeInitialHash } from '@/lib/legacyHash';
import { DefaultLayout } from '@/layouts/default';

// Rewrite a legacy hash (#course-os/lab, #home, ...) before the hash router
// reads `window.location`. `createHashRouter` captures the location when it is
// constructed, so this must run before the call below rather than in main.tsx.
normalizeInitialHash();

export const router = createHashRouter([
  {
    path: '/',
    Component: DefaultLayout,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('@/features/home/home')).HomeRoute,
        }),
      },
      {
        path: 'courses',
        lazy: async () => ({
          Component: (await import('@/features/courses/courses')).CoursesRoute,
        }),
      },
      {
        path: 'courses/:courseId/:category/*',
        lazy: async () => ({
          Component: (await import('@/features/reading-room/reading-room'))
            .ReadingRoomRoute,
        }),
      },
      {
        path: 'courses/:courseId',
        lazy: async () => ({
          Component: (await import('@/features/courses/courses'))
            .CourseDetailRoute,
        }),
      },
      {
        path: 'labs',
        lazy: async () => ({
          Component: (await import('@/features/labs/labs')).LabsRoute,
        }),
      },
      {
        path: 'calendar',
        lazy: async () => ({
          Component: (await import('@/features/calendar/calendar')).CalendarRoute,
        }),
      },
      {
        path: 'reader',
        lazy: async () => ({
          Component: (await import('@/features/reading-room/reading-room'))
            .ReadingRoomIndexRoute,
        }),
      },
      {
        path: 'admin',
        lazy: async () => ({
          Component: (await import('@/features/admin')).AdminRoute,
        }),
      },
      {
        path: 'login',
        lazy: async () => ({
          Component: (await import('@/features/auth/LoginRoute')).LoginRoute,
        }),
      },
      {
        path: 'migration/not-found',
        lazy: async () => ({
          Component: (await import('@/features/not-found/not-found')).NotFoundRoute,
        }),
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('@/features/not-found/not-found')).NotFoundRoute,
        }),
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
