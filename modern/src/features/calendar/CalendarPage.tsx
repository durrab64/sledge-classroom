// Calendar page — migrated from the legacy #page-calendar experience.
//
// Preserves the six-week monthly board, month navigation, facts, event chips,
// roving keyboard focus, and the per-day agenda panel. Event writes (Add Event,
// delete) are admin workflows and are deferred; the page is read-only.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Event } from '@/types';
import {
  EVENT_TYPES,
  formatEventDate,
  formatEventTime,
  getCourse,
} from '@/features/courses/courseData';
import { eventGroupList } from '@/components/events/EventCard';
import { eventRepository } from '@/services/repositories';
import {
  addCalendarDays,
  buildCalendarCells,
  eventCountLabel,
  eventsForDate,
  eventsInMonth,
  formatAgendaTitle,
  formatFullDateLabel,
  formatMonthLabel,
  formatTodayLabel,
  getCalendarWindow,
  getRovingFocusDate,
  monthMetaLabel,
  monthPrefixOf,
  parseDateStr,
  todayStr,
  type CalendarEventReader,
} from './calendarUtils';

type LoadStatus = 'loading' | 'success' | 'error';

export interface CalendarPageProps {
  eventReader?: CalendarEventReader;
  /** Injectable clock for deterministic tests. */
  today?: Date;
  /** Injectable starting month for deterministic tests. */
  initialMonth?: Date;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function CalendarPage({
  eventReader = eventRepository,
  today = new Date(),
  initialMonth,
}: CalendarPageProps) {
  const [monthDate, setMonthDate] = useState(() =>
    firstOfMonth(initialMonth ?? today),
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [focusDate, setFocusDate] = useState(() =>
    getRovingFocusDate(firstOfMonth(initialMonth ?? today), null, today),
  );
  const [reloadToken, setReloadToken] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelTitleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusOnCloseRef = useRef(false);
  const pendingFocusRef = useRef<string | null>(null);

  const monthLabel = formatMonthLabel(monthDate);
  const todayDateStr = todayStr(today);
  const monthPrefix = monthPrefixOf(monthDate);

  useEffect(() => {
    let cancelled = false;
    const { startDate, endDate } = getCalendarWindow(monthDate);
    setStatus('loading');

    eventReader
      .listEventsInRange(startDate, endDate)
      .then((result) => {
        if (cancelled) return;
        setHasLoaded(true);
        if (result.error) {
          setEvents([]);
          setStatus('error');
          return;
        }
        setEvents(result.data ?? []);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setHasLoaded(true);
        setEvents([]);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [eventReader, monthDate, reloadToken]);

  // Keep the roving tab stop on the legacy default after a month change, but
  // honour a pending keyboard target that lives outside the previous window.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending) {
      const target = gridRef.current?.querySelector<HTMLButtonElement>(
        `.calendar-day[data-date="${pending}"]`,
      );
      if (target) {
        pendingFocusRef.current = null;
        setFocusDate(pending);
        target.focus();
        return;
      }
    }
    setFocusDate(getRovingFocusDate(monthDate, selectedDate, today));
    // `today` is a render-time clock; re-running on its identity would reset
    // focus on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthDate]);

  // The agenda panel scrolls into view and moves focus to its heading, matching
  // the legacy showDayEvents() behaviour.
  useEffect(() => {
    if (!selectedDate) {
      if (restoreFocusOnCloseRef.current && returnFocusRef.current) {
        restoreFocusOnCloseRef.current = false;
        returnFocusRef.current.focus();
      }
      return;
    }

    const panel = panelRef.current;
    const title = panelTitleRef.current;
    if (panel && typeof panel.scrollIntoView === 'function') {
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
    try {
      title?.focus({ preventScroll: true });
    } catch {
      title?.focus();
    }
    // Only the selection should trigger the focus/scroll transfer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const cells = useMemo(() => buildCalendarCells(monthDate), [monthDate]);
  const monthEvents = useMemo(
    () => eventsInMonth(events, monthPrefix),
    [events, monthPrefix],
  );

  const shiftMonth = useCallback((delta: number) => {
    pendingFocusRef.current = null;
    setSelectedDate(null);
    setMonthDate((current) =>
      new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }, []);

  const goToToday = useCallback(() => {
    pendingFocusRef.current = null;
    setSelectedDate(null);
    setMonthDate(firstOfMonth(today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const focusDay = useCallback((dateStr: string) => {
    setFocusDate(dateStr);
    const target = gridRef.current?.querySelector<HTMLButtonElement>(
      `.calendar-day[data-date="${dateStr}"]`,
    );
    if (target) {
      target.focus();
      return;
    }
    // Destination is outside the visible window: move the board first and let
    // the month effect restore focus once the new grid is rendered.
    pendingFocusRef.current = dateStr;
    const date = parseDateStr(dateStr);
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }, []);

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      const day = target.closest<HTMLButtonElement>('.calendar-day');
      if (!day || !day.dataset.date) return;

      if (event.key === 'Escape' || event.key === 'Esc') {
        if (selectedDate) {
          event.preventDefault();
          restoreFocusOnCloseRef.current = true;
          setSelectedDate(null);
        }
        return;
      }

      if (event.key === 'Tab') return;

      const current = parseDateStr(day.dataset.date);
      let next: Date | null = null;

      switch (event.key) {
        case 'ArrowLeft':
          next = addCalendarDays(current, -1);
          break;
        case 'ArrowRight':
          next = addCalendarDays(current, 1);
          break;
        case 'ArrowUp':
          next = addCalendarDays(current, -7);
          break;
        case 'ArrowDown':
          next = addCalendarDays(current, 7);
          break;
        case 'Home':
          next = addCalendarDays(current, -current.getDay());
          break;
        case 'End':
          next = addCalendarDays(current, 6 - current.getDay());
          break;
        case 'PageUp':
          next = new Date(
            current.getFullYear(),
            current.getMonth() - 1,
            current.getDate(),
          );
          break;
        case 'PageDown':
          next = new Date(
            current.getFullYear(),
            current.getMonth() + 1,
            current.getDate(),
          );
          break;
        default:
          return;
      }

      event.preventDefault();
      focusDay(
        `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(
          2,
          '0',
        )}-${String(next.getDate()).padStart(2, '0')}`,
      );
    },
    [focusDay, selectedDate],
  );

  const selectDay = useCallback(
    (dateStr: string, source: HTMLButtonElement) => {
      returnFocusRef.current = source;
      setSelectedDate(dateStr);
      setFocusDate(dateStr);
    },
    [],
  );

  const closeDayPanel = useCallback((restoreFocus = true) => {
    restoreFocusOnCloseRef.current = restoreFocus;
    setSelectedDate(null);
  }, []);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const selectedEvents = selectedDate
    ? eventsForDate(events, selectedDate)
    : [];

  return (
    <section className="page page-calendar active" id="page-calendar">
      <span id="calendar" className="anchor-target" aria-hidden="true" />

      <header className="calendar-masthead">
        <div className="calendar-masthead-main">
          <p className="calendar-kicker">
            <span className="calendar-kicker-rule" aria-hidden="true" />
            <span>Academic Schedule · NUML BSCS</span>
          </p>
          <h1 className="calendar-title">The Calendar</h1>
          <p className="calendar-lede">
            Quizzes, assignments, presentations and exams across every course —
            laid out on one planning desk.
          </p>
        </div>
        <dl className="calendar-facts" aria-label="Schedule overview">
          <div className="calendar-fact">
            <dt>Displayed month</dt>
            <dd>{monthLabel}</dd>
          </div>
          <div className="calendar-fact">
            <dt>Events this month</dt>
            <dd>{status === 'success' ? monthEvents.length : '—'}</dd>
          </div>
          <div className="calendar-fact">
            <dt>Today</dt>
            <dd>{formatTodayLabel(today)}</dd>
          </div>
        </dl>
      </header>

      <section className="calendar-board" aria-label="Monthly schedule">
        <div className="calendar-toolbar">
          <div
            className="calendar-nav"
            role="group"
            aria-label="Month navigation"
          >
            <button
              className="calendar-nav-btn"
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              <i className="fas fa-chevron-left" aria-hidden="true" />
            </button>
            <div className="calendar-month-block">
              <h2 className="calendar-month-title" aria-live="polite">
                {monthLabel}
              </h2>
              <p className="calendar-month-meta">
                {status === 'success' ? monthMetaLabel(monthEvents.length) : '—'}
              </p>
            </div>
            <button
              className="calendar-nav-btn"
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </button>
            <button
              className="calendar-today-btn"
              type="button"
              onClick={goToToday}
            >
              Today
            </button>
          </div>
        </div>

        <p
          className="calendar-status"
          role="status"
          aria-live="polite"
          data-tone={status === 'error' ? 'error' : undefined}
        >
          {status === 'loading' ? <span>Loading schedule…</span> : null}
          {status === 'error' ? (
            <>
              <span>The schedule could not be loaded.</span>
              <button
                type="button"
                className="calendar-retry-btn"
                onClick={retry}
              >
                Retry
              </button>
            </>
          ) : null}
        </p>

        <div
          className="calendar-grid"
          role="group"
          aria-label="Calendar days"
          ref={gridRef}
          aria-busy={status === 'loading'}
          onKeyDown={handleGridKeyDown}
        >
          {DAY_HEADERS.map((day) => (
            <div className="calendar-day-header" key={day}>
              {day}
            </div>
          ))}

          {!hasLoaded
            ? Array.from({ length: 35 }, (_, index) => (
                <span
                  className="calendar-day calendar-day--skeleton"
                  aria-hidden="true"
                  key={`skeleton-${index}`}
                />
              ))
            : cells.map((cell) => {
                const dayEvents = eventsForDate(events, cell.dateStr);
                const isToday = cell.dateStr === todayDateStr;
                const isSelected = cell.dateStr === selectedDate;
                const visibleChips = dayEvents.slice(0, 3);
                const classNames = [
                  'calendar-day',
                  cell.isOtherMonth ? 'other-month' : '',
                  isToday ? 'today' : '',
                  isSelected ? 'selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    className={classNames}
                    data-date={cell.dateStr}
                    tabIndex={focusDate === cell.dateStr ? 0 : -1}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={`${formatFullDateLabel(cell.dateStr)}. ${
                      dayEvents.length
                        ? eventCountLabel(dayEvents.length)
                        : 'No events'
                    }.`}
                    onClick={(event) =>
                      selectDay(cell.dateStr, event.currentTarget)
                    }
                  >
                    <span className="calendar-day-number">{cell.dayNum}</span>
                    <span className="calendar-day-events">
                      {visibleChips.map((calendarEvent) => {
                        const typeInfo =
                          EVENT_TYPES[
                            calendarEvent.type as keyof typeof EVENT_TYPES
                          ] ?? EVENT_TYPES.other;
                        return (
                          <span
                            className="calendar-event-chip"
                            style={{
                              ['--event-color' as string]: typeInfo.color,
                              ['--event-bg' as string]: typeInfo.bg,
                            }}
                            title={calendarEvent.title}
                            key={calendarEvent.id}
                          >
                            <span className="calendar-event-chip-label">
                              {calendarEvent.title}
                            </span>
                          </span>
                        );
                      })}
                      {dayEvents.length > 3 ? (
                        <span
                          className="calendar-event-more"
                          aria-hidden="true"
                        >
                          +{dayEvents.length - 3}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
        </div>

        <div
          className="calendar-legend"
          role="group"
          aria-label="Event categories"
        >
          {(
            [
              ['quiz', 'Quiz'],
              ['assignment', 'Assignment'],
              ['presentation', 'Presentation'],
              ['exam', 'Exam'],
              ['other', 'Other'],
            ] as const
          ).map(([type, label]) => (
            <div className="calendar-legend-item" key={type}>
              <span
                className="calendar-legend-dot"
                style={{ background: EVENT_TYPES[type].color }}
                aria-hidden="true"
              />{' '}
              {label}
            </div>
          ))}
        </div>
      </section>

      <section
        className={`day-events-panel${selectedDate ? '' : ' hidden'}`}
        aria-labelledby="day-events-title"
        ref={panelRef}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Esc') {
            event.preventDefault();
            closeDayPanel(true);
          }
        }}
      >
        <div className="day-events-header">
          <div className="day-events-heading">
            <p className="day-events-kicker">Agenda</p>
            <h2 id="day-events-title" tabIndex={-1} ref={panelTitleRef}>
              {selectedDate
                ? formatAgendaTitle(selectedDate)
                : 'Events for this day'}
            </h2>
          </div>
          <button
            className="calendar-icon-btn"
            type="button"
            aria-label="Close day details"
            onClick={() => closeDayPanel(true)}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>
        <div className="day-events-list">
          {selectedEvents.length === 0 ? (
            <div className="calendar-agenda-empty">
              <i className="far fa-calendar" aria-hidden="true" />
              <h3>No events on this day</h3>
              <p>
                Choose another date or check back after the next schedule
                update.
              </p>
            </div>
          ) : (
            selectedEvents.map((calendarEvent) => {
              const typeInfo =
                EVENT_TYPES[
                  calendarEvent.type as keyof typeof EVENT_TYPES
                ] ?? EVENT_TYPES.other;
              const course = getCourse(calendarEvent.courseId);
              const groups = eventGroupList(calendarEvent.groups);
              return (
                <article
                  className="calendar-agenda-event"
                  style={{
                    ['--event-color' as string]: typeInfo.color,
                    ['--event-bg' as string]: typeInfo.bg,
                  }}
                  key={calendarEvent.id}
                >
                  <span className="calendar-agenda-icon" aria-hidden="true">
                    <i className={typeInfo.icon} />
                  </span>
                  <div className="calendar-agenda-body">
                    <div className="calendar-agenda-top">
                      <span className="calendar-agenda-type">
                        {typeInfo.label}
                      </span>
                      <h3 className="calendar-agenda-title">
                        {calendarEvent.title}
                      </h3>
                    </div>
                    <div className="calendar-agenda-meta">
                      <span>
                        <i className="far fa-calendar" aria-hidden="true" />{' '}
                        {formatEventDate(calendarEvent.date)}
                      </span>
                      {calendarEvent.time ? (
                        <span>
                          <i className="far fa-clock" aria-hidden="true" />{' '}
                          {formatEventTime(calendarEvent.time)}
                        </span>
                      ) : null}
                      {course ? (
                        <span>
                          <i className="fas fa-book" aria-hidden="true" />{' '}
                          {course.name}
                        </span>
                      ) : null}
                    </div>
                    {calendarEvent.description ? (
                      <p className="calendar-agenda-desc">
                        {calendarEvent.description}
                      </p>
                    ) : null}
                    {groups.length > 0 ? (
                      <div className="calendar-agenda-groups">
                        {groups.map((group) => (
                          <span className="group-tag" key={group}>
                            {group}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </section>
  );
}
