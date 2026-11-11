// Shared layout wrapper. Provides the page shell (max-width container,
// card surface) that migrated pages will adopt. Intentionally minimal in
// CP3; navigation chrome will be added as features are migrated.

import { Outlet } from 'react-router-dom';

export function DefaultLayout() {
  return (
    <div className="min-h-sledge-surface">
      <Outlet />
    </div>
  );
}
