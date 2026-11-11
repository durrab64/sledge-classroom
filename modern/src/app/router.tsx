// Application router setup.
//
// Uses React Router with hash-based history so the migrated application keeps
// the legacy URL shape (e.g. #courses, #calendar). AuthProvider wraps the
// router (in main.tsx) so every route can consume auth state.
//
// Every route renders a PlaceholderRoute until the corresponding feature is
// migrated in later checkpoints.

import { RouterProvider, createHashRouter } from 'react-router-dom';
import { DefaultLayout } from '@/layouts/default';
import {
  HomeRoute,
  CoursesRoute,
  LabsRoute,
  CalendarRoute,
  ReadingRoomRoute,
  NotFoundRoute,
} from '@/features';
import { LoginRoute } from '@/features/auth';

export const router = createHashRouter([
  {
    path: '/',
    Component: DefaultLayout,
    children: [
      { index: true, Component: HomeRoute },
      { path: 'courses', Component: CoursesRoute },
      { path: 'labs', Component: LabsRoute },
      { path: 'calendar', Component: CalendarRoute },
      { path: 'reader', Component: ReadingRoomRoute },
      { path: 'login', Component: LoginRoute },
      { path: 'migration/not-found', Component: NotFoundRoute },
      { path: '*', Component: NotFoundRoute },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
