import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CourseDetail } from '@/features/courses/CourseDetail';
import {
  createCourseReader,
  createEventReader,
  makeEvent,
  makeResource,
} from './fixtures';

function renderDetail(
  initialEntry: string,
  courseReader = createCourseReader(),
  eventReader = createEventReader(),
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/courses/:courseId"
          element={
            <CourseDetail
              courseReader={courseReader}
              eventReader={eventReader}
            />
          }
        />
        <Route path="/courses" element={<div>Courses index</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CourseDetail', () => {
  it('renders the course header, mode switcher, tabs and resource rows', async () => {
    const courseReader = createCourseReader([
      makeResource('lec1', 'os', 'lectures', { name: 'OS Lecture 1' }),
    ]);
    renderDetail('/courses/os', courseReader);

    expect(
      screen.getByRole('heading', { name: 'Operating Systems' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CS 321')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theory' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('tab', { name: /Lecture Slides/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('OS Lecture 1')).toBeInTheDocument();
  });

  it('switches to the lab section and reloads the lab categories', async () => {
    const courseReader = createCourseReader([
      makeResource('lec1', 'os', 'lectures', { name: 'OS Lecture 1' }),
      makeResource('lab1', 'os', 'lab', { name: 'Lab Manual 1' }),
    ]);
    renderDetail('/courses/os', courseReader);
    await screen.findByText('OS Lecture 1');

    fireEvent.click(screen.getByRole('button', { name: 'Lab' }));

    expect(await screen.findByText('Lab Manual 1')).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /Lab Manuals/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Practical lab section'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Lab' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches category tabs', async () => {
    const courseReader = createCourseReader([
      makeResource('lec1', 'os', 'lectures', { name: 'OS Lecture 1' }),
      makeResource('paper1', 'os', 'papers', { name: 'OS Final 2025' }),
    ]);
    renderDetail('/courses/os', courseReader);
    await screen.findByText('OS Lecture 1');

    fireEvent.click(screen.getByRole('tab', { name: /Past Papers/ }));

    expect(await screen.findByText('OS Final 2025')).toBeInTheDocument();
    expect(screen.queryByText('OS Lecture 1')).not.toBeInTheDocument();
  });

  it('renders the legacy empty state for an empty category', async () => {
    renderDetail('/courses/stats');

    expect(
      await screen.findByRole('heading', {
        name: 'No Lecture Slides Yet',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Theory lecture slides and presentations will appear here.'),
    ).toBeInTheDocument();
  });

  it('shows the resource error state and retries', async () => {
    const courseReader = createCourseReader([], ['stats:lectures']);
    renderDetail('/courses/stats', courseReader);

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Resources could not be loaded');
    expect(
      screen.getByRole('button', { name: /Retry/i }),
    ).toBeInTheDocument();
  });

  it('renders the course calendar tab with events', async () => {
    const courseReader = createCourseReader([
      makeResource('lec1', 'os', 'lectures', { name: 'OS Lecture 1' }),
    ]);
    const eventReader = createEventReader([
      makeEvent('e1', {
        title: 'OS Midterm',
        courseId: 'os',
        date: '2099-03-04',
        type: 'exam',
      }),
    ]);
    renderDetail('/courses/os', courseReader, eventReader);
    await screen.findByText('OS Lecture 1');

    fireEvent.click(screen.getByRole('tab', { name: /Calendar/ }));

    expect(await screen.findByText('OS Midterm')).toBeInTheDocument();
    expect(screen.getByText('Exam')).toBeInTheDocument();
  });

  it('redirects unknown course ids back to the directory', async () => {
    renderDetail('/courses/not-a-course');
    expect(await screen.findByText('Courses index')).toBeInTheDocument();
  });

  it('supports keyboard navigation between tabs', async () => {
    renderDetail('/courses/os');
    const firstTab = await screen.findByRole('tab', {
      name: /Lecture Slides/,
    });
    firstTab.focus();
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });

    const pastPapers = screen.getByRole('tab', { name: /Past Papers/ });
    expect(pastPapers).toHaveAttribute('aria-selected', 'true');
  });
});
