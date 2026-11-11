// Legacy hash compatibility bridge.
//
// The vanilla application used hashes such as `#courses`, `#course-os` and
// `#course-os/lab`. React Router's hash history expects `#/courses` and
// `#/courses/os`. This module rewrites legacy hashes to the modern shape
// before the router mounts and on later hash changes (e.g. old bookmarks or
// shared links), so existing URLs keep working.

import { RESOURCE_CATEGORY_META, getCourse } from '@/features/courses/courseData';
import type { FileCategory } from '@/types';

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
  if (first === 'reader') return '#/reader';

  if (!first.startsWith('course-')) return null;

  const courseId = first.slice('course-'.length);
  const course = getCourse(courseId);
  if (!course) return '#/courses';

  const params = new URLSearchParams();
  const category = (parts[1] ?? '').toLowerCase();
  const meta = RESOURCE_CATEGORY_META[category as FileCategory];
  if (meta) {
    if (meta.mode === 'lab') params.set('mode', 'lab');
    if (meta.tab !== 'lectures') params.set('tab', meta.tab);
  }
  // `#course-<id>/<category>/<docId>` was the Reading Room route. The reader
  // is deferred, so the link resolves to the matching category tab instead.
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
