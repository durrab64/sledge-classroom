// Application router setup.
//
// Uses React Router with hash-based history so the migrated application keeps
// the legacy URL shape (e.g. #courses, #calendar). The router is rendered
// inside DefaultLayout by main.tsx.
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
      { path: 'migration/not-found', Component: NotFoundRoute },
      { path: '*', Component: NotFoundRoute },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
