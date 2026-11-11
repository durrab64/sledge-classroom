import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  buildCalendarCells,
  eventCountLabel,
  eventsForDate,
  eventsInMonth,
  formatAgendaTitle,
  formatDateStr,
  formatFullDateLabel,
  formatMonthLabel,
  formatTodayLabel,
  getCalendarWindow,
  getRovingFocusDate,
  monthMetaLabel,
  monthPrefixOf,
  parseDateStr,
  todayStr,
} from '@/features/calendar/calendarUtils';
import { makeEvent } from './fixtures';

describe('calendar date helpers', () => {
  it('normalizes out-of-range month and day components like the legacy helper', () => {
    expect(formatDateStr(2026, 9, 1)).toBe('2026-10-01');
    expect(formatDateStr(2026, 9, 0)).toBe('2026-09-30');
    expect(formatDateStr(2026, 11, 1)).toBe('2026-12-01');
  });

  it('adds days across month and year boundaries', () => {
    expect(addCalendarDays(new Date(2026, 11, 31), 1)).toEqual(
      new Date(2027, 0, 1),
    );
    expect(addCalendarDays(new Date(2026, 9, 1), -1)).toEqual(
      new Date(2026, 8, 30),
    );
  });

  it('parses legacy YYYY-MM-DD strings as local midnight', () => {
    const date = parseDateStr('2026-10-22');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(22);
  });

  it('formats month, today, full-date and agenda labels', () => {
    expect(formatMonthLabel(new Date(2026, 9, 1))).toBe('October 2026');
    expect(formatTodayLabel(new Date(2026, 9, 22))).toBe('Thu, Oct 22');
    expect(formatFullDateLabel('2026-10-22')).toBe(
      'Thursday, October 22, 2026',
    );
    expect(formatAgendaTitle('2026-10-22')).toBe(
      'Events for Thursday, October 22, 2026',
    );
  });
});

describe('calendar grid window', () => {
  it('renders a fixed six-week window that starts on the Sunday before the month', () => {
    expect(getCalendarWindow(new Date(2026, 9, 1))).toEqual({
      startDate: '2026-09-27',
      endDate: '2026-11-07',
    });

    const cells = buildCalendarCells(new Date(2026, 9, 1));
    expect(cells).toHaveLength(42);
    expect(cells[0]).toEqual({
      dayNum: 27,
      dateStr: '2026-09-27',
      isOtherMonth: true,
    });
    expect(cells[4]).toEqual({
      dayNum: 1,
      dateStr: '2026-10-01',
      isOtherMonth: false,
    });
    expect(cells[34]).toEqual({
      dayNum: 31,
      dateStr: '2026-10-31',
      isOtherMonth: false,
    });
    expect(cells[41]).toEqual({
      dayNum: 7,
      dateStr: '2026-11-07',
      isOtherMonth: true,
    });
  });

  it('keeps 42 cells for a February that starts on Sunday', () => {
    const cells = buildCalendarCells(new Date(2026, 1, 1));
    expect(cells).toHaveLength(42);
    expect(cells[0].dateStr).toBe('2026-02-01');
    expect(cells[27].dateStr).toBe('2026-02-28');
    expect(cells[41].dateStr).toBe('2026-03-14');
  });

  it('derives the month prefix and today string', () => {
    expect(monthPrefixOf(new Date(2026, 9, 22))).toBe('2026-10');
    expect(todayStr(new Date(2026, 9, 22))).toBe('2026-10-22');
  });
});

describe('calendar event filtering', () => {
  const events = [
    makeEvent('a', { date: '2026-10-05' }),
    makeEvent('b', { date: '2026-10-22' }),
    makeEvent('c', { date: '2026-10-22' }),
    makeEvent('d', { date: '2026-11-07' }),
  ];

  it('filters events by exact day', () => {
    expect(eventsForDate(events, '2026-10-22').map((event) => event.id)).toEqual(
      ['b', 'c'],
    );
    expect(eventsForDate(events, '2026-10-06')).toEqual([]);
  });

  it('filters events to the displayed month, excluding trailing grid days', () => {
    expect(eventsInMonth(events, '2026-10').map((event) => event.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('calendar labels and roving focus', () => {
  it('pluralizes event counts like the legacy copy', () => {
    expect(eventCountLabel(0)).toBe('0 events');
    expect(eventCountLabel(1)).toBe('1 event');
    expect(eventCountLabel(3)).toBe('3 events');
    expect(monthMetaLabel(0)).toBe('No events this month');
    expect(monthMetaLabel(1)).toBe('1 event scheduled');
    expect(monthMetaLabel(4)).toBe('4 events scheduled');
  });

  it('keeps a visible selected day as the tab stop', () => {
    expect(
      getRovingFocusDate(
        new Date(2026, 9, 1),
        '2026-10-22',
        new Date(2026, 9, 22),
      ),
    ).toBe('2026-10-22');
  });

  it('falls back to today inside the month, then to the first of the month', () => {
    expect(
      getRovingFocusDate(
        new Date(2026, 9, 1),
        null,
        new Date(2026, 9, 22),
      ),
    ).toBe('2026-10-22');
    expect(
      getRovingFocusDate(
        new Date(2026, 10, 1),
        null,
        new Date(2026, 9, 22),
      ),
    ).toBe('2026-11-01');
  });
});
