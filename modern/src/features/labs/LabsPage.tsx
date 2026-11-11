// Labs page — migrated from the legacy #page-labs bench directory.
//
// The legacy page reuses the shared course-card dataset and filters it to lab
// sections. This page keeps the same data path (loadCatalogue), the same
// aggregate statistics, the same differentiated bench entries, and the same
// empty/error behaviour. No resource, count, or course data is invented.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RepositoryError } from '@/types';
import {
  loadCatalogue,
  pad2,
  type CatalogueData,
  type CourseEntry,
  type CourseResourceReader,
  type EventReader,
} from '@/features/courses/courseData';
import { courseRepository, eventRepository } from '@/services/repositories';

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; data: CatalogueData }
  | { status: 'error'; error: RepositoryError };

export interface LabsPageProps {
  courseReader?: CourseResourceReader;
  eventReader?: EventReader;
}

interface LabBench {
  entry: CourseEntry;
  counts: NonNullable<CourseEntry['lab']>;
  eventCount: number;
}

function benchMetrics(entry: CourseEntry): LabBench | null {
  if (!entry.course.hasLab || !entry.lab) return null;
  return {
    entry,
    counts: entry.lab,
    eventCount: entry.eventCount || 0,
  };
}

function metric(icon: string, value: number, label: string) {
  return (
    <span
      className={`lab-metric${value ? '' : ' lab-metric--zero'}`}
      key={label}
    >
      <i className={`fas ${icon}`} aria-hidden="true" />
      <strong>{value}</strong> {label}
    </span>
  );
}

export function LabsPage({
  courseReader = courseRepository,
  eventReader = eventRepository,
}: LabsPageProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    loadCatalogue(courseReader, eventReader)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setState({ status: 'error', error: result.error });
          return;
        }
        setState({ status: 'success', data: result.data! });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          error: {
            code: 'labs-load-failed',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [courseReader, eventReader, reloadToken]);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const benches = useMemo<LabBench[]>(() => {
    if (state.status !== 'success') return [];
    return state.data.entries
      .map(benchMetrics)
      .filter((bench): bench is LabBench => bench !== null);
  }, [state]);

  const totals = useMemo(
    () =>
      benches.reduce(
        (acc, bench) => {
          acc.manuals += bench.counts.primary || 0;
          acc.papers += bench.counts.papers || 0;
          acc.tasks += bench.counts.tertiary || 0;
          acc.events += bench.eventCount || 0;
          return acc;
        },
        { manuals: 0, papers: 0, tasks: 0, events: 0 },
      ),
    [benches],
  );

  const stats: Array<[string, string, number | string]> = [
    ['sections', 'Lab Sections', benches.length],
    ['manuals', 'Manuals', totals.manuals],
    ['tasks', 'Tasks', totals.tasks],
    ['events', 'Sessions', totals.events],
  ];

  const indexLabel =
    state.status === 'success'
      ? benches.length
        ? `${benches.length} bench${benches.length === 1 ? '' : 'es'} · ${
            totals.manuals + totals.papers + totals.tasks
          } resources`
        : 'No benches yet'
      : '—';

  return (
    <section className="page page-labs active" id="page-labs">
      <span id="labs" className="anchor-target" aria-hidden="true" />

      <div className="labs-workspace labs-list-view" id="labs-list-view">
        <header className="labs-masthead">
          <div className="labs-masthead-main">
            <p className="labs-kicker">
              <span className="labs-kicker-rule" aria-hidden="true" />
              <span>Practical Workspace · NUML BSCS</span>
              <span className="labs-kicker-jp" lang="ja" aria-hidden="true">
                実験室
              </span>
            </p>
            <h1 className="labs-title">The Laboratory</h1>
            <p className="labs-lede">
              Hands-on benches for practical courses — manuals, experiment
              tasks, and session records kept in one working space.
            </p>
          </div>
          <dl className="labs-stats" aria-label="Laboratory overview">
            {stats.map(([key, label, value]) => (
              <div className="labs-stat" key={key}>
                <dt className="labs-stat-label">{label}</dt>
                <dd className="labs-stat-value" data-lab-stat={key}>
                  {state.status === 'success' ? value : '—'}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <section
          className="labs-directory"
          aria-labelledby="labs-index-title"
        >
          <div className="labs-index-bar">
            <div className="labs-index-heading">
              <h2 className="labs-index-title" id="labs-index-title">
                Bench Directory
              </h2>
              <p className="labs-index-sub">
                Select a bench to open its practical resource set.
              </p>
            </div>
            <p
              className="labs-index-count"
              id="labs-index-count"
              aria-live="polite"
            >
              {indexLabel}
            </p>
          </div>

          <div
            className="labs-grid"
            id="labs-grid"
            aria-busy={state.status === 'loading'}
          >
            {state.status === 'loading' ? (
              Array.from({ length: 3 }, (_, index) => (
                <div
                  className="skeleton-card skeleton-row"
                  aria-hidden="true"
                  key={`labs-skeleton-${index}`}
                />
              ))
            ) : null}

            {state.status === 'error' ? (
              <div className="labs-empty" role="alert">
                <i className="fas fa-cloud-exclamation" aria-hidden="true" />
                <h3>Laboratory benches could not be loaded</h3>
                <p>
                  We couldn&apos;t reach the practical resource data. Check your
                  connection and try again.
                </p>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={retry}
                >
                  <i className="fas fa-redo" aria-hidden="true" /> Retry
                </button>
              </div>
            ) : null}

            {state.status === 'success' && benches.length === 0 ? (
              <div className="labs-empty">
                <i className="fas fa-flask" aria-hidden="true" />
                <h3>No laboratory benches yet</h3>
                <p>
                  Lab sections appear here once a practical course is
                  configured.
                </p>
              </div>
            ) : null}

            {state.status === 'success'
              ? benches.map(({ entry, counts, eventCount }, index) => {
                  const { course } = entry;
                  return (
                    <Link
                      className="lab-entry"
                      to={`/courses/${course.id}?mode=lab&from=labs`}
                      key={course.id}
                      aria-label={`${course.name} lab bench, ${course.code}. ${counts.primary} manuals, ${counts.papers} papers, ${counts.tertiary} tasks, ${eventCount} events.`}
                      style={{ ['--lab-accent' as string]: course.color }}
                    >
                      <span className="lab-entry__rail" aria-hidden="true">
                        <span className="lab-entry__index">
                          LAB {pad2(index + 1)}
                        </span>
                        <span
                          className="lab-entry__mark"
                          style={{ background: course.gradient }}
                        >
                          <i className={course.icon} />
                        </span>
                      </span>
                      <span className="lab-entry__body">
                        <span className="lab-entry__code">{course.code}</span>
                        <span className="lab-entry__title">{course.name}</span>
                        <span className="lab-entry__desc">
                          {course.description}
                        </span>
                        <span className="lab-entry__metrics">
                          {metric('fa-book', counts.primary, 'Manuals')}
                          {metric('fa-scroll', counts.papers, 'Papers')}
                          {metric('fa-laptop-code', counts.tertiary, 'Tasks')}
                          {metric(
                            'fa-calendar-day',
                            eventCount,
                            'Events',
                          )}
                        </span>
                      </span>
                      <span className="lab-entry__action">
                        Open bench{' '}
                        <i className="fas fa-arrow-right" aria-hidden="true" />
                      </span>
                    </Link>
                  );
                })
              : null}
          </div>
        </section>
      </div>
    </section>
  );
}
