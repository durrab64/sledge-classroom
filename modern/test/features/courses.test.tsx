import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoursesPage } from '@/features/courses/CoursesPage';
import {
  createCourseReader,
  createEventReader,
  makeResource,
} from './fixtures';

function renderCourses(
  courseReader = createCourseReader(),
  eventReader = createEventReader(),
) {
  return render(
    <MemoryRouter initialEntries={['/courses']}>
      <CoursesPage courseReader={courseReader} eventReader={eventReader} />
    </MemoryRouter>,
  );
}

describe('CoursesPage', () => {
  it('renders the masthead, totals, toolbar and all six theory / three lab courses', async () => {
    renderCourses();

    expect(
      screen.getByRole('heading', { name: 'Coursework & Labs' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Theory')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (9)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByPlaceholderText('Search courses…')).toBeInTheDocument();

    expect(
      await screen.findByRole('link', {
        name: 'Statistics & Probability, STAT 301, theory course',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Operating Systems, CS 321, lab section',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(9);
  });

  it('filters the directory to lab sections', async () => {
    renderCourses();
    fireEvent.click(screen.getByRole('button', { name: 'Lab (3)' }));

    expect(
      await screen.findByRole('link', {
        name: 'Operating Systems, CS 321, lab section',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: 'Statistics & Probability, STAT 301, theory course',
      }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('searches by name/code/description and sorts by name', async () => {
    renderCourses();
    await screen.findByRole('link', {
      name: 'Statistics & Probability, STAT 301, theory course',
    });

    fireEvent.change(screen.getByPlaceholderText('Search courses…'), {
      target: { value: 'automata' },
    });
    expect(
      screen.getByRole('link', {
        name: 'Theory of Automata, CS 311, theory course',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: 'Operating Systems, CS 321, lab section',
      }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search courses…'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Sort courses'), {
      target: { value: 'name' },
    });
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute(
      'aria-label',
      'Computer Architecture, CS 331, theory course',
    );
  });

  it('shows the empty state and clears filters', async () => {
    renderCourses();
    await screen.findByRole('link', {
      name: 'Statistics & Probability, STAT 301, theory course',
    });
    const search = screen.getByPlaceholderText('Search courses…');
    fireEvent.change(search, { target: { value: 'no-such-course' } });

    expect(
      await screen.findByRole('heading', {
        name: 'No courses match your search',
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(search).toHaveValue('');
    expect(
      await screen.findByRole('link', {
        name: 'Statistics & Probability, STAT 301, theory course',
      }),
    ).toBeInTheDocument();
  });

  it('renders counts and surfaces a resource read error', async () => {
    const courseReader = createCourseReader(
      [makeResource('l1', 'stats', 'lectures')],
      ['os:lab'],
    );
    renderCourses(courseReader, createEventReader());

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Course catalogue could not be loaded');
    expect(
      screen.getByRole('button', { name: /Retry/i }),
    ).toBeInTheDocument();
  });
});
