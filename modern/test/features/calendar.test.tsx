import { describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import {
  createRangeEventReader,
  makeEvent,
} from './fixtures';
import { repositoryFailure, repositorySuccess } from '@/types';

const TODAY = new Date(2026, 9, 22);
const OCTOBER = new Date(2026, 9, 1);

function renderCalendar(
  eventReader = createRangeEventReader(),
  options: { today?: Date; initialMonth?: Date } = {},
) {
  return render(
    <CalendarPage
      eventReader={eventReader}
      today={options.today ?? TODAY}
      initialMonth={options.initialMonth ?? OCTOBER}
    />,
  );
}

describe('CalendarPage', () => {
  it('renders the legacy masthead, facts and six-week month grid', async () => {
    const eventReader = createRangeEventReader([
      makeEvent('e1', {
        title: 'OS Quiz 1',
        date: '2026-10-22',
        type: 'quiz',
        courseId: 'os',
      }),
      makeEvent('e2', {
        title: 'Web Assignment',
        date: '2026-10-22',
        type: 'assignment',
        courseId: 'web',
      }),
      makeEvent('e3', {
        title: 'Calculus Midterm',
        date: '2026-10-05',
        type: 'exam',
        courseId: 'calculus',
      }),
      makeEvent('e4', {
        title: 'Outside month, inside window',
        date: '2026-11-07',
        type: 'other',
        courseId: 'os',
      }),
    ]);

    renderCalendar(eventReader);

    expect(
      screen.getByRole('heading', { name: 'The Calendar' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Academic Schedule · NUML BSCS'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Quizzes, assignments, presentations and exams/),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(eventReader.listEventsInRange).toHaveBeenCalledWith(
        '2026-09-27',
        '2026-11-07',
      ),
    );

    expect(
      await screen.findByRole('heading', { name: 'October 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Thu, Oct 22')).toBeInTheDocument();
    expect(screen.getByText('3 events scheduled')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Calendar days' }),
    ).toHaveAttribute('aria-busy', 'false');

    const dayButtons = screen
      .getAllByRole('button')
      .filter((button) => button.classList.contains('calendar-day'));
    expect(dayButtons).toHaveLength(42);
    expect(
      screen.getByRole('button', {
        name: 'Thursday, October 22, 2026. 2 events.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Thursday, October 1, 2026. No events.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Saturday, November 7, 2026. 1 event.',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('group', { name: 'Event categories' }),
    ).toHaveTextContent('Quiz');
  });

  it('opens the day agenda with event presentation and closes it with focus restored', async () => {
    const eventReader = createRangeEventReader([
      makeEvent('e1', {
        title: 'OS Quiz 1',
        date: '2026-10-22',
        time: '09:15',
        type: 'quiz',
        courseId: 'os',
        groups: ['A', 'B'],
        description: 'Covers scheduling.',
      }),
    ]);
    renderCalendar(eventReader);

    const day = await screen.findByRole('button', {
      name: 'Thursday, October 22, 2026. 1 event.',
    });
    fireEvent.click(day);

    const panel = document.querySelector(
      '#page-calendar .day-events-panel',
    ) as HTMLElement;
    expect(
      within(panel).getByRole('heading', {
        name: 'Events for Thursday, October 22, 2026',
      }),
    ).toBeInTheDocument();
    expect(within(panel).getByText('OS Quiz 1')).toBeInTheDocument();
    expect(within(panel).getByText('Quiz')).toBeInTheDocument();
    expect(within(panel).getByText('9:15 AM')).toBeInTheDocument();
    expect(within(panel).getByText('Operating Systems')).toBeInTheDocument();
    expect(within(panel).getByText('Covers scheduling.')).toBeInTheDocument();
    expect(within(panel).getByText('A')).toBeInTheDocument();
    expect(within(panel).getByText('B')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Delete event/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Close day details' }),
    );
    await waitFor(() =>
      expect(
        document.querySelector('#page-calendar .day-events-panel'),
      ).toHaveClass('hidden'),
    );
    expect(day).toHaveFocus();
  });

  it('shows the empty agenda and month copy when there are no events', async () => {
    renderCalendar(createRangeEventReader());

    expect(
      await screen.findByRole('heading', { name: 'October 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No events this month')).toBeInTheDocument();

    const fact = screen
      .getByText('Events this month')
      .closest('.calendar-fact');
    expect(fact).toHaveTextContent('0');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Thursday, October 22, 2026. No events.',
      }),
    );
    expect(screen.getByText('No events on this day')).toBeInTheDocument();
    expect(
      screen.getByText(/Choose another date or check back/),
    ).toBeInTheDocument();
  });

  it('navigates months, re-queries the six-week window and returns to today', async () => {
    const eventReader = createRangeEventReader();
    renderCalendar(eventReader);

    await screen.findByRole('heading', { name: 'October 2026' });

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(
      await screen.findByRole('heading', { name: 'November 2026' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(eventReader.listEventsInRange).toHaveBeenLastCalledWith(
        '2026-11-01',
        '2026-12-12',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    await screen.findByRole('heading', { name: 'October 2026' });

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(
      await screen.findByRole('heading', { name: 'October 2026' }),
    ).toBeInTheDocument();
  });

  it('supports roving keyboard navigation across the grid', async () => {
    renderCalendar();
    const day = await screen.findByRole('button', {
      name: 'Thursday, October 22, 2026. No events.',
    });

    day.focus();
    expect(day).toHaveFocus();
    expect(day).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(day, { key: 'ArrowRight' });
    const nextDay = screen.getByRole('button', {
      name: 'Friday, October 23, 2026. No events.',
    });
    expect(nextDay).toHaveFocus();
    expect(nextDay).toHaveAttribute('tabindex', '0');
    expect(day).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(nextDay, { key: 'ArrowDown' });
    expect(
      screen.getByRole('button', {
        name: 'Friday, October 30, 2026. No events.',
      }),
    ).toHaveFocus();

    fireEvent.keyDown(
      screen.getByRole('button', {
        name: 'Friday, October 30, 2026. No events.',
      }),
      { key: 'Home' },
    );
    expect(
      screen.getByRole('button', {
        name: 'Sunday, October 25, 2026. No events.',
      }),
    ).toHaveFocus();

    fireEvent.keyDown(
      screen.getByRole('button', {
        name: 'Sunday, October 25, 2026. No events.',
      }),
      { key: 'End' },
    );
    expect(
      screen.getByRole('button', {
        name: 'Saturday, October 31, 2026. No events.',
      }),
    ).toHaveFocus();
  });

  it('closes the agenda with Escape and restores focus to the day', async () => {
    renderCalendar();
    const day = await screen.findByRole('button', {
      name: 'Thursday, October 22, 2026. No events.',
    });
    fireEvent.click(day);
    expect(
      screen.getByRole('heading', {
        name: 'Events for Thursday, October 22, 2026',
      }),
    ).toHaveFocus();

    fireEvent.keyDown(
      screen.getByRole('heading', {
        name: 'Events for Thursday, October 22, 2026',
      }),
      { key: 'Escape' },
    );
    await waitFor(() =>
      expect(
        document.querySelector('#page-calendar .day-events-panel'),
      ).toHaveClass('hidden'),
    );
    expect(day).toHaveFocus();
  });

  it('shows an error state with a working retry when the range read fails', async () => {
    const failingReader = {
      listEventsInRange: vi
        .fn()
        .mockResolvedValueOnce(
          repositoryFailure('firestore-read-failed', 'offline'),
        )
        .mockResolvedValueOnce(
          repositorySuccess([
            makeEvent('e1', {
              title: 'Recovered event',
              date: '2026-10-22',
            }),
          ]),
        ),
    };
    render(
      <CalendarPage
        eventReader={failingReader}
        today={TODAY}
        initialMonth={OCTOBER}
      />,
    );

    expect(
      await screen.findByText('The schedule could not be loaded.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('button', {
        name: 'Thursday, October 22, 2026. 1 event.',
      }),
    ).toBeInTheDocument();
    expect(failingReader.listEventsInRange).toHaveBeenCalledTimes(2);
  });

  it('renders loading status before the first response', () => {
    const reader = { listEventsInRange: vi.fn(() => new Promise(() => {})) };
    render(
      <CalendarPage
        eventReader={reader}
        today={TODAY}
        initialMonth={OCTOBER}
      />,
    );
    expect(screen.getByText('Loading schedule…')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Calendar days' }),
    ).toHaveAttribute('aria-busy', 'true');
    expect(
      document.querySelectorAll('#page-calendar .calendar-day--skeleton'),
    ).toHaveLength(35);
  });
});
