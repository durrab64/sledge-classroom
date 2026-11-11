// Home route — migration scaffolding.
//
// This is a placeholder route, not a migrated legacy page. It preserves the
// route path (/ ) and visual language for the incremental migration.

import { PlaceholderRoute } from '@/components/PlaceholderRoute';

export function HomeRoute() {
  return (
    <PlaceholderRoute
      feature="Home"
      note="Course catalogue, upcoming events preview, and course filter bar will be migrated here."
    />
  );
}
