// Reading Room route — migration scaffolding.
//
// Placeholder route, not a migrated legacy page. Preserves the route path
// (/reader) for the incremental migration.

import { PlaceholderRoute } from '@/components/PlaceholderRoute';

export function ReadingRoomRoute() {
  return (
    <PlaceholderRoute
      feature="Reading Room"
      note="Individual resource view with preview facade and focus management will be migrated here."
    />
  );
}
