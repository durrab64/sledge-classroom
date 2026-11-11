// Not-found route — migration scaffolding.

import { PlaceholderRoute } from '@/components/PlaceholderRoute';

export function NotFoundRoute() {
  return (
    <PlaceholderRoute
      feature="Not Found"
      note="The requested route does not exist in the migration scaffold."
    />
  );
}
