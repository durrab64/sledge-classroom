'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type {
  AuthContextValue,
  RepositoryResult,
  ResourceFile,
} from '@/types';
import {
  repositoryFailure,
  repositorySuccess,
} from '@/types';
import { AdminPage, AdminRoute } from '@/features/admin';
import type {
  AdminResourceReader,
  AdminResourceWriter,
} from '@/features/admin';
import type {
  ResourceCreateInput,
  ResourceMetadataOriginal,
  ResourceMetadataPatch,
} from '@/services/repositories/adminRepository';
import { createCourseReader, makeResource } from './fixtures';

const OWNER_UID = 'dRHxakX2iAWM4w1IqtYPLpCZrwr2';

let authState: AuthContextValue;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

function setAuth(overrides: Partial<AuthContextValue> = {}) {
  authState = {
    user: { uid: OWNER_UID, email: 'owner@example.com', emailVerified: true },
    status: 'authenticated',
    isAuthenticated: true,
    isOwner: true,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(async () => undefined),
    clearError: vi.fn(),
    ...overrides,
  };
}

function createWriter(
  overrides: Partial<AdminResourceWriter> = {},
): AdminResourceWriter {
  return {
    createResource: vi.fn(
      async (): Promise<RepositoryResult<{ id: string }>> =>
        repositorySuccess({ id: 'created-id' }),
    ),
    updateResourceMetadata: vi.fn(
      async (): Promise<RepositoryResult<null>> => repositorySuccess(null),
    ),
    deleteResource: vi.fn(
      async (): Promise<RepositoryResult<null>> => repositorySuccess(null),
    ),
    ...overrides,
  };
}

function renderPage(
  reader: AdminResourceReader,
  writer: AdminResourceWriter = createWriter(),
) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminPage reader={reader} writer={writer} />
    </MemoryRouter>,
  );
}

const lecture = makeResource('lec-1', 'stats', 'lectures', {
  name: 'Lecture 01',
  description: 'Introduction',
  type: 'pdf',
  url: 'https://drive.google.com/file/d/EXISTING/view',
  previewURL: 'https://drive.google.com/file/d/EXISTING/view',
  downloadURL: 'https://drive.google.com/uc?export=download&id=EXISTING',
  date: 'Nov 1, 2026',
});

beforeEach(() => {
  setAuth();
  vi.clearAllMocks();
});

describe('AdminPage authorization states (AdminRoute)', () => {
  function renderRoute() {
    return render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/login" element={<div>Login screen</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('shows a neutral loading state before auth resolves', () => {
    setAuth({ status: 'loading', isOwner: false, isAuthenticated: false, user: null });
    renderRoute();
    expect(screen.getByText('Signing in…')).toBeInTheDocument();
    expect(screen.queryByText('Resource Management')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated visitors to login without exposing admin UI', () => {
    setAuth({
      status: 'unauthenticated',
      isOwner: false,
      isAuthenticated: false,
      user: null,
    });
    renderRoute();
    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Resource Management')).not.toBeInTheDocument();
  });

  it('denies an authenticated non-owner account', () => {
    setAuth({
      user: { uid: 'someone-else', email: 'student@example.com', emailVerified: true },
      isOwner: false,
    });
    renderRoute();
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByText('Resource Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Add resource')).not.toBeInTheDocument();
  });

  it('surfaces an auth error and never renders protected content', () => {
    setAuth({
      status: 'error',
      isOwner: false,
      isAuthenticated: false,
      user: null,
      error: { code: 'auth/unavailable', message: 'Authentication unavailable.' },
    });
    renderRoute();
    expect(screen.getByText('Authentication unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Resource Management')).not.toBeInTheDocument();
  });

  it('renders the owner page for the verified owner UID', () => {
    renderRoute();
    expect(
      screen.getByRole('heading', { name: 'Resource Management' }),
    ).toBeInTheDocument();
  });
});

describe('AdminPage resource list', () => {
  it('loads resources for the selected course and category', async () => {
    const reader = createCourseReader([lecture]);
    renderPage(reader);

    expect(await screen.findByText('Lecture 01')).toBeInTheDocument();
    expect(reader.listResources).toHaveBeenCalledWith('stats', 'lectures');
    expect(screen.getByText('1 resource')).toBeInTheDocument();
  });

  it('renders an empty state when the section has no resources', async () => {
    renderPage(createCourseReader([]));
    expect(
      await screen.findByText('No resources in Lecture Slides'),
    ).toBeInTheDocument();
  });

  it('renders a retryable error state when the read fails', async () => {
    const reader = createCourseReader([], ['stats:lectures']);
    renderPage(reader);

    expect(
      await screen.findByText('Resources could not be loaded'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('renders only safe http(s) stored links in the Open action', async () => {
    const unsafe = makeResource('lec-2', 'stats', 'lectures', {
      name: 'Unsafe link',
      type: 'link',
      url: 'javascript:alert(1)',
      previewURL: 'javascript:alert(1)',
      downloadURL: 'data:text/html,hi',
    });
    renderPage(createCourseReader([lecture, unsafe]));

    expect(await screen.findByText('Unsafe link')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open Lecture 01 online/i }),
    ).toHaveAttribute('href', lecture.previewURL);
    expect(
      screen.queryByRole('link', { name: /Open Unsafe link online/i }),
    ).not.toBeInTheDocument();
  });
});

describe('AdminPage resource creation', () => {
  it('validates the form and never persists before confirmation', async () => {
    const reader = createCourseReader([]);
    const writer = createWriter();
    renderPage(reader, writer);

    await screen.findByText('No resources in Lecture Slides');
    fireEvent.click(screen.getAllByRole('button', { name: /Add resource/i })[0]);

    fireEvent.click(screen.getByRole('button', { name: /Save resource/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please enter a resource title.',
    );
    expect(writer.createResource).not.toHaveBeenCalled();
  });

  it('rejects an invalid link without persisting', async () => {
    const writer = createWriter();
    renderPage(createCourseReader([]), writer);

    await screen.findByText('No resources in Lecture Slides');
    fireEvent.click(screen.getAllByRole('button', { name: /Add resource/i })[0]);

    fireEvent.change(screen.getByLabelText('Resource title *'), {
      target: { value: 'Unsafe' },
    });
    fireEvent.change(screen.getByLabelText('Document / share link *'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save resource/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'not a valid http:// or https:// URL',
    );
    expect(writer.createResource).not.toHaveBeenCalled();
  });

  it('creates a resource through the confirmed upload path with normalized links', async () => {
    const reader = createCourseReader([]);
    const writer = createWriter();
    renderPage(reader, writer);

    await screen.findByText('No resources in Lecture Slides');
    fireEvent.click(screen.getAllByRole('button', { name: /Add resource/i })[0]);

    fireEvent.change(screen.getByLabelText('Resource title *'), {
      target: { value: 'Lecture 02' },
    });
    fireEvent.change(screen.getByLabelText('Document / share link *'), {
      target: { value: 'https://drive.google.com/file/d/NEWFILE/view?usp=sharing' },
    });
    fireEvent.change(screen.getByLabelText('Description / notes (optional)'), {
      target: { value: 'Hazards' },
    });

    expect(writer.createResource).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Save resource/i }));

    await waitFor(() => expect(writer.createResource).toHaveBeenCalledTimes(1));
    expect(writer.createResource).toHaveBeenCalledWith(
      'stats',
      'lectures',
      expect.objectContaining({
        name: 'Lecture 02',
        url: 'https://drive.google.com/file/d/NEWFILE/view?usp=sharing',
        previewURL:
          'https://drive.google.com/file/d/NEWFILE/view?usp=sharing',
        downloadURL:
          'https://drive.google.com/uc?export=download&id=NEWFILE',
        description: 'Hazards',
        type: 'ppt',
      }),
    );
    expect(await screen.findByText(/Resource added successfully/)).toBeInTheDocument();
  });

  it('blocks a duplicate link in the same course/category', async () => {
    const reader = createCourseReader([lecture]);
    const writer = createWriter();
    renderPage(reader, writer);

    await screen.findByText('Lecture 01');
    fireEvent.click(screen.getByRole('button', { name: /Add resource/i }));

    fireEvent.change(screen.getByLabelText('Resource title *'), {
      target: { value: 'Copy of lecture' },
    });
    fireEvent.change(screen.getByLabelText('Document / share link *'), {
      target: { value: 'https://drive.google.com/file/d/EXISTING/view?usp=copy' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save resource/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'already in this section',
    );
    expect(writer.createResource).not.toHaveBeenCalled();
  });

  it('ignores repeated submissions while a save is in flight', async () => {
    let resolveCreate: (value: RepositoryResult<{ id: string }>) => void = () => {};
    const pending = new Promise<RepositoryResult<{ id: string }>>((resolve) => {
      resolveCreate = resolve;
    });
    const writer = createWriter({
      createResource: vi.fn(() => pending),
    });
    renderPage(createCourseReader([]), writer);

    await screen.findByText('No resources in Lecture Slides');
    fireEvent.click(screen.getAllByRole('button', { name: /Add resource/i })[0]);

    fireEvent.change(screen.getByLabelText('Resource title *'), {
      target: { value: 'Async lecture' },
    });
    fireEvent.change(screen.getByLabelText('Document / share link *'), {
      target: { value: 'https://example.com/async.pdf' },
    });

    const submit = screen.getByRole('button', { name: /Save resource/i });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(writer.createResource).toHaveBeenCalledTimes(1));
    resolveCreate(repositorySuccess({ id: 'x' }));
    await screen.findByText(/Resource added successfully/);
  });

  it('surfaces repository failures from the create path', async () => {
    const writer = createWriter({
      createResource: vi.fn(async () =>
        repositoryFailure('resource-create-failed', 'permission-denied'),
      ),
    });
    renderPage(createCourseReader([]), writer);

    await screen.findByText('No resources in Lecture Slides');
    fireEvent.click(screen.getAllByRole('button', { name: /Add resource/i })[0]);
    fireEvent.change(screen.getByLabelText('Resource title *'), {
      target: { value: 'Denied' },
    });
    fireEvent.change(screen.getByLabelText('Document / share link *'), {
      target: { value: 'https://example.com/denied.pdf' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save resource/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('permission-denied');
  });
});

describe('AdminPage metadata editing', () => {
  it('saves name, description and type with the original stale snapshot', async () => {
    const writer = createWriter();
    renderPage(createCourseReader([lecture]), writer);

    await screen.findByText('Lecture 01');
    fireEvent.click(screen.getByRole('button', { name: /Edit Lecture 01/ }));

    fireEvent.change(screen.getByLabelText('Resource title *'), {
      target: { value: 'Lecture 01 (revised)' },
    });
    fireEvent.change(screen.getByLabelText('Description / notes (optional)'), {
      target: { value: 'Updated notes' },
    });
    fireEvent.change(screen.getByLabelText('Resource format *'), {
      target: { value: 'ppt' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save metadata/i }));

    await waitFor(() =>
      expect(writer.updateResourceMetadata).toHaveBeenCalledTimes(1),
    );
    expect(writer.updateResourceMetadata).toHaveBeenCalledWith(
      'stats',
      'lectures',
      'lec-1',
      {
        name: 'Lecture 01 (revised)',
        description: 'Updated notes',
        type: 'ppt',
      } satisfies ResourceMetadataPatch,
      {
        name: 'Lecture 01',
        description: 'Introduction',
        type: 'pdf',
        url: lecture.url,
        previewURL: lecture.previewURL,
        downloadURL: lecture.downloadURL,
        date: 'Nov 1, 2026',
      } satisfies ResourceMetadataOriginal,
    );
    expect(await screen.findByText('Metadata saved successfully.')).toBeInTheDocument();
  });

  it('rejects an empty title before persistence', async () => {
    const writer = createWriter();
    renderPage(createCourseReader([lecture]), writer);

    await screen.findByText('Lecture 01');
    fireEvent.click(screen.getByRole('button', { name: /Edit Lecture 01/ }));
    fireEvent.change(screen.getByLabelText('Resource title *'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save metadata/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid title.');
    expect(writer.updateResourceMetadata).not.toHaveBeenCalled();
  });

  it('shows the stale-conflict message and keeps the dialog open', async () => {
    const writer = createWriter({
      updateResourceMetadata: vi.fn(async () =>
        repositoryFailure(
          'resource-stale',
          'Resource changed since you loaded it. Reload and try again.',
        ),
      ),
    });
    renderPage(createCourseReader([lecture]), writer);

    await screen.findByText('Lecture 01');
    fireEvent.click(screen.getByRole('button', { name: /Edit Lecture 01/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save metadata/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Resource changed since you loaded it',
    );
    expect(
      screen.getByRole('button', { name: /Save metadata/i }),
    ).toBeInTheDocument();
  });
});

describe('AdminPage deletion', () => {
  it('requires confirmation and deletes only after it', async () => {
    const writer = createWriter();
    renderPage(createCourseReader([lecture]), writer);

    await screen.findByText('Lecture 01');
    fireEvent.click(screen.getByRole('button', { name: /Delete Lecture 01/ }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Firestore metadata only');
    expect(writer.deleteResource).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Delete resource/i }),
    );

    await waitFor(() =>
      expect(writer.deleteResource).toHaveBeenCalledWith(
        'stats',
        'lectures',
        'lec-1',
      ),
    );
    expect(await screen.findByText(/Resource deleted successfully/)).toBeInTheDocument();
  });

  it('cancelling the confirmation performs no write', async () => {
    const writer = createWriter();
    renderPage(createCourseReader([lecture]), writer);

    await screen.findByText('Lecture 01');
    fireEvent.click(screen.getByRole('button', { name: /Delete Lecture 01/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(writer.deleteResource).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('ignores repeated confirmation clicks while deleting', async () => {
    let resolveDelete: (value: RepositoryResult<null>) => void = () => {};
    const pending = new Promise<RepositoryResult<null>>((resolve) => {
      resolveDelete = resolve;
    });
    const writer = createWriter({
      deleteResource: vi.fn(() => pending),
    });
    renderPage(createCourseReader([lecture]), writer);

    await screen.findByText('Lecture 01');
    fireEvent.click(screen.getByRole('button', { name: /Delete Lecture 01/ }));
    const dialog = screen.getByRole('alertdialog');
    const confirm = within(dialog).getByRole('button', {
      name: /Delete resource/i,
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(writer.deleteResource).toHaveBeenCalledTimes(1));
    resolveDelete(repositorySuccess(null));
    await screen.findByText(/Resource deleted successfully/);
  });

  it('surfaces deletion failures and keeps the confirmation open', async () => {
    const writer = createWriter({
      deleteResource: vi.fn(async () =>
        repositoryFailure('resource-delete-failed', 'permission-denied'),
      ),
    });
    renderPage(createCourseReader([lecture]), writer);

    await screen.findByText('Lecture 01');
    fireEvent.click(screen.getByRole('button', { name: /Delete Lecture 01/ }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: /Delete resource/i,
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('permission-denied');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

describe('AdminPage dialogs', () => {
  it('closes the add dialog with Escape and returns focus to the trigger', async () => {
    renderPage(createCourseReader([]));
    await screen.findByText('No resources in Lecture Slides');

    const addButton = screen.getAllByRole('button', { name: /Add resource/i })[0];
    addButton.focus();
    fireEvent.click(addButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(addButton).toHaveFocus());
  });
});

// Type-only guard: the reader types are structurally compatible with the
// shared fixtures used above.
const _reader: AdminResourceReader = createCourseReader([]);
const _file: ResourceFile = lecture;
const _input: ResourceCreateInput = {
  name: 'x',
  url: 'https://example.com',
  previewURL: 'https://example.com',
  downloadURL: 'https://example.com',
  type: 'link',
  description: '',
  date: 'Nov 12, 2026',
};
void _reader;
void _file;
void _input;
