// Legacy hash compatibility bridge.
//
// The vanilla application used hashes such as `#courses`, `#course-os` and
// `#course-os/lab`. React Router's hash history expects `#/courses` and
// `#/courses/os`. This module rewrites legacy hashes to the modern shape
// before the router mounts and on later hash changes (e.g. old bookmarks or
// shared links), so existing URLs keep working.

import { RESOURCE_CATEGORY_META, getCourse } from '@/features/courses/courseData';
import type { FileCategory } from '@/types';

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Translate a legacy hash into a modern hash-router path.
 * Returns null when the hash is already modern or cannot be mapped.
 */
export function legacyHashToRoute(hash: string): string | null {
  if (!hash || hash === '#' || hash === '#home') return '#/';
  if (hash.startsWith('#/')) return null;

  const raw = hash.replace(/^#/, '').replace(/^\/+/, '').trim();
  if (!raw) return '#/';

  const parts = raw.split('/').filter(Boolean);
  const first = (parts[0] ?? '').toLowerCase();

  if (first === 'home') return '#/';
  if (first === 'courses' || first === 'labs' || first === 'calendar') {
    return `#/${first}`;
  }
  // `#reader` was not a route in the legacy application; the reader was
  // always opened for a specific resource. Send the modern alias back to the
  // course catalogue rather than showing an empty placeholder.
  if (first === 'reader') return '#/courses';

  if (!first.startsWith('course-')) return null;

  const courseId = first.slice('course-'.length);

  // `#course-<id>/<category>/<docId>` was the legacy Reading Room deep link.
  // Keep every segment (doc IDs are stable) so the viewer can resolve the
  // exact selected resource. Unknown IDs are handled by the reader's
  // not-found state instead of silently falling back to a category tab.
  if (parts.length >= 3) {
    const category = safeDecode(parts[1]).toLowerCase();
    const docId = parts.slice(2).map(safeDecode).join('/');
    const encodedDoc = docId
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    return `#/courses/${encodeURIComponent(
      courseId,
    )}/${encodeURIComponent(category)}/${encodedDoc}`;
  }

  const course = getCourse(courseId);
  if (!course) return '#/courses';

  const params = new URLSearchParams();
  const category = (parts[1] ?? '').toLowerCase();
  const meta = RESOURCE_CATEGORY_META[category as FileCategory];
  if (meta) {
    if (meta.mode === 'lab') params.set('mode', 'lab');
    if (meta.tab !== 'lectures') params.set('tab', meta.tab);
  }
  const query = params.toString();
  return `#/courses/${course.id}${query ? `?${query}` : ''}`;
}

/** Rewrite a legacy hash in place before React Router mounts. */
export function normalizeInitialHash(): void {
  const next = legacyHashToRoute(window.location.hash);
  if (next && next !== window.location.hash) {
    window.history.replaceState(window.history.state, '', next);
  }
}

/** Listen for later legacy hash changes (old links clicked after load). */
export function installLegacyHashBridge(): () => void {
  const handleHashChange = () => {
    const next = legacyHashToRoute(window.location.hash);
    if (next && next !== window.location.hash) {
      window.location.replace(next);
    }
  };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}
