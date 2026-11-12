// Owner resource-management page.
//
// Migrates the legacy admin capabilities without inventing a new backend:
//   - choose a course/category and review its resources
//   - add a resource through the confirmed upload dialog (sole create path)
//   - edit name/description/type through the transactional metadata dialog
//   - delete the Firestore metadata document after an explicit confirmation
//
// Every write is owner-gated at the route level (ProtectedRoute) and enforced
// again by the unchanged Firestore rules. This page never deletes a Google
// Drive file: the legacy deletion semantics are metadata-only.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  CourseId,
  FileCategory,
  RepositoryError,
  RepositoryResult,
  ResourceFile,
} from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { COURSES } from '@/features/courses/courseData';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { adminRepository, courseRepository } from '@/services/repositories';
import type {
  ResourceCreateInput,
  ResourceMetadataOriginal,
  ResourceMetadataPatch,
} from '@/services/repositories/adminRepository';
import { AdminDialog } from './AdminDialog';
import {
  ADMIN_RESOURCE_TYPES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  buildMetadataPatch,
  buildResourceInput,
  categoriesForCourse,
  courseForId,
  initialUploadDraft,
  isDuplicateResource,
  metadataOriginalFrom,
  type UploadDraft,
} from './adminResource';

export interface AdminResourceReader {
  listResources(
    courseId: CourseId,
    category: FileCategory,
  ): Promise<RepositoryResult<ResourceFile[]>>;
}

export interface AdminResourceWriter {
  createResource(
    courseId: CourseId,
    category: FileCategory,
    input: ResourceCreateInput,
  ): Promise<RepositoryResult<{ id: string }>>;
  updateResourceMetadata(
    courseId: CourseId,
    category: FileCategory,
    resourceId: string,
    patch: ResourceMetadataPatch,
    original: ResourceMetadataOriginal,
  ): Promise<RepositoryResult<null>>;
  deleteResource(
    courseId: CourseId,
    category: FileCategory,
    resourceId: string,
  ): Promise<RepositoryResult<null>>;
}

export interface AdminPageProps {
  reader?: AdminResourceReader;
  writer?: AdminResourceWriter;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; files: ResourceFile[] }
  | { status: 'error'; error: RepositoryError };

interface Feedback {
  kind: 'success' | 'error';
  message: string;
}

function typeLabel(type: ResourceFile['type']): string {
  return (
    ADMIN_RESOURCE_TYPES.find((entry) => entry.value === type)?.label ??
    'Resource'
  );
}

function errorMessage(error: RepositoryError | null, fallback: string): string {
  return error?.message || fallback;
}

export function AdminPage({
  reader = courseRepository,
  writer = adminRepository,
}: AdminPageProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [courseId, setCourseId] = useState<CourseId>(COURSES[0].id);
  const [category, setCategory] = useState<FileCategory>('lectures');
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ResourceFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceFile | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const course = courseForId(courseId) ?? COURSES[0];
  const categories = useMemo(() => categoriesForCourse(course), [course]);
  const selectedCategory = categories.includes(category)
    ? category
    : categories[0];

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    reader
      .listResources(courseId, selectedCategory)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setState({ status: 'error', error: result.error });
          return;
        }
        setState({ status: 'success', files: result.data ?? [] });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          error: {
            code: 'admin-resource-load-failed',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [reader, courseId, selectedCategory, reloadToken]);

  const handleCreated = useCallback(
    (name: string) => {
      setAddOpen(false);
      setFeedback({
        kind: 'success',
        message: `Resource added successfully: ${name}`,
      });
      reload();
    },
    [reload],
  );

  const handleSaved = useCallback(() => {
    setEditTarget(null);
    setFeedback({ kind: 'success', message: 'Metadata saved successfully.' });
    reload();
  }, [reload]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || !writer || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const name = deleteTarget.name || 'this resource';
    const result = await writer.deleteResource(
      courseId,
      selectedCategory,
      deleteTarget.id,
    );
    setDeleteBusy(false);
    if (result.error) {
      setDeleteError(errorMessage(result.error, 'Unable to delete this resource.'));
      return;
    }
    setDeleteTarget(null);
    setFeedback({
      kind: 'success',
      message: `Resource deleted successfully: ${name}`,
    });
    reload();
  }, [courseId, deleteBusy, deleteTarget, reload, selectedCategory, writer]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate('/');
    } catch {
      setFeedback({
        kind: 'error',
        message: 'Could not sign out. Please try again.',
      });
    }
  }, [navigate, signOut]);

  const files = state.status === 'success' ? state.files : [];

  return (
    <section className="admin-page" id="page-admin">
      <span id="admin" className="anchor-target" aria-hidden="true" />

      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">
            <i className="fas fa-user-shield" aria-hidden="true" /> Owner access
          </p>
          <h1 className="admin-title">Resource Management</h1>
          <p className="admin-subtitle">
            Upload, edit and remove course resources. Writes are restricted by
            the existing Firestore owner rules.
          </p>
          {user?.email ? (
            <p className="admin-identity">
              Signed in as <strong>{user.email}</strong>
            </p>
          ) : null}
        </div>
        <div className="admin-header-actions">
          <Link to="/courses" className="btn btn-outline btn-sm">
            <i className="fas fa-book-open" aria-hidden="true" /> View courses
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void handleSignOut();
            }}
          >
            <i className="fas fa-sign-out-alt" aria-hidden="true" /> Sign out
          </button>
        </div>
      </header>

      <div className="admin-toolbar" role="group" aria-label="Resource filters">
        <div className="form-group admin-field">
          <label htmlFor="admin-course-select">Course</label>
          <select
            id="admin-course-select"
            className="form-input"
            value={course.id}
            onChange={(event) => {
              const nextCourse = courseForId(event.target.value) ?? COURSES[0];
              setCourseId(nextCourse.id);
              setCategory(categoriesForCourse(nextCourse)[0]);
              setFeedback(null);
            }}
          >
            {COURSES.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.code} — {entry.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group admin-field">
          <label htmlFor="admin-category-select">Category</label>
          <select
            id="admin-category-select"
            className="form-input"
            value={selectedCategory}
            onChange={(event) => {
              setCategory(event.target.value as FileCategory);
              setFeedback(null);
            }}
          >
            <optgroup label="Theory">
              {categories
                .filter((entry) =>
                  ['lectures', 'papers', 'related'].includes(entry),
                )
                .map((entry) => (
                  <option value={entry} key={entry}>
                    {CATEGORY_LABELS[entry]}
                  </option>
                ))}
            </optgroup>
            {categories.some((entry) => entry.startsWith('lab')) ? (
              <optgroup label="Lab">
                {categories
                  .filter((entry) => entry.startsWith('lab'))
                  .map((entry) => (
                    <option value={entry} key={entry}>
                      {CATEGORY_LABELS[entry]}
                    </option>
                  ))}
              </optgroup>
            ) : null}
          </select>
        </div>
        <div className="admin-toolbar-actions">
          <button
            ref={addButtonRef}
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setFeedback(null);
              setAddOpen(true);
            }}
          >
            <i className="fas fa-plus-circle" aria-hidden="true" /> Add resource
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`admin-feedback admin-feedback--${feedback.kind}`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          <i
            className={
              feedback.kind === 'success'
                ? 'fas fa-check-circle'
                : 'fas fa-exclamation-circle'
            }
            aria-hidden="true"
          />{' '}
          {feedback.message}
        </div>
      ) : null}

      <div className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>
              <i
                className={CATEGORY_ICONS[selectedCategory]}
                aria-hidden="true"
              />{' '}
              {CATEGORY_LABELS[selectedCategory]}
            </h2>
            <p>
              {course.code} · {course.name} · {selectedCategory}
            </p>
          </div>
          <span className="admin-count" aria-live="polite">
            {state.status === 'success'
              ? `${files.length} ${files.length === 1 ? 'resource' : 'resources'}`
              : '—'}
          </span>
        </div>

        {state.status === 'loading' ? (
          <div className="files-list" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                className="skeleton-card skeleton-row"
                aria-hidden="true"
                key={index}
              />
            ))}
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="empty-state admin-error-state" role="alert">
            <i className="fas fa-cloud-exclamation" aria-hidden="true" />
            <h3>Resources could not be loaded</h3>
            <p>
              {state.error.message
                ? state.error.message
                : 'Check your connection and try again.'}
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reload}>
              <i className="fas fa-redo" aria-hidden="true" /> Retry
            </button>
          </div>
        ) : null}

        {state.status === 'success' && files.length === 0 ? (
          <div className="empty-state">
            <i className={CATEGORY_ICONS[selectedCategory]} aria-hidden="true" />
            <h3>No resources in {CATEGORY_LABELS[selectedCategory]}</h3>
            <p>Add the first resource to this section.</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setFeedback(null);
                setAddOpen(true);
              }}
            >
              <i className="fas fa-plus-circle" aria-hidden="true" /> Add resource
            </button>
          </div>
        ) : null}

        {state.status === 'success' && files.length > 0 ? (
          <ul
            className="admin-resource-list"
            aria-label={`${CATEGORY_LABELS[selectedCategory]} resources`}
          >
            {files.map((file) => (
              <li className="admin-resource-row" key={file.id}>
                <span className="admin-resource-icon" aria-hidden="true">
                  <i className={CATEGORY_ICONS[selectedCategory]} />
                </span>
                <div className="admin-resource-info">
                  <span className="admin-resource-name" title={file.name}>
                    {file.name || 'Untitled resource'}
                  </span>
                  {file.description ? (
                    <span className="admin-resource-desc">
                      {file.description}
                    </span>
                  ) : null}
                  <span className="admin-resource-meta">
                    <span className="file-type-pill">{typeLabel(file.type)}</span>
                    {file.date ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{file.date}</span>
                      </>
                    ) : null}
                  </span>
                </div>
                <div className="admin-resource-actions">
                  {file.previewURL || file.url ? (
                    <a
                      href={file.previewURL || file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      aria-label={`Open ${file.name} online`}
                    >
                      <i className="fas fa-external-link-alt" aria-hidden="true" />
                      <span>Open</span>
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    aria-label={`Edit ${file.name}`}
                    onClick={() => {
                      setFeedback(null);
                      setEditTarget(file);
                    }}
                  >
                    <i className="fas fa-pen" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    aria-label={`Delete ${file.name}`}
                    onClick={() => {
                      setFeedback(null);
                      setDeleteError(null);
                      setDeleteTarget(file);
                    }}
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {addOpen ? (
        <UploadResourceDialog
          key={`${course.id}:${selectedCategory}`}
          courseId={course.id}
          category={selectedCategory}
          reader={reader}
          writer={writer}
          onClose={() => setAddOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}

      {editTarget ? (
        <EditMetadataDialog
          file={editTarget}
          courseId={course.id}
          category={selectedCategory}
          writer={writer}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      ) : null}

      <AdminDialog
        open={deleteTarget !== null}
        titleId="admin-delete-title"
        descriptionId="admin-delete-description"
        role="alertdialog"
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
      >
        <h2 id="admin-delete-title" className="admin-dialog-title">
          <i className="fas fa-trash-alt" aria-hidden="true" /> Delete resource
        </h2>
        <p id="admin-delete-description" className="admin-dialog-text">
          Delete “{deleteTarget?.name || 'this resource'}”? This removes the
          Firestore metadata only and cannot be undone. The original Google
          Drive file is not deleted.
        </p>
        {deleteError ? (
          <p className="form-error" role="alert">
            {deleteError}
          </p>
        ) : null}
        <div className="admin-dialog-footer">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={deleteBusy}
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={deleteBusy}
            onClick={() => {
              void confirmDelete();
            }}
          >
            {deleteBusy ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true" />{' '}
                Deleting…
              </>
            ) : (
              <>
                <i className="fas fa-trash-alt" aria-hidden="true" /> Delete
                resource
              </>
            )}
          </button>
        </div>
      </AdminDialog>
    </section>
  );
}

interface UploadResourceDialogProps {
  courseId: CourseId;
  category: FileCategory;
  reader: AdminResourceReader;
  writer?: AdminResourceWriter;
  onClose: () => void;
  onCreated: (name: string) => void;
}

function UploadResourceDialog({
  courseId,
  category,
  reader,
  writer,
  onClose,
  onCreated,
}: UploadResourceDialogProps) {
  const [draft, setDraft] = useState<UploadDraft>(() =>
    initialUploadDraft(category),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);

    const built = buildResourceInput({
      title: draft.title,
      url: draft.url,
      type: draft.type,
      description: draft.description,
    });
    if (!built.ok) {
      setError(built.message);
      if (built.field === 'title') titleRef.current?.focus();
      if (built.field === 'url') urlRef.current?.focus();
      return;
    }

    if (!writer) {
      setError('The resource service is unavailable.');
      return;
    }

    setBusy(true);
    try {
      // Duplicate detection is scoped to this course/category and compares
      // normalized Drive/Docs keys, exactly like the legacy workflow.
      const existing = await reader.listResources(courseId, category);
      if (existing.error) {
        setError(
          'We could not check this section for duplicates. Please try again.',
        );
        return;
      }
      if (isDuplicateResource(built.input.url, existing.data ?? [])) {
        setError(
          'That link is already in this section. Choose a different file or section.',
        );
        urlRef.current?.focus();
        return;
      }

      const result = await writer.createResource(
        courseId,
        category,
        built.input,
      );
      if (result.error) {
        setError(
          errorMessage(
            result.error,
            'Unable to save this resource. Please try again.',
          ),
        );
        return;
      }
      onCreated(built.input.name);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to save this resource. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminDialog
      open
      titleId="admin-upload-title"
      descriptionId="admin-upload-description"
      initialFocusRef={titleRef}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <h2 id="admin-upload-title" className="admin-dialog-title">
        <i className="fas fa-link" aria-hidden="true" /> Add{' '}
        {CATEGORY_LABELS[category]}
      </h2>
      <p id="admin-upload-description" className="admin-dialog-text">
        Paste an existing Google Drive, Docs, OneDrive, Dropbox or PDF link.
        Sledge stores the link and never uploads file bytes itself.
      </p>
      <form
        className="admin-dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="form-group">
          <label htmlFor="admin-resource-title">Resource title *</label>
          <input
            ref={titleRef}
            id="admin-resource-title"
            className="form-input"
            type="text"
            value={draft.title}
            maxLength={200}
            disabled={busy}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
          />
        </div>
        <div className="form-group">
          <label htmlFor="admin-resource-url">Document / share link *</label>
          <input
            ref={urlRef}
            id="admin-resource-url"
            className="form-input"
            type="url"
            placeholder="https://drive.google.com/file/d/..."
            value={draft.url}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                url: event.target.value,
              }))
            }
          />
          <p className="form-hint">
            Google Drive, Google Docs, OneDrive, Dropbox or any PDF/web link.
            Drive sharing should be “Anyone with the link can view”.
          </p>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="admin-resource-type">Resource format *</label>
            <select
              id="admin-resource-type"
              className="form-input"
              value={draft.type}
              disabled={busy}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as UploadDraft['type'],
                }))
              }
            >
              {ADMIN_RESOURCE_TYPES.map((type) => (
                <option value={type.value} key={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="admin-resource-description">
            Description / notes (optional)
          </label>
          <input
            id="admin-resource-description"
            className="form-input"
            type="text"
            maxLength={280}
            value={draft.description}
            disabled={busy}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="admin-dialog-footer">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true" />{' '}
                Saving…
              </>
            ) : (
              <>
                <i className="fas fa-plus-circle" aria-hidden="true" /> Save
                resource
              </>
            )}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

interface EditMetadataDialogProps {
  file: ResourceFile;
  courseId: CourseId;
  category: FileCategory;
  writer?: AdminResourceWriter;
  onClose: () => void;
  onSaved: () => void;
}

function EditMetadataDialog({
  file,
  courseId,
  category,
  writer,
  onClose,
  onSaved,
}: EditMetadataDialogProps) {
  const [name, setName] = useState(file.name);
  const [description, setDescription] = useState(file.description);
  const [type, setType] = useState(file.type);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);

    const built = buildMetadataPatch({ name, description, type });
    if (!built.ok) {
      setError(built.message);
      if (built.field === 'name') nameRef.current?.focus();
      return;
    }

    if (!writer) {
      setError('The resource service is unavailable.');
      return;
    }

    setBusy(true);
    try {
      const result = await writer.updateResourceMetadata(
        courseId,
        category,
        file.id,
        built.patch,
        metadataOriginalFrom(file),
      );
      if (result.error) {
        setError(
          errorMessage(result.error, 'Could not save metadata. Please try again.'),
        );
        return;
      }
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not save metadata. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminDialog
      open
      titleId="admin-edit-title"
      descriptionId="admin-edit-description"
      initialFocusRef={nameRef}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <h2 id="admin-edit-title" className="admin-dialog-title">
        <i className="fas fa-pen" aria-hidden="true" /> Edit metadata
      </h2>
      <p id="admin-edit-description" className="admin-dialog-text">
        Update the title, description or format. The link and date stay
        unchanged. If the resource changed since this page loaded, the save is
        rejected instead of overwriting it.
      </p>
      <form
        className="admin-dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="form-group">
          <label htmlFor="admin-edit-name">Resource title *</label>
          <input
            ref={nameRef}
            id="admin-edit-name"
            className="form-input"
            type="text"
            maxLength={120}
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="admin-edit-type">Resource format *</label>
            <select
              id="admin-edit-type"
              className="form-input"
              value={type}
              disabled={busy}
              onChange={(event) =>
                setType(event.target.value as ResourceFile['type'])
              }
            >
              {ADMIN_RESOURCE_TYPES.map((entry) => (
                <option value={entry.value} key={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="admin-edit-resource-description">
            Description / notes (optional)
          </label>
          <input
            id="admin-edit-resource-description"
            className="form-input"
            type="text"
            maxLength={280}
            value={description}
            disabled={busy}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="admin-dialog-footer">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true" />{' '}
                Saving…
              </>
            ) : (
              <>
                <i className="fas fa-check" aria-hidden="true" /> Save metadata
              </>
            )}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

/** Route wrapper: owner-only admin page, preserving the existing guard. */
export function AdminRoute() {
  return (
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  );
}
