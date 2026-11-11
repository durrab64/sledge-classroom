// Pure date/grid helpers for the migrated Calendar.
//
// The legacy calendar renders a fixed six-week (42-cell) window starting on the
// Sunday on or before the first of the month. These helpers mirror that
// geometry and the legacy `YYYY-MM-DD` date-string contract used by Firestore.

import type { Event, RepositoryResult } from '@/types';

export interface CalendarEventReader {
  listEventsInRange(
    startDate: string,
    endDate: string,
  ): Promise<RepositoryResult<Event[]>>;
}

/**
 * Legacy `formatDateStr(year, month, day)`.
 *
 * `new Date(year, month, day)` deliberately normalizes out-of-range months and
 * days, which is how the legacy grid crosses month/year boundaries.
 */
export function formatDateStr(
  year: number,
  month: number,
  day: number,
): string {
  const date = new Date(year, month, day);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function parseDateStr(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function formatMonthLabel(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth()).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' },
  );
}

export function formatTodayLabel(today: Date): string {
  return today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDateLabel(dateStr: string): string {
  const date = parseDateStr(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatAgendaTitle(dateStr: string): string {
  return `Events for ${formatFullDateLabel(dateStr)}`;
}

export interface CalendarCell {
  dayNum: number;
  dateStr: string;
  isOtherMonth: boolean;
}

/** The six-week window the legacy grid renders and queries. */
export function getCalendarWindow(monthDate: Date): {
  startDate: string;
  endDate: string;
} {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - firstDay);
  const gridEnd = addCalendarDays(gridStart, 41);
  return {
    startDate: formatDateStr(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate(),
    ),
    endDate: formatDateStr(
      gridEnd.getFullYear(),
      gridEnd.getMonth(),
      gridEnd.getDate(),
    ),
  };
}

export function buildCalendarCells(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    const dayNum = daysInPrevMonth - i;
    cells.push({
      dayNum,
      dateStr: formatDateStr(year, month - 1, dayNum),
      isOtherMonth: true,
    });
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
    cells.push({
      dayNum,
      dateStr: formatDateStr(year, month, dayNum),
      isOtherMonth: false,
    });
  }

  const remaining = 42 - firstDay - daysInMonth;
  for (let dayNum = 1; dayNum <= remaining; dayNum += 1) {
    cells.push({
      dayNum,
      dateStr: formatDateStr(year, month + 1, dayNum),
      isOtherMonth: true,
    });
  }

  return cells;
}

export function monthPrefixOf(date: Date): string {
  return formatDateStr(date.getFullYear(), date.getMonth(), 1).slice(0, 7);
}

export function eventsForDate(events: Event[], dateStr: string): Event[] {
  return events.filter((event) => event.date === dateStr);
}

export function eventsInMonth(events: Event[], monthPrefix: string): Event[] {
  return events.filter(
    (event) => String(event.date || '').slice(0, 7) === monthPrefix,
  );
}

export function todayStr(today: Date = new Date()): string {
  return formatDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
}

/**
 * Roving tab stop: the selected day when it is still visible, otherwise today
 * when it belongs to the displayed month, otherwise the first of the month.
 */
export function getRovingFocusDate(
  monthDate: Date,
  selectedDate: string | null,
  today: Date = new Date(),
): string {
  const cells = buildCalendarCells(monthDate);
  if (selectedDate && cells.some((cell) => cell.dateStr === selectedDate)) {
    return selectedDate;
  }
  const todayDate = todayStr(today);
  const prefix = monthPrefixOf(monthDate);
  if (todayDate.slice(0, 7) === prefix) return todayDate;
  return formatDateStr(monthDate.getFullYear(), monthDate.getMonth(), 1);
}

export function eventCountLabel(count: number): string {
  return `${count} event${count === 1 ? '' : 's'}`;
}

export function monthMetaLabel(count: number): string {
  return count
    ? `${count} event${count === 1 ? '' : 's'} scheduled`
    : 'No events this month';
}
