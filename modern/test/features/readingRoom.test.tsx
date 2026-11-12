import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReadingRoomPage } from '@/features/reading-room/reading-room';
import type {
  CourseResourceReader,
} from '@/features/courses/courseData';
import type { FileCategory, ResourceFile } from '@/types';
import { repositoryFailure, repositorySuccess } from '@/types';
import { createCourseReader, makeResource } from './fixtures';

function driveResource(
  id: string,
  name: string,
  fileId: string,
  overrides: Partial<ResourceFile> = {},
): ResourceFile {
  return makeResource(id, 'os', 'lectures', {
    name,
    type: 'ppt',
    description: `${name} description`,
    date: 'Jan 2, 2026',
    url: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    previewURL: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    downloadURL: `https://drive.google.com/uc?export=download&id=${fileId}`,
    ...overrides,
  });
}

function renderReader(
  initialEntry: string,
  courseReader: CourseResourceReader = createCourseReader(),
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/courses/:courseId/:category/*"
          element={<ReadingRoomPage courseReader={courseReader} />}
        />
        <Route path="/courses/:courseId" element={<div>Course detail</div>} />
        <Route path="/courses" element={<div>Course index</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const resources = [
  driveResource('lec1', 'OS Lecture 1', 'FILE1'),
  driveResource('lec2', 'OS Lecture 2', 'FILE2'),
  driveResource('lec3', 'OS Lecture 3', 'FILE3'),
];

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('ReadingRoomPage', () => {
  it('renders the actual resource selected by its stable ID', async () => {
    renderReader('/courses/os/lectures/lec2', createCourseReader(resources));

    expect(screen.getByLabelText('Loading resource')).toBeInTheDocument();
    const heading = await screen.findByRole('heading', {
      name: 'OS Lecture 2',
    });
    expect(heading).toBeInTheDocument();
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByRole('heading', { name: 'OS Lecture 1' })).toBeNull();
    expect(screen.getByText('OS Lecture 2 description')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2026')).toBeInTheDocument();
    expect(document.title).toBe(
      'OS Lecture 2 — Operating Systems | Sledge Classroom',
    );
  });

  it('renders previous, next and related category navigation', async () => {
    renderReader('/courses/os/lectures/lec2', createCourseReader(resources));
    await screen.findByRole('heading', { name: 'OS Lecture 2' });

    const previous = screen.getByRole('link', { name: /Previous.*OS Lecture 1/i });
    const next = screen.getByRole('link', { name: /Next.*OS Lecture 3/i });
    expect(previous).toHaveAttribute('href', '/courses/os/lectures/lec1');
    expect(next).toHaveAttribute('href', '/courses/os/lectures/lec3');

    expect(
      screen.getByRole('heading', { name: 'More in Lecture Slides' }),
    ).toBeInTheDocument();
    const relatedSection = screen.getByRole('region', {
      name: 'More in Lecture Slides',
    });
    const related = within(relatedSection).getByRole('link', {
      name: /OS Lecture 1/,
    });
    expect(related).toHaveAttribute('href', '/courses/os/lectures/lec1');
  });

  it('shows a not-found state for an unknown resource ID', async () => {
    renderReader(
      '/courses/os/lectures/does-not-exist',
      createCourseReader(resources),
    );

    expect(
      await screen.findByRole('heading', { name: 'Resource not found' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'This resource may have been removed, or the link is incomplete.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'OS Lecture 1' })).toBeNull();
    // Title updates in an effect; wait for it so a loaded CI machine cannot
    // race the assertion (this test was observed flaking under full-suite load).
    await waitFor(() =>
      expect(document.title).toBe('Resource not found | Sledge Classroom'),
    );
    expect(
      await screen.findByRole('button', { name: 'Back to Lecture Slides' }),
    ).toBeInTheDocument();
  });

  it('shows a course-not-found state for an unknown course deep link', async () => {
    renderReader('/courses/unknown/lectures/doc-1');

    expect(
      await screen.findByRole('heading', { name: 'Course not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This course link is incomplete or the course no longer exists.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the category-not-found message for an invalid category', async () => {
    renderReader('/courses/os/not-a-category/doc-1');

    expect(
      await screen.findByRole('heading', { name: 'Resource not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This resource category is not part of the course.'),
    ).toBeInTheDocument();
  });

  it('resolves multi-segment IDs exactly', async () => {
    const reader = createCourseReader([
      makeResource('week 1/notes.pdf', 'os', 'lectures', {
        name: 'Week 1 notes',
      }),
    ]);
    renderReader('/courses/os/lectures/week%201/notes.pdf', reader);

    expect(
      await screen.findByRole('heading', { name: 'Week 1 notes' }),
    ).toBeInTheDocument();
  });

  it('shows the error state and retries the repository read', async () => {
    let call = 0;
    const reader: CourseResourceReader = {
      listResources: vi.fn(
        async (_courseId, _category: FileCategory) => {
          call += 1;
          if (call === 1) {
            return repositoryFailure('firestore-read-failed', 'offline');
          }
          return repositorySuccess(resources);
        },
      ),
    };
    renderReader('/courses/os/lectures/lec2', reader);

    expect(
      await screen.findByRole('heading', {
        name: 'This resource could not be loaded',
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    expect(
      await screen.findByRole('heading', { name: 'OS Lecture 2' }),
    ).toBeInTheDocument();
    expect(reader.listResources).toHaveBeenCalledTimes(2);
  });

  it('lazily loads the Google Drive preview facade', async () => {
    renderReader('/courses/os/lectures/lec2', createCourseReader(resources));
    await screen.findByRole('heading', { name: 'OS Lecture 2' });

    expect(screen.queryByTitle('Preview of OS Lecture 2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Load preview/i }));

    const iframe = screen.getByTitle('Preview of OS Lecture 2');
    expect(iframe).toHaveAttribute(
      'src',
      'https://drive.google.com/file/d/FILE2/preview',
    );
    expect(iframe).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-popups',
    );

    fireEvent.load(iframe);
    expect(document.querySelector('.rr-stage')).toHaveClass('is-loaded');
  });

  it('opens the same preview from the View online action', async () => {
    renderReader('/courses/os/lectures/lec2', createCourseReader(resources));
    await screen.findByRole('heading', { name: 'OS Lecture 2' });

    fireEvent.click(screen.getByRole('button', { name: /View online/i }));

    expect(screen.getByTitle('Preview of OS Lecture 2')).toHaveAttribute(
      'src',
      'https://drive.google.com/file/d/FILE2/preview',
    );
  });

  it('renders the direct Drive download link and external link', async () => {
    renderReader('/courses/os/lectures/lec2', createCourseReader(resources));
    await screen.findByRole('heading', { name: 'OS Lecture 2' });

    expect(
      screen.getByRole('link', { name: /Download/i }),
    ).toHaveAttribute(
      'href',
      'https://drive.google.com/uc?export=download&id=FILE2',
    );
    expect(
      screen.getByRole('link', { name: /Open in Google Drive/i }),
    ).toHaveAttribute(
      'href',
      'https://drive.google.com/file/d/FILE2/view?usp=sharing',
    );
  });

  it('explains when in-site preview is unavailable for external links', async () => {
    const reader = createCourseReader([
      makeResource('ext1', 'os', 'lectures', {
        name: 'External notes',
        url: 'https://example.com/notes.pdf',
        previewURL: 'https://example.com/notes.pdf',
        downloadURL: 'https://example.com/notes.pdf',
      }),
    ]);
    renderReader('/courses/os/lectures/ext1', reader);

    expect(
      await screen.findByRole('heading', { name: "In-site preview isn't available" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This file is hosted outside Google Drive, so Sledge cannot embed it.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load preview/i })).toBeNull();
  });

  it('navigates back to the course category', async () => {
    renderReader('/courses/os/lectures/lec2', createCourseReader(resources));
    await screen.findByRole('heading', { name: 'OS Lecture 2' });

    fireEvent.click(
      screen.getAllByRole('button', {
        name: /Back to Lecture Slides/i,
      })[0],
    );

    expect(await screen.findByText('Course detail')).toBeInTheDocument();
  });
});
