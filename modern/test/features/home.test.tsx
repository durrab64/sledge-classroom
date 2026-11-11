import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';
import {
  createCourseReader,
  createEventReader,
  makeEvent,
  makeResource,
} from './fixtures';

function renderHome(
  courseReader = createCourseReader(),
  eventReader = createEventReader(),
) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage courseReader={courseReader} eventReader={eventReader} />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('renders the legacy hero, gateway, archive, about, curriculum and FAQ content', () => {
    renderHome();

    expect(
      screen.getByRole('heading', { name: /Knowledge/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Choose your path')).toBeInTheDocument();
    expect(screen.getByText('Coursework & Labs')).toBeInTheDocument();
    expect(
      screen.getByText('About Sledge Classroom'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('NUML BSCS Course Curriculum'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Frequently Asked Questions'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Browse courses/i }),
    ).toHaveAttribute('href', '/courses');
  });

  it('renders backend course counts and upcoming events', async () => {
    const courseReader = createCourseReader([
      makeResource('l1', 'stats', 'lectures'),
      makeResource('l2', 'stats', 'lectures'),
      makeResource('p1', 'stats', 'papers'),
    ]);
    const eventReader = createEventReader([
      makeEvent('e1', {
        title: 'Automata Quiz 1',
        courseId: 'automata',
        date: '2099-01-15',
      }),
      makeEvent('e2', {
        title: 'Past event',
        courseId: 'stats',
        date: '2000-01-01',
      }),
    ]);
    renderHome(courseReader, eventReader);

    const statsCard = await screen.findByRole('link', {
      name: 'Statistics & Probability, STAT 301, theory course',
    });
    expect(statsCard).toHaveTextContent('2 Slides');
    expect(statsCard).toHaveTextContent('1 Papers');

    expect(await screen.findByText('Automata Quiz 1')).toBeInTheDocument();
    expect(screen.queryByText('Past event')).not.toBeInTheDocument();
    expect(screen.getByText('Transmission 01')).toBeInTheDocument();
  });

  it('filters theory and lab cards independently', async () => {
    const courseReader = createCourseReader([
      makeResource('lab1', 'os', 'lab'),
    ]);
    renderHome(courseReader, createEventReader());

    expect(
      await screen.findByRole('link', {
        name: 'Operating Systems, CS 321, lab section',
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lab Sections/ }));

    expect(
      screen.getByRole('button', { name: /Lab Sections/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByRole('link', {
        name: 'Statistics & Probability, STAT 301, theory course',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Operating Systems, CS 321, lab section',
      }),
    ).toBeInTheDocument();
  });

  it('toggles the FAQ accordion', () => {
    renderHome();
    const question = screen.getByRole('button', {
      name: /What is Sledge Classroom\?/,
    });
    expect(question).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows an error state and retry when course counts fail', async () => {
    const courseReader = createCourseReader([], ['stats:lectures']);
    renderHome(courseReader, createEventReader());

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Course catalogue could not be loaded');
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('shows the events error state when the event read fails', async () => {
    const eventReader = createEventReader([], {
      code: 'firestore-read-failed',
      message: 'offline',
    });
    renderHome(createCourseReader(), eventReader);

    expect(await screen.findByText('Failed to load events.')).toBeInTheDocument();
  });
});
