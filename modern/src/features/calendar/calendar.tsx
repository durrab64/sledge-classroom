// Calendar route — migration scaffolding.
//
// Placeholder route, not a migrated legacy page. Preserves the route path
// (/calendar) for the incremental migration.

import { PlaceholderRoute } from '@/components/PlaceholderRoute';

export function CalendarRoute() {
  return (
    <PlaceholderRoute
      feature="Calendar"
      note="Monthly calendar grid and day-events panel will be migrated here."
    />
  );
}
