import { describe, expect, it } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LabsPage } from '@/features/labs/LabsPage';
import { CourseDetail } from '@/features/courses/CourseDetail';
import {
  createCourseReader,
  createEventReader,
  makeEvent,
  makeResource,
} from './fixtures';

function renderLabs(
  courseReader = createCourseReader(),
  eventReader = createEventReader(),
) {
  return render(
    <MemoryRouter initialEntries={['/labs']}>
      <LabsPage courseReader={courseReader} eventReader={eventReader} />
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

describe('LabsPage', () => {
  it('renders the legacy masthead, statistics and bench directory', async () => {
    const courseReader = createCourseReader([
      makeResource('m1', 'os', 'lab'),
      makeResource('p1', 'os', 'lab_papers'),
      makeResource('t1', 'os', 'lab_tasks'),
    ]);
    const eventReader = createEventReader([
      makeEvent('e1', { courseId: 'os', date: '2026-10-22' }),
    ]);

    renderLabs(courseReader, eventReader);

    expect(
      screen.getByRole('heading', { name: 'The Laboratory' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Practical Workspace · NUML BSCS'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Hands-on benches for practical courses/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Bench Directory' }),
    ).toBeInTheDocument();

    const osBench = await screen.findByRole('link', {
      name: /Operating Systems lab bench/,
    });
    expect(osBench).toHaveAttribute(
      'href',
      '/courses/os?mode=lab&from=labs',
    );
    expect(osBench).toHaveTextContent('LAB 01');
    expect(osBench).toHaveTextContent('CS 321');
    expect(osBench).toHaveTextContent('1 Manuals');
    expect(osBench).toHaveTextContent('1 Papers');
    expect(osBench).toHaveTextContent('1 Tasks');
    expect(osBench).toHaveTextContent('1 Events');
    expect(osBench).toHaveTextContent('Open bench');

    expect(
      screen.getByRole('link', { name: /Web Engineering lab bench/ }),
    ).toHaveAttribute('href', '/courses/web?mode=lab&from=labs');
    expect(
      screen.getByRole('link', {
        name: /Computer Architecture lab bench/,
      }),
    ).toHaveAttribute('href', '/courses/arch?mode=lab&from=labs');

    const overview = screen.getByLabelText('Laboratory overview');
    expect(within(overview).getByText('Lab Sections')).toBeInTheDocument();
    expect(
      overview.querySelector('[data-lab-stat="sections"]'),
    ).toHaveTextContent('3');
    expect(overview.querySelector('[data-lab-stat="manuals"]')).toHaveTextContent(
      '1',
    );
    expect(overview.querySelector('[data-lab-stat="tasks"]')).toHaveTextContent(
      '1',
    );
    expect(overview.querySelector('[data-lab-stat="events"]')).toHaveTextContent(
      '1',
    );

    expect(screen.getByText('3 benches · 3 resources')).toBeInTheDocument();
  });

  it('shows a loading skeleton before catalogue data resolves', () => {
    const courseReader = createCourseReader();
    const eventReader = createEventReader();
    const { container } = renderLabs(courseReader, eventReader);

    const grid = container.querySelector('#labs-grid');
    expect(grid).toHaveAttribute('aria-busy', 'true');
    expect(
      container.querySelectorAll('.skeleton-card.skeleton-row'),
    ).toHaveLength(3);
    expect(
      screen.getByText('Bench Directory'),
    ).toBeInTheDocument();
  });

  it('renders zero metrics without inventing counts when a bench is empty', async () => {
    renderLabs();

    const osBench = await screen.findByRole('link', {
      name: /Operating Systems lab bench/,
    });
    expect(osBench).toHaveTextContent('0 Manuals');
    expect(osBench).toHaveTextContent('0 Papers');
    expect(osBench).toHaveTextContent('0 Tasks');
    expect(screen.getByText('3 benches · 0 resources')).toBeInTheDocument();
  });

  it('shows an explicit error state with retry when the catalogue fails', async () => {
    const courseReader = createCourseReader([], ['os:lab']);
    renderLabs(courseReader, createEventReader());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Laboratory benches could not be loaded');

    const callsBefore = courseReader.listResources.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() =>
      expect(courseReader.listResources.mock.calls.length).toBeGreaterThan(
        callsBefore,
      ),
    );
  });

  it('returns to Labs from a course opened from the bench directory', async () => {
    const courseReader = createCourseReader();
    const eventReader = createEventReader();

    render(
      <MemoryRouter initialEntries={['/courses/os?mode=lab&from=labs']}>
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
          <Route path="/labs" element={<div>Labs destination</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );

    const back = screen.getByRole('button', { name: /Back to Labs/i });
    fireEvent.click(back);
    expect(await screen.findByText('Labs destination')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/labs');
  });

  it('preserves the Labs origin across mode and tab changes', () => {
    const courseReader = createCourseReader();
    const eventReader = createEventReader();

    render(
      <MemoryRouter initialEntries={['/courses/os?mode=lab&from=labs']}>
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
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Theory' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/courses/os?from=labs',
    );

    fireEvent.click(screen.getByRole('tab', { name: /Past Papers/i }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/courses/os?tab=past-papers&from=labs',
    );
  });
});
