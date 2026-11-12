// Reading Room & resource viewer — migrated from the legacy Phase 4B reader
// (`#course-reader-view` in app.js).
//
// Legacy deep links keep the shape `#course-<courseId>/<category>/<docId>`;
// `legacyHashToRoute` rewrites those to the modern path
// `/courses/<courseId>/<category>/<docId>` (see lib/legacyHash.ts). The reader
// looks the resource up by its stable Firestore document ID, so an unknown ID
// renders a not-found state and never falls back to another resource.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { FileCategory, ResourceFile } from '@/types';
import {
  getCourse,
  getCoursePath,
  type CourseResourceReader,
} from '@/features/courses/courseData';
import {
  describeResourceDescription,
  getResourceIconInfo,
} from '@/features/courses/resourceHelpers';
import { courseRepository } from '@/services/repositories';
import {
  isDirectDownloadUrl,
  parseResourceUrl,
  safeHttpUrl,
} from '@/lib/resourceUrl';
import {
  buildReaderPath,
  getReaderCategoryMeta,
  rememberReaderFocus,
} from './readerData';

type ReaderLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; files: ResourceFile[] }
  | { status: 'error' };

export interface ReadingRoomProps {
  courseReader?: CourseResourceReader;
}

interface ReaderShellProps {
  children: ReactNode;
}

function ReaderShell({ children }: ReaderShellProps) {
  return (
    <section className="page page-courses active" id="page-courses">
      <span id="courses" className="anchor-target" aria-hidden="true" />
      <div className="course-detail-view reader-open" id="course-detail-view">
        <div
          className="course-reader-view"
          id="course-reader-view"
          aria-live="polite"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function ReaderSkeleton() {
  return (
    <div
      className="reading-room reading-room--loading"
      aria-label="Loading resource"
      aria-busy="true"
    >
      <div className="rr-skeleton rr-skeleton--crumb" />
      <div className="rr-skeleton rr-skeleton--eyebrow" />
      <div className="rr-skeleton rr-skeleton--title" />
      <div className="rr-skeleton rr-skeleton--title rr-skeleton--title-short" />
      <div className="rr-skeleton rr-skeleton--line" />
      <div className="rr-skeleton rr-skeleton--preview" />
    </div>
  );
}

function ReaderHeading({
  title,
  headingRef,
}: {
  title: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <h1
      className="rr-title"
      id="rr-title"
      ref={headingRef}
      tabIndex={-1}
    >
      {title}
    </h1>
  );
}

interface ReaderPreviewProps {
  info: ReturnType<typeof parseResourceUrl>;
  file: ResourceFile;
  requested: number;
}

function ReaderPreview({ info, file, requested }: ReaderPreviewProps) {
  const [phase, setPhase] = useState<'facade' | 'loading' | 'loaded' | 'failed'>(
    'facade',
  );
  const [failure, setFailure] = useState('');
  const [loadToken, setLoadToken] = useState(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const load = useCallback(() => {
    if (!info.embedUrl) return;
    clearTimer();
    setFailure('');
    setPhase('loading');
    setLoadToken((token) => token + 1);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setFailure('The preview took too long to respond.');
      setPhase('failed');
    }, 15000);
  }, [clearTimer, info.embedUrl]);

  const handleLoad = useCallback(() => {
    clearTimer();
    setPhase('loaded');
  }, [clearTimer]);

  const handleError = useCallback(() => {
    clearTimer();
    setFailure('The preview could not be loaded.');
    setPhase('failed');
  }, [clearTimer]);

  useEffect(() => {
    if (requested > 0) load();
  }, [requested, load]);

  const busy = phase === 'loading';

  return (
    <section
      className="rr-preview"
      id="rr-preview-region"
      aria-label="Document preview"
      aria-busy={busy || undefined}
    >
      <div className="rr-preview-head">
        <span className="rr-kicker">In-site preview</span>
        <span className="rr-preview-source">{info.source}</span>
      </div>
      <div
        className={`rr-stage${phase === 'loaded' ? ' is-loaded' : ''}`}
        id="rr-preview-stage"
      >
        {phase === 'facade' ? (
          <div className="rr-facade" id="rr-facade">
            <div
              className={`rr-facade-icon ${
                getResourceIconInfo(file.type || file.name).type
              }`}
              aria-hidden="true"
            >
              <i className={getResourceIconInfo(file.type || file.name).icon} />
            </div>
            <p className="rr-kicker">In-site preview</p>
            <h2>Read it here</h2>
            <p className="rr-facade-copy">
              This document loads from {info.source} only when you ask. It may
              ask you to sign in with a Google account that has access.
            </p>
            <button
              type="button"
              className="btn btn-primary rr-load-btn"
              onClick={load}
              data-rr-load-preview
              aria-controls="rr-preview-region"
            >
              <i className="fas fa-book-open" aria-hidden="true" /> Load preview
            </button>
            <p className="rr-facade-note">
              Nothing loads automatically.{' '}
              <a
                href={info.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open externally
              </a>{' '}
              instead.
            </p>
          </div>
        ) : null}

        {phase === 'loading' ? (
          <div className="rr-preview-loading" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>Loading preview…</p>
            <p className="rr-preview-note">
              If Google asks you to sign in, your account needs access to this
              file.
            </p>
          </div>
        ) : null}

        {phase === 'loading' || phase === 'loaded' ? (
          <iframe
            className="rr-iframe"
            key={loadToken}
            src={info.embedUrl}
            title={`Preview of ${file.name || 'resource'}`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups"
            allow="fullscreen"
            allowFullScreen
            onLoad={handleLoad}
            onError={handleError}
          />
        ) : null}

        {phase === 'failed' ? (
          <div className="rr-preview-fallback" role="alert">
            <i className="fas fa-triangle-exclamation" aria-hidden="true" />
            <h2>Preview didn&apos;t load</h2>
            <p>
              {failure} Google may restrict embedding for this file, or the
              viewer may need a signed-in account.
            </p>
            <div className="rr-fallback-actions">
              <a
                className="btn btn-primary btn-sm"
                href={info.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-external-link-alt" aria-hidden="true" />{' '}
                Open externally
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={load}
              >
                <i className="fas fa-redo" aria-hidden="true" /> Try again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface ReaderNotFoundProps {
  reason: 'course' | 'category' | 'missing';
  courseName?: string | null;
  categoryLabel?: string | null;
  onBack: () => void;
  focusRef: RefObject<HTMLHeadingElement | null>;
}

function ReaderNotFound({
  reason,
  courseName,
  categoryLabel,
  onBack,
  focusRef,
}: ReaderNotFoundProps) {
  const title =
    reason === 'course' ? 'Course not found' : 'Resource not found';
  const message =
    reason === 'course'
      ? 'This course link is incomplete or the course no longer exists.'
      : reason === 'category'
        ? 'This resource category is not part of the course.'
        : 'This resource may have been removed, or the link is incomplete.';
  const canReturn = reason === 'missing' && Boolean(courseName && categoryLabel);

  return (
    <div className="reading-room reading-room--state">
      <div className="rr-topline">
        <button type="button" className="rr-back-btn" onClick={onBack}>
          <i className="fas fa-arrow-left" aria-hidden="true" /> Back to the
          Archive
        </button>
      </div>
      <div className="rr-state">
        <i className="fas fa-compass" aria-hidden="true" />
        <p className="rr-kicker">The Reading Room</p>
        <h1 ref={focusRef} tabIndex={-1}>
          {title}
        </h1>
        <p>{message}</p>
        {canReturn ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onBack}
          >
            Back to {categoryLabel}
          </button>
        ) : (
          <Link className="btn btn-primary btn-sm" to="/courses">
            Back to the Archive
          </Link>
        )}
      </div>
    </div>
  );
}

export function ReadingRoomPage({
  courseReader = courseRepository,
}: ReadingRoomProps) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const course = getCourse(params.courseId);
  const category = (params.category ?? '').toLowerCase();
  const docId = (params['*'] ?? '').replace(/^\/+/, '');
  const meta = getReaderCategoryMeta(category);
  const valid = Boolean(course && meta && docId);
  const categoryKey = meta ? (category as FileCategory) : null;

  const [state, setState] = useState<ReaderLoadState>(
    valid ? { status: 'loading' } : { status: 'idle' },
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [previewRequest, setPreviewRequest] = useState<{
    id: string;
    count: number;
  }>({ id: '', count: 0 });
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const stateHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const baseTitleRef = useRef<string | null>(null);
  if (baseTitleRef.current === null) baseTitleRef.current = document.title;

  const depth =
    typeof (location.state as { readerDepth?: unknown } | null)?.readerDepth ===
    'number'
      ? ((location.state as { readerDepth: number }).readerDepth ?? 0)
      : 0;

  useEffect(() => {
    if (!course || !categoryKey || !docId) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    courseReader
      .listResources(course.id, categoryKey)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setState({ status: 'error' });
        } else {
          setState({ status: 'success', files: result.data ?? [] });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [course, categoryKey, docId, courseReader, reloadToken]);

  const files = state.status === 'success' ? state.files : [];
  const index = state.status === 'success' ? files.findIndex((f) => f.id === docId) : -1;
  const selected = index >= 0 ? files[index] : null;

  const goBack = useCallback(() => {
    if (!course || !meta) {
      navigate('/courses');
      return;
    }
    rememberReaderFocus({ courseId: course.id, category, docId });
    if (depth > 0) {
      navigate(-depth);
      return;
    }
    navigate(getCoursePath(course.id, { mode: meta.mode, tab: meta.tab }), {
      state: { returnFocus: true },
    });
  }, [course, meta, category, docId, depth, navigate]);

  useEffect(() => {
    if (selected) headingRef.current?.focus({ preventScroll: true });
  }, [selected]);

  useEffect(() => {
    if (state.status === 'idle' || state.status === 'error') {
      stateHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [state.status]);

  useEffect(
    () => () => {
      if (baseTitleRef.current !== null) {
        document.title = baseTitleRef.current;
      }
    },
    [],
  );

  useEffect(() => {
    if (selected && course) {
      document.title = `${selected.name || 'Untitled resource'} — ${course.name} | Sledge Classroom`;
      return;
    }
    if (!course) {
      document.title = 'Course not found | Sledge Classroom';
      return;
    }
    if (state.status === 'error') {
      document.title = 'Resource unavailable | Sledge Classroom';
      return;
    }
    if (state.status === 'success' || !meta || !docId) {
      document.title = 'Resource not found | Sledge Classroom';
    }
  }, [selected, course, state.status, meta, docId]);

  if (!course || !meta || !docId) {
    return (
      <ReaderShell>
        <ReaderNotFound
          reason={!course ? 'course' : 'category'}
          courseName={course?.name ?? null}
          categoryLabel={meta?.label ?? null}
          onBack={goBack}
          focusRef={stateHeadingRef}
        />
      </ReaderShell>
    );
  }

  if (state.status === 'error') {
    return (
      <ReaderShell>
        <div className="reading-room reading-room--state">
          <div className="rr-topline">
            <button type="button" className="rr-back-btn" onClick={goBack}>
              <i className="fas fa-arrow-left" aria-hidden="true" /> Back to the
              Archive
            </button>
          </div>
          <div className="rr-state">
            <i className="fas fa-cloud-exclamation" aria-hidden="true" />
            <p className="rr-kicker">The Reading Room</p>
            <h1 ref={stateHeadingRef} tabIndex={-1}>
              This resource could not be loaded
            </h1>
            <p>
              We could not reach the library. Check your connection and try
              again.
            </p>
            <div className="rr-state-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setReloadToken((token) => token + 1)}
              >
                <i className="fas fa-redo" aria-hidden="true" /> Retry
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={goBack}
              >
                Back to {meta.label}
              </button>
            </div>
          </div>
        </div>
      </ReaderShell>
    );
  }

  if (state.status === 'loading') {
    return (
      <ReaderShell>
        <ReaderSkeleton />
      </ReaderShell>
    );
  }

  if (!selected) {
    return (
      <ReaderShell>
        <ReaderNotFound
          reason="missing"
          courseName={course.name}
          categoryLabel={meta.label}
          onBack={goBack}
          focusRef={stateHeadingRef}
        />
      </ReaderShell>
    );
  }

  const iconInfo = getResourceIconInfo(selected.type || selected.name);
  const viewInfo = parseResourceUrl(selected.previewURL || selected.url);
  const externalInfo = parseResourceUrl(
    selected.url || selected.previewURL || selected.downloadURL,
  );
  const downloadCandidate = safeHttpUrl(selected.downloadURL);
  const showDownload = Boolean(
    downloadCandidate &&
      downloadCandidate !== viewInfo.url &&
      isDirectDownloadUrl(downloadCandidate),
  );
  const canPreview = Boolean(viewInfo.embedUrl);
  const externalUrl =
    externalInfo.kind !== 'invalid'
      ? externalInfo.url
      : viewInfo.kind !== 'invalid'
        ? viewInfo.url
        : '';
  const externalLabel =
    externalInfo.externalLabel ||
    viewInfo.externalLabel ||
    'Open external link';
  const source =
    viewInfo.kind !== 'invalid' ? viewInfo.source : externalInfo.source;
  const title = selected.name || 'Untitled resource';
  const date = selected.date || 'Date not recorded';
  const description = describeResourceDescription(selected.description);

  let unavailableReason = 'This link opens outside Sledge Classroom.';
  if (viewInfo.kind === 'folder') {
    unavailableReason =
      'Google Drive folders cannot be embedded inside Sledge Classroom.';
  } else if (viewInfo.kind === 'external') {
    unavailableReason =
      'This file is hosted outside Google Drive, so Sledge cannot embed it.';
  } else if (viewInfo.kind === 'invalid') {
    unavailableReason = 'This resource does not have a valid preview link.';
  }

  const prevFile = index > 0 ? files[index - 1] : null;
  const nextFile = index < files.length - 1 ? files[index + 1] : null;
  const related = files
    .map((entry, entryIndex) => ({ entry, entryIndex }))
    .filter((item) => item.entryIndex !== index)
    .slice(0, 4);

  const readerState = { readerDepth: depth + 1 };

  return (
    <ReaderShell>
      <article className="reading-room" aria-labelledby="rr-title">
        <div className="rr-topline">
          <button type="button" className="rr-back-btn" onClick={goBack}>
            <i className="fas fa-arrow-left" aria-hidden="true" /> Back to{' '}
            {meta.label}
          </button>
          <nav className="rr-breadcrumb" aria-label="Breadcrumb">
            <Link to="/courses">Courses</Link>
            <span aria-hidden="true">/</span>
            <Link
              to={getCoursePath(course.id, {
                mode: meta.mode,
                tab: meta.tab,
              })}
            >
              {course.name}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              to={getCoursePath(course.id, {
                mode: meta.mode,
                tab: meta.tab,
              })}
            >
              {meta.label}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
        </div>

        <header className="rr-header">
          <p className="rr-eyebrow">
            <span>{course.code}</span>
            <span aria-hidden="true">·</span>
            <span>{meta.label}</span>
            <span aria-hidden="true">·</span>
            <span>{iconInfo.label}</span>
          </p>
          <ReaderHeading title={title} headingRef={headingRef} />
          {description ? <p className="rr-desc">{description}</p> : null}
          <dl className="rr-meta">
            <div>
              <dt>Uploaded</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{source}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>{iconInfo.label}</dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>{course.code}</dd>
            </div>
          </dl>
        </header>

        <div className="rr-actions">
          {canPreview ? (
            <button
              type="button"
              className="btn btn-primary rr-action-primary"
              onClick={() =>
                setPreviewRequest((current) => ({
                  id: selected.id,
                  count: current.id === selected.id ? current.count + 1 : 1,
                }))
              }
              aria-controls="rr-preview-region"
            >
              <i className="fas fa-book-open" aria-hidden="true" /> View online
            </button>
          ) : externalUrl ? (
            <a
              className="btn btn-primary rr-action-primary"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i
                className="fas fa-arrow-up-right-from-square"
                aria-hidden="true"
              />{' '}
              {externalLabel}
            </a>
          ) : null}
          {canPreview && externalUrl ? (
            <a
              className="btn btn-ghost"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-external-link-alt" aria-hidden="true" />{' '}
              {externalLabel}
            </a>
          ) : null}
          {showDownload ? (
            <a
              className="btn btn-ghost"
              href={downloadCandidate}
              target="_blank"
              rel="noopener noreferrer"
              data-action="download"
            >
              <i className="fas fa-download" aria-hidden="true" /> Download
            </a>
          ) : null}
          {!canPreview && !externalUrl && !showDownload ? (
            <p className="rr-missing-link" role="alert">
              <i className="fas fa-link-slash" aria-hidden="true" />
              This resource has no usable link. An administrator can update it
              from the course category.
            </p>
          ) : null}
        </div>

        {canPreview ? (
          <ReaderPreview
            key={selected.id}
            info={viewInfo}
            file={selected}
            requested={
              previewRequest.id === selected.id ? previewRequest.count : 0
            }
          />
        ) : (
          <section
            className="rr-preview"
            id="rr-preview-region"
            aria-label="Document preview"
          >
            <div className="rr-preview-head">
              <span className="rr-kicker">Preview unavailable</span>
              <span className="rr-preview-source">{source}</span>
            </div>
            <div className="rr-stage" id="rr-preview-stage">
              <div className="rr-unavailable">
                <i className="fas fa-external-link-alt" aria-hidden="true" />
                <h2>In-site preview isn&apos;t available</h2>
                <p>{unavailableReason}</p>
                {externalUrl ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i
                      className="fas fa-arrow-up-right-from-square"
                      aria-hidden="true"
                    />{' '}
                    {externalLabel}
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        )}

        <footer className="rr-footer">
          <div className="rr-footer-back">
            <button type="button" className="rr-text-link" onClick={goBack}>
              <i className="fas fa-arrow-left" aria-hidden="true" /> Back to{' '}
              {meta.label}
            </button>
          </div>
          {prevFile ? (
            <Link
              className="rr-nav-link rr-nav-prev"
              to={buildReaderPath(course.id, category as FileCategory, prevFile.id)}
              state={readerState}
              data-rr-open-resource={prevFile.id}
            >
              <span className="rr-nav-direction">
                <i className="fas fa-arrow-left" aria-hidden="true" /> Previous
              </span>
              <span className="rr-nav-name">
                {prevFile.name || 'Untitled resource'}
              </span>
            </Link>
          ) : (
            <span
              className="rr-nav-link rr-nav-disabled"
              aria-disabled="true"
              role="button"
              aria-label="No previous resource"
            >
              <span className="rr-nav-direction">
                <i className="fas fa-arrow-left" aria-hidden="true" /> Previous
              </span>
              <span className="rr-nav-name" />
            </span>
          )}
          {nextFile ? (
            <Link
              className="rr-nav-link rr-nav-next"
              to={buildReaderPath(course.id, category as FileCategory, nextFile.id)}
              state={readerState}
              data-rr-open-resource={nextFile.id}
            >
              <span className="rr-nav-direction">
                Next <i className="fas fa-arrow-right" aria-hidden="true" />
              </span>
              <span className="rr-nav-name">
                {nextFile.name || 'Untitled resource'}
              </span>
            </Link>
          ) : (
            <span
              className="rr-nav-link rr-nav-disabled"
              aria-disabled="true"
              role="button"
              aria-label="No next resource"
            >
              <span className="rr-nav-direction">
                Next <i className="fas fa-arrow-right" aria-hidden="true" />
              </span>
              <span className="rr-nav-name" />
            </span>
          )}
        </footer>

        {related.length ? (
          <section className="rr-related" aria-labelledby="rr-related-title">
            <div className="rr-related-head">
              <h2 id="rr-related-title">More in {meta.label}</h2>
              <button type="button" className="rr-text-link" onClick={goBack}>
                View all <i className="fas fa-arrow-right" aria-hidden="true" />
              </button>
            </div>
            <div className="rr-related-list">
              {related.map(({ entry }) => {
                const info = getResourceIconInfo(entry.type || entry.name);
                return (
                  <Link
                    className="rr-related-item"
                    key={entry.id}
                    to={buildReaderPath(
                      course.id,
                      category as FileCategory,
                      entry.id,
                    )}
                    state={readerState}
                    data-rr-open-resource={entry.id}
                  >
                    <span
                      className={`rr-related-icon ${info.type}`}
                      aria-hidden="true"
                    >
                      <i className={info.icon} />
                    </span>
                    <span className="rr-related-copy">
                      <span className="rr-related-name">
                        {entry.name || 'Untitled resource'}
                      </span>
                      <span className="rr-related-meta">
                        {info.label}
                        {entry.date ? ` · ${entry.date}` : ''}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </article>
    </ReaderShell>
  );
}

export const ReadingRoomRoute = ReadingRoomPage;

/**
 * `#reader` was not a route in the legacy app (the reader was always opened
 * for a specific resource). Keep the modern path harmless by returning to the
 * resource catalogue.
 */
export function ReadingRoomIndexRoute() {
  return <Navigate to="/courses" replace />;
}
