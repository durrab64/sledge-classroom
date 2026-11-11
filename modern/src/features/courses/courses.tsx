// Courses route — migration scaffolding.
//
// Placeholder route, not a migrated legacy page. Preserves the route path
// (/courses) for the incremental migration.

import { PlaceholderRoute } from '@/components/PlaceholderRoute';

export function CoursesRoute() {
  return (
    <PlaceholderRoute
      feature="Courses"
      note="Course directory, filter pills, search, sort, and per-category upload buttons will be migrated here."
    />
  );
}
