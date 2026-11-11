// Labs route — migration scaffolding.
//
// Placeholder route, not a migrated legacy page. Preserves the route path
// (/labs) for the incremental migration.

import { PlaceholderRoute } from '@/components/PlaceholderRoute';

export function LabsRoute() {
  return (
    <PlaceholderRoute
      feature="Labs"
      note="Bench directory and lab cards will be migrated here."
    />
  );
}
