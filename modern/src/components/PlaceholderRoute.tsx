// Migration scaffolding placeholder — not a migrated page.
//
// This component is intentionally minimal and clearly marked so that it is
// not mistaken for a finished feature. The real Reading Room, Courses, Labs,
// and Calendar implementations will replace these in later checkpoints.

import { Link } from 'react-router-dom';

export function PlaceholderRoute({
  feature,
  note = 'This route is migration scaffolding and not yet implemented.',
}: {
  feature: string;
  note?: string;
}) {
  return (
    <div className="sledge-page">
      <div className="sledge-card">
        <h1 className="text-4xl font-heading mb-2">{feature}</h1>
        <p className="text-sledge-muted">{note}</p>
        <p className="mt-2 text-xs text-sledge-muted">
          Status: <span className="font-mono">planned</span>
        </p>
        <nav className="mt-6 space-y-2">
          <Link to="/" className="sledge-btn">
            ← Return to Home
          </Link>
        </nav>
      </div>
    </div>
  );
}
