import { describe, expect, it } from 'vitest';
import { legacyHashToRoute } from '@/lib/legacyHash';

describe('legacyHashToRoute', () => {
  it('maps legacy page hashes to hash-router routes', () => {
    expect(legacyHashToRoute('')).toBe('#/');
    expect(legacyHashToRoute('#home')).toBe('#/');
    expect(legacyHashToRoute('#courses')).toBe('#/courses');
    expect(legacyHashToRoute('#labs')).toBe('#/labs');
    expect(legacyHashToRoute('#calendar')).toBe('#/calendar');
    expect(legacyHashToRoute('#reader')).toBe('#/courses');
  });

  it('maps course hashes and categories to the migrated detail route', () => {
    expect(legacyHashToRoute('#course-os')).toBe('#/courses/os');
    expect(legacyHashToRoute('#course-stats')).toBe('#/courses/stats');
    expect(legacyHashToRoute('#course-os/lab')).toBe('#/courses/os?mode=lab');
    expect(legacyHashToRoute('#course-os/lab_papers')).toBe(
      '#/courses/os?mode=lab&tab=past-papers',
    );
    expect(legacyHashToRoute('#course-os/lab_tasks')).toBe(
      '#/courses/os?mode=lab&tab=related',
    );
    expect(legacyHashToRoute('#course-os/papers')).toBe(
      '#/courses/os?tab=past-papers',
    );
    expect(legacyHashToRoute('#course-os/related')).toBe(
      '#/courses/os?tab=related',
    );
  });

  it('maps legacy reading-room resource hashes to the true reader route', () => {
    expect(legacyHashToRoute('#course-os/lab/doc-123')).toBe(
      '#/courses/os/lab/doc-123',
    );
    expect(legacyHashToRoute('#course-stats/papers/doc-123')).toBe(
      '#/courses/stats/papers/doc-123',
    );
  });

  it('preserves encoded and multi-segment resource IDs', () => {
    expect(legacyHashToRoute('#course-os/lectures/week%201%2Fnotes.pdf')).toBe(
      '#/courses/os/lectures/week%201/notes.pdf',
    );
    // Unknown IDs still resolve to the reader, which renders not-found.
    expect(legacyHashToRoute('#course-stats/papers/unknown-id')).toBe(
      '#/courses/stats/papers/unknown-id',
    );
    // Unknown courses also reach the reader's course-not-found state.
    expect(legacyHashToRoute('#course-unknown/lab/doc-1')).toBe(
      '#/courses/unknown/lab/doc-1',
    );
  });

  it('leaves modern hashes and unknown hashes alone', () => {
    expect(legacyHashToRoute('#/courses')).toBeNull();
    expect(legacyHashToRoute('#/courses/os?mode=lab')).toBeNull();
    expect(legacyHashToRoute('#something-else')).toBeNull();
  });

  it('redirects unknown legacy course ids to the directory', () => {
    expect(legacyHashToRoute('#course-unknown')).toBe('#/courses');
  });
});
