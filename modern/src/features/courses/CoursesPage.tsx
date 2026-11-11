// Courses directory — migrated from the legacy #page-courses list view.
// Preserves the masthead stats, independent filter/search/sort toolbar, and
// editorial archive cards. Resource counts come from the CP4 repository.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RepositoryError } from '@/types';
import {
  COURSES,
  archiveGroups,
  loadCatalogue,
  type CatalogueData,
  type CourseFilter,
  type CourseResourceReader,
  type CourseSort,
  type EventReader,
} from './courseData';
import { ArchiveCourseCard } from './ArchiveCourseCard';
import { courseRepository, eventRepository } from '@/services/repositories';

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: RepositoryError };

export interface CoursesPageProps {
  courseReader?: CourseResourceReader;
  eventReader?: EventReader;
}

const FILTERS: { value: CourseFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'theory', label: 'Theory' },
  { value: 'lab', label: 'Lab' },
];

export function CoursesPage({
  courseReader = courseRepository,
  eventReader = eventRepository,
}: CoursesPageProps) {
  const [catalogue, setCatalogue] = useState<LoadState<CatalogueData>>({
    status: 'loading',
  });
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CourseSort>('code');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCatalogue({ status: 'loading' });
    loadCatalogue(courseReader, eventReader, { force: reloadToken > 0 })
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setCatalogue({ status: 'error', error: result.error });
        } else {
          setCatalogue({ status: 'success', data: result.data! });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalogue({
          status: 'error',
          error: {
            code: 'catalogue-load-failed',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [courseReader, eventReader, reloadToken]);

  const theoryCount = COURSES.length;
  const labCount = COURSES.filter((course) => course.hasLab).length;
  const totalCount = theoryCount + labCount;

  const data = catalogue.status === 'success' ? catalogue.data : null;
  const result = useMemo(
    () => (data ? archiveGroups(data.entries, filter, search, sort) : null),
    [data, filter, search, sort],
  );

  const clearFilters = useCallback(() => {
    setFilter('all');
    setSearch('');
    setSort('code');
  }, []);

  return (
    <section className="page page-courses active" id="page-courses">
      <span id="courses" className="anchor-target" aria-hidden="true" />

      <div className="courses-list-view" id="courses-list-view">
        <header className="courses-masthead">
          <div className="courses-masthead-main">
            <p className="courses-eyebrow">
              <span className="courses-eyebrow-jp">第参章</span>
              <span className="courses-eyebrow-sep" aria-hidden="true">
                ·
              </span>
              <span>The Archive</span>
            </p>
            <h1 className="courses-display-title">Coursework &amp; Labs</h1>
            <p className="courses-lede">
              Theory and practical resources, organised by course. Lecture
              slides, past papers, lab manuals and schedules — kept in one place.
            </p>
          </div>
          <dl className="courses-stats" aria-label="Course totals">
            <div className="courses-stat">
              <dt>Theory</dt>
              <dd id="courses-stat-theory">
                {String(theoryCount).padStart(2, '0')}
              </dd>
            </div>
            <div className="courses-stat">
              <dt>Labs</dt>
              <dd id="courses-stat-lab">
                {String(labCount).padStart(2, '0')}
              </dd>
            </div>
            <div className="courses-stat">
              <dt>Total</dt>
              <dd id="courses-stat-total">
                {String(totalCount).padStart(2, '0')}
              </dd>
            </div>
          </dl>
        </header>

        <div className="courses-toolbar">
          <div
            className="course-filter-bar"
            id="courses-filter-bar"
            role="group"
            aria-label="Filter courses"
          >
            {FILTERS.map((pill) => {
              const count =
                pill.value === 'all'
                  ? totalCount
                  : pill.value === 'theory'
                    ? theoryCount
                    : labCount;
              return (
                <button
                  key={pill.value}
                  className={`filter-pill${
                    filter === pill.value ? ' active' : ''
                  }`}
                  type="button"
                  data-filter={pill.value}
                  aria-pressed={filter === pill.value}
                  onClick={() => setFilter(pill.value)}
                >
                  {pill.label} (<span>{count}</span>)
                </button>
              );
            })}
          </div>

          <div className="courses-toolbar-tools">
            <div className="courses-search">
              <i className="fas fa-search" aria-hidden="true" />
              <label className="sr-only" htmlFor="courses-search-input">
                Search courses
              </label>
              <input
                type="search"
                id="courses-search-input"
                name="course-search"
                placeholder="Search courses…"
                autoComplete="off"
                spellCheck={false}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="courses-sort">
              <label className="sr-only" htmlFor="courses-sort-select">
                Sort courses
              </label>
              <select
                id="courses-sort-select"
                name="course-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as CourseSort)}
              >
                <option value="code">Sort: Code</option>
                <option value="name">Sort: Name</option>
                <option value="materials">Sort: Most Materials</option>
                <option value="updated">Sort: Recently Updated</option>
              </select>
              <i className="fas fa-chevron-down" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div
          className="courses-grid-full"
          id="courses-grid-full"
          aria-busy={catalogue.status === 'loading'}
        >
          {catalogue.status === 'loading'
            ? Array.from({ length: 6 }, (_, index) => (
                <div className="skeleton-card" aria-hidden="true" key={index} />
              ))
            : null}

          {catalogue.status === 'error' ? (
            <div className="empty-state resource-error-state" role="alert">
              <i className="fas fa-cloud-exclamation" />
              <h3>Course catalogue could not be loaded</h3>
              <p>
                We couldn&apos;t reach the resource counts. Check your connection
                and try again.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setReloadToken((token) => token + 1)}
              >
                <i className="fas fa-redo" aria-hidden="true" /> Retry
              </button>
            </div>
          ) : null}

          {result && result.totalShown === 0 ? (
            <div className="courses-empty">
              <i className="fas fa-search" aria-hidden="true" />
              <h3>No courses match your search</h3>
              <p>Try a different term, or reset the archive filters.</p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {result
            ? result.groups.map((group) => (
                <div key={group.kind} style={{ display: 'contents' }}>
                  <div className="courses-group-header">
                    <div className="courses-group-title">
                      <span>{group.label}</span>
                      <span className="courses-group-jp" aria-hidden="true">
                        {group.jp}
                      </span>
                    </div>
                    <span className={`courses-group-badge ${group.kind}`}>
                      {String(group.items.length).padStart(2, '0')}{' '}
                      {group.items.length === 1 ? group.noun : `${group.noun}s`}
                    </span>
                  </div>
                  {group.items.map((item, index) => (
                    <ArchiveCourseCard
                      item={item}
                      index={index}
                      key={`${group.kind}-${item.course.id}`}
                    />
                  ))}
                </div>
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
