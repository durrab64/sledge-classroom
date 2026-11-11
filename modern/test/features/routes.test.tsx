import { describe, expect, it } from 'vitest';
import { LabsRoute, CalendarRoute } from '@/features';
import { LabsPage } from '@/features/labs/LabsPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { legacyHashToRoute } from '@/lib/legacyHash';

describe('CP7 route integration', () => {
  it('wires the Labs and Calendar routes to the migrated pages', () => {
    expect(LabsRoute).toBe(LabsPage);
    expect(CalendarRoute).toBe(CalendarPage);
  });

  it('keeps legacy hash URLs targeting the migrated routes', () => {
    expect(legacyHashToRoute('#labs')).toBe('#/labs');
    expect(legacyHashToRoute('#calendar')).toBe('#/calendar');
    expect(legacyHashToRoute('#course-os/lab')).toBe(
      '#/courses/os?mode=lab',
    );
  });
});
