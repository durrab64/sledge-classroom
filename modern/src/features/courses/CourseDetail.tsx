// Course detail view — migrated from the legacy course detail, Theory/Lab
// mode switcher, and four resource tabs. Upload/edit/delete controls are
// admin write workflows and are deferred, so they are not rendered.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { FileCategory, RepositoryError, ResourceFile } from '@/types';
import {
  COURSE_TAB_NAMES,
  getCategoryForTab,
  getCourse,
  loadCourseMode,
  pad2,
  type CourseMode,
  type CourseModeData,
  type CourseResourceReader,
  type CourseTab,
  type EventReader,
} from './courseData';
import { EventCard } from '@/components/events/EventCard';
import { ResourceRow } from './ResourceRow';
import { courseRepository, eventRepository } from '@/services/repositories';

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: RepositoryError };

const TAB_ICONS: Record<CourseTab, string> = {
  lectures: 'fas fa-chalkboard',
  'past-papers': 'fas fa-scroll',
  related: 'fas fa-paperclip',
  'course-calendar': 'fas fa-calendar-day',
};

const THEORY_LABELS: Record<CourseTab, string> = {
  lectures: 'Lecture Slides',
  'past-papers': 'Past Papers',
  related: 'Related Materials',
  'course-calendar': 'Calendar',
};

const LAB_LABELS: Record<CourseTab, string> = {
  lectures: 'Lab Manuals',
  'past-papers': 'Lab Past Papers',
  related: 'Code & Tasks',
  'course-calendar': 'Lab Schedule',
};

const THEORY_TITLES: Record<Exclude<CourseTab, 'course-calendar'>, string> = {
  lectures: 'Lecture Slides',
  'past-papers': 'Past Papers',
  related: 'Related Materials',
};

const LAB_TITLES: Record<Exclude<CourseTab, 'course-calendar'>, string> = {
  lectures: 'Lab Manuals & Experiments',
  'past-papers': 'Lab Past Papers & Viva',
  related: 'Code & Lab Tasks',
};

const EMPTY_MESSAGES: Record<
  FileCategory | 'course-calendar',
  { icon: string; title: string; desc: string }
> = {
  lectures: {
    icon: 'fas fa-chalkboard',
    title: 'No Lecture Slides Yet',
    desc: 'Theory lecture slides and presentations will appear here.',
  },
  papers: {
    icon: 'fas fa-scroll',
    title: 'No Past Papers Yet',
    desc: 'Theory exam past papers will appear here.',
  },
  related: {
    icon: 'fas fa-paperclip',
    title: 'No Related Materials Yet',
    desc: 'Reference notes, books, and study guides will appear here.',
  },
  lab: {
    icon: 'fas fa-flask',
    title: 'No Lab Manuals Yet',
    desc: 'Lab manuals, experiment sheets, and guidelines will appear here.',
  },
  lab_papers: {
    icon: 'fas fa-scroll',
    title: 'No Lab Past Papers Yet',
    desc: 'Lab exam past papers, viva questions, and practical solutions will appear here.',
  },
  lab_tasks: {
    icon: 'fas fa-laptop-code',
    title: 'No Code or Lab Tasks Yet',
    desc: 'Sample codes, starter projects, and lab assignments will appear here.',
  },
  'course-calendar': {
    icon: 'fas fa-calendar-plus',
    title: 'No Events Scheduled',
    desc: 'Quizzes, assignments, and presentations will appear here.',
  },
};

export interface CourseDetailProps {
  courseReader?: CourseResourceReader;
  eventReader?: EventReader;
}

export function CourseDetail({
  courseReader = courseRepository,
  eventReader = eventRepository,
}: CourseDetailProps) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const course = getCourse(courseId);
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<LoadState<CourseModeData>>({
    status: 'loading',
  });

  const hasLab = course?.hasLab ?? false;
  const mode: CourseMode =
    hasLab && searchParams.get('mode') === 'lab' ? 'lab' : 'theory';
  const tabParam = searchParams.get('tab');
  const tab: CourseTab = COURSE_TAB_NAMES.includes(tabParam as CourseTab)
    ? (tabParam as CourseTab)
    : 'lectures';
  // A bench opened from Labs keeps its Labs origin across mode/tab changes so
  // the back action can return to the bench directory.
  const fromLabs = searchParams.get('from') === 'labs';

  useEffect(() => {
    if (!course) return;
    let cancelled = false;
    setState({ status: 'loading' });
    loadCourseMode(
      courseReader,
      eventReader,
      course.id,
      mode,
    )
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setState({ status: 'error', error: result.error });
        } else {
          setState({ status: 'success', data: result.data! });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          error: {
            code: 'course-load-failed',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [course, courseReader, eventReader, mode, reloadToken]);

  const updateRoute = useCallback(
    (nextMode: CourseMode, nextTab: CourseTab) => {
      if (!course) return;
      const params = new URLSearchParams();
      if (nextMode === 'lab') params.set('mode', 'lab');
      if (nextTab !== 'lectures') params.set('tab', nextTab);
      if (fromLabs) params.set('from', 'labs');
      const query = params.toString();
      navigate(`/courses/${course.id}${query ? `?${query}` : ''}`);
    },
    [course, fromLabs, navigate],
  );

  const switchMode = useCallback(
    (nextMode: CourseMode) => {
      if (nextMode === mode) return;
      updateRoute(nextMode, tab);
    },
    [mode, tab, updateRoute],
  );

  const switchTab = useCallback(
    (nextTab: CourseTab) => {
      updateRoute(mode, nextTab);
    },
    [mode, updateRoute],
  );

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const tabs = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]',
        ),
      );
      const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (index < 0) return;

      let next: number | null = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft')
        next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next === null) return;

      event.preventDefault();
      const nextTab = tabs[next].dataset.tab as CourseTab;
      switchTab(nextTab);
      tabs[next].focus();
    },
    [switchTab],
  );

  const labels = mode === 'lab' ? LAB_LABELS : THEORY_LABELS;
  const titles = mode === 'lab' ? LAB_TITLES : THEORY_TITLES;
  const data = state.status === 'success' ? state.data : null;
  const category = getCategoryForTab(tab, mode);
  const files: ResourceFile[] = category ? (data?.files[category] ?? []) : [];
  const tabCounts = useMemo(
    () =>
      data
        ? [
            data.counts.primary,
            data.counts.papers,
            data.counts.tertiary,
            data.events.length,
          ]
        : null,
    [data],
  );

  if (!course) {
    return <Navigate to="/courses" replace />;
  }

  const courseName = course.name;
  const accent = mode === 'lab' ? '#10b981' : course.color;
  const description =
    mode === 'lab'
      ? 'Practical lab manuals, experiment sheets, code exercises, and viva past papers.'
      : course.description;
  const metricLabels =
    mode === 'lab'
      ? ['Manuals', 'Past papers', 'Tasks', 'Events']
      : ['Slides', 'Papers', 'Materials', 'Events'];
  const metricValues = tabCounts ?? [null, null, null, null];

  const retry = () => setReloadToken((token) => token + 1);

  const renderTabBody = () => {
    if (state.status === 'loading') {
      return (
        <div className="files-list" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="skeleton-card skeleton-row" aria-hidden="true" key={index} />
          ))}
        </div>
      );
    }
    if (state.status === 'error') {
      return (
        <div className="empty-state resource-error-state" role="alert">
          <i className="fas fa-cloud-exclamation" />
          <h3>Resources could not be loaded</h3>
          <p>
            We couldn&apos;t reach this section. Check your connection and try
            again.
          </p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>
            <i className="fas fa-redo" aria-hidden="true" /> Retry
          </button>
        </div>
      );
    }

    if (tab === 'course-calendar') {
      if (data?.eventsError) {
        return (
          <div className="empty-state course-events-error" role="alert">
            <i className="fas fa-cloud-exclamation" />
            <h3>The schedule could not be loaded</h3>
            <p>Check your connection and try again.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>
              <i className="fas fa-redo" aria-hidden="true" /> Retry
            </button>
          </div>
        );
      }
      if (!data || data.events.length === 0) {
        const message = EMPTY_MESSAGES['course-calendar'];
        return (
          <div className="empty-state">
            <i className={message.icon} />
            <h3>{message.title}</h3>
            <p>{message.desc}</p>
          </div>
        );
      }
      return (
        <div className="course-events-list">
          {data.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              courseName={courseName}
            />
          ))}
        </div>
      );
    }

    if (!category) return null;
    if (files.length === 0) {
      const message = EMPTY_MESSAGES[category];
      return (
        <div className="empty-state">
          <i className={message.icon} />
          <h3>{message.title}</h3>
          <p>{message.desc}</p>
        </div>
      );
    }
    return (
      <div className="files-list">
        {files.map((file) => (
          <ResourceRow file={file} key={file.id} />
        ))}
      </div>
    );
  };

  return (
    <section className="page page-courses active" id="page-courses">
      <span id="courses" className="anchor-target" aria-hidden="true" />

      <div className="course-detail-view" id="course-detail-view">
        <button
          className="btn btn-ghost back-btn"
          id="course-back-btn"
          type="button"
          onClick={() => navigate(fromLabs ? '/labs' : '/courses')}
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />{' '}
          {fromLabs ? 'Back to Labs' : 'Back to the Archive'}
        </button>

        <div
          className="course-header"
          id="course-header"
          style={{ ['--course-accent' as string]: accent }}
          data-mode={mode}
          data-course-id={course.id}
        >
          <div className="course-header-content">
            <div className="course-detail-meta">
              <span className="course-detail-code">{course.code}</span>
              <span className="course-detail-sep" aria-hidden="true">
                /
              </span>
              <span className="course-detail-section">
                {mode === 'lab' ? 'Lab Section' : 'Theory Section'}
              </span>
            </div>
            <h1 className="course-detail-title">{course.name}</h1>
            <p className="course-detail-desc">{description}</p>
            <dl className="course-detail-stats" aria-label="Resource totals">
              {metricLabels.map((label, index) => (
                <div className="course-stat" key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {metricValues[index] === null
                      ? '--'
                      : pad2(metricValues[index] as number)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div
          className={`course-mode-bar${course.hasLab ? '' : ' hidden'}`}
          id="course-mode-bar"
          role="group"
          aria-label="Course section"
        >
          <div className="mode-toggle-group">
            <button
              className={`mode-toggle-btn${
                mode === 'theory' ? ' active' : ''
              }`}
              type="button"
              data-mode="theory"
              id="mode-btn-theory"
              aria-pressed={mode === 'theory'}
              onClick={() => switchMode('theory')}
            >
              Theory
            </button>
            <button
              className={`mode-toggle-btn${mode === 'lab' ? ' active' : ''}`}
              type="button"
              data-mode="lab"
              id="mode-btn-lab"
              aria-pressed={mode === 'lab'}
              onClick={() => switchMode('lab')}
            >
              Lab
            </button>
          </div>
          <span className="mode-status-text" id="mode-status-text">
            {mode === 'theory' ? 'Theory coursework' : 'Practical lab section'}
          </span>
        </div>

        <div
          className="tabs"
          id="course-tabs"
          role="tablist"
          aria-label="Course resources"
          onKeyDown={handleTabKeyDown}
        >
          {COURSE_TAB_NAMES.map((tabName, index) => {
            const active = tabName === tab;
            return (
              <button
                key={tabName}
                className={`tab${active ? ' active' : ''}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`tab-content-${tabName}`}
                data-tab={tabName}
                id={`tab-${tabName}`}
                tabIndex={active ? 0 : -1}
                onClick={() => switchTab(tabName)}
              >
                <i className={TAB_ICONS[tabName]} aria-hidden="true" />{' '}
                <span>{labels[tabName]}</span>
                <span className="tab-count" hidden={!tabCounts}>
                  {tabCounts ? pad2(tabCounts[index]) : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="tab-content active"
          id={`tab-content-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
        >
          <div className="tab-toolbar">
            <h3>
              <i className={TAB_ICONS[tab]} />{' '}
              {tab === 'course-calendar'
                ? 'Course Events'
                : titles[tab as Exclude<CourseTab, 'course-calendar'>]}
            </h3>
          </div>
          {renderTabBody()}
        </div>
      </div>
    </section>
  );
}
