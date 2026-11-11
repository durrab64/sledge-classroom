// Home / Courses data layer.
//
// The course catalogue itself is legacy editorial content (the `COURSES`
// constant in app.js) and is preserved verbatim here. Resource counts and
// events are read through the CP4 repositories; nothing is invented when a
// read fails. Failed reads surface as RepositoryResult errors so the pages can
// render loading / empty / error states instead of fake zeroes.

import type {
  Course,
  CourseId,
  Event,
  FileCategory,
  RepositoryError,
  RepositoryResult,
  ResourceFile,
} from '@/types';
import { repositoryFailure, repositorySuccess } from '@/types';

export type CourseMode = 'theory' | 'lab';
export type CourseFilter = 'all' | 'theory' | 'lab';
export type CourseSort = 'code' | 'name' | 'materials' | 'updated';
export type CourseTab =
  | 'lectures'
  | 'past-papers'
  | 'related'
  | 'course-calendar';

export const COURSES: readonly Course[] = [
  {
    id: 'stats',
    name: 'Statistics & Probability',
    code: 'STAT 301',
    icon: 'fas fa-chart-bar',
    color: 'var(--course-stats)',
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    description:
      'Descriptive & inferential statistics, probability distributions, hypothesis testing',
    hasLab: false,
  },
  {
    id: 'automata',
    name: 'Theory of Automata',
    code: 'CS 311',
    icon: 'fas fa-project-diagram',
    color: 'var(--course-automata)',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    description:
      'Finite automata, regular languages, context-free grammars, Turing machines',
    hasLab: false,
  },
  {
    id: 'calculus',
    name: 'Multivariable Calculus',
    code: 'MATH 201',
    icon: 'fas fa-infinity',
    color: 'var(--course-calculus)',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    description:
      'Partial derivatives, multiple integrals, vector calculus, and applications',
    hasLab: false,
  },
  {
    id: 'os',
    name: 'Operating Systems',
    code: 'CS 321',
    icon: 'fas fa-cogs',
    color: 'var(--course-os)',
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    description:
      'Process management, memory management, file systems, and scheduling',
    hasLab: true,
  },
  {
    id: 'web',
    name: 'Web Engineering',
    code: 'CS 341',
    icon: 'fas fa-code',
    color: 'var(--course-web)',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    description:
      'Full-stack web development, HTML, CSS, JavaScript, frameworks, and databases',
    hasLab: true,
  },
  {
    id: 'arch',
    name: 'Computer Architecture',
    code: 'CS 331',
    icon: 'fas fa-microchip',
    color: 'var(--course-arch)',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    description:
      'CPU design, instruction sets, pipelining, memory hierarchy, and I/O systems',
    hasLab: true,
  },
];

export const LAB_COURSES = COURSES.filter((course) => course.hasLab);

export const COURSE_TAB_NAMES: readonly CourseTab[] = [
  'lectures',
  'past-papers',
  'related',
  'course-calendar',
];

export const COURSE_MODE_CATEGORIES: Record<
  CourseMode,
  readonly [FileCategory, FileCategory, FileCategory]
> = {
  theory: ['lectures', 'papers', 'related'],
  lab: ['lab', 'lab_papers', 'lab_tasks'],
};

export const RESOURCE_CATEGORY_META = {
  lectures: { mode: 'theory', tab: 'lectures' },
  papers: { mode: 'theory', tab: 'past-papers' },
  related: { mode: 'theory', tab: 'related' },
  lab: { mode: 'lab', tab: 'lectures' },
  lab_papers: { mode: 'lab', tab: 'past-papers' },
  lab_tasks: { mode: 'lab', tab: 'related' },
} as const satisfies Record<
  FileCategory,
  { mode: CourseMode; tab: CourseTab }
>;

export const EVENT_TYPES = {
  quiz: {
    icon: 'fas fa-question-circle',
    color: 'var(--event-quiz)',
    bg: 'rgba(139, 92, 246, 0.1)',
    label: 'Quiz',
  },
  assignment: {
    icon: 'fas fa-clipboard-list',
    color: 'var(--event-assignment)',
    bg: 'rgba(245, 158, 11, 0.1)',
    label: 'Assignment',
  },
  presentation: {
    icon: 'fas fa-chalkboard-teacher',
    color: 'var(--event-presentation)',
    bg: 'rgba(16, 185, 129, 0.1)',
    label: 'Presentation',
  },
  exam: {
    icon: 'fas fa-file-signature',
    color: 'var(--event-exam)',
    bg: 'rgba(239, 68, 68, 0.1)',
    label: 'Exam',
  },
  other: {
    icon: 'fas fa-star',
    color: 'var(--event-other)',
    bg: 'rgba(59, 130, 246, 0.1)',
    label: 'Other',
  },
} as const;

export function getCourse(courseId: string | undefined): Course | null {
  return COURSES.find((course) => course.id === courseId) ?? null;
}

export function getTabForCategory(
  category: string,
): { mode: CourseMode; tab: CourseTab } | null {
  return (
    RESOURCE_CATEGORY_META[category as FileCategory] ?? null
  );
}

export function getCategoryForTab(
  tab: CourseTab,
  mode: CourseMode,
): FileCategory | null {
  if (tab === 'course-calendar') return null;
  if (mode === 'lab') {
    if (tab === 'lectures') return 'lab';
    if (tab === 'past-papers') return 'lab_papers';
    return 'lab_tasks';
  }
  if (tab === 'lectures') return 'lectures';
  if (tab === 'past-papers') return 'papers';
  return 'related';
}

// ---- counts and catalogue ----

export interface CourseCounts {
  primary: number;
  papers: number;
  tertiary: number;
  total: number;
  latestUpdated: number;
}

export interface CourseEntry {
  course: Course;
  theory: CourseCounts;
  lab: CourseCounts | null;
  eventCount: number;
}

export interface CatalogueData {
  entries: CourseEntry[];
  events: Event[];
}

export interface CourseResourceReader {
  listResources(
    courseId: CourseId,
    category: FileCategory,
  ): Promise<RepositoryResult<ResourceFile[]>>;
}

export interface EventReader {
  listEvents(): Promise<RepositoryResult<Event[]>>;
}

export interface CourseModeData {
  counts: CourseCounts;
  files: Partial<Record<FileCategory, ResourceFile[]>>;
  events: Event[];
  eventsError: RepositoryError | null;
}

const CACHE_TTL = 2 * 60 * 1000;

type CatalogueCacheEntry = { data: CatalogueData; ts: number };
const catalogueCache = new WeakMap<
  object,
  WeakMap<object, CatalogueCacheEntry>
>();
const catalogueInflight = new WeakMap<
  object,
  WeakMap<object, Promise<RepositoryResult<CatalogueData>>>
>();

function getCacheBucket<T>(
  root: WeakMap<object, WeakMap<object, T>>,
  outer: object,
): WeakMap<object, T> {
  let bucket = root.get(outer);
  if (!bucket) {
    bucket = new WeakMap<object, T>();
    root.set(outer, bucket);
  }
  return bucket;
}

export function resetCatalogueCache(): void {
  // WeakMap entries cannot be cleared directly; replacing the page-level
  // reader instance (tests) naturally isolates entries.
}

function countFiles(files: ResourceFile[]): CourseCounts {
  return {
    primary: files.length,
    papers: 0,
    tertiary: 0,
    total: files.length,
    latestUpdated: files.reduce(
      (latest, file) => Math.max(latest, timestampOf(file.createdAt)),
      0,
    ),
  };
}

function buildCounts(
  primary: ResourceFile[],
  papers: ResourceFile[],
  tertiary: ResourceFile[],
): CourseCounts {
  return {
    primary: primary.length,
    papers: papers.length,
    tertiary: tertiary.length,
    total: primary.length + papers.length + tertiary.length,
    latestUpdated: [primary, papers, tertiary].reduce(
      (latest, files) =>
        files.reduce(
          (innerLatest, file) =>
            Math.max(innerLatest, timestampOf(file.createdAt)),
          latest,
        ),
      0,
    ),
  };
}

function timestampOf(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'seconds' in value) {
    const seconds = (value as { seconds?: unknown }).seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return 0;
}

async function loadModeCounts(
  reader: CourseResourceReader,
  courseId: CourseId,
  mode: CourseMode,
): Promise<RepositoryResult<CourseCounts>> {
  const [primary, papers, tertiary] = COURSE_MODE_CATEGORIES[mode];
  const results = await Promise.all([
    reader.listResources(courseId, primary),
    reader.listResources(courseId, papers),
    reader.listResources(courseId, tertiary),
  ]);
  const failed = results.find((result) => result.error !== null);
  if (failed?.error) {
    return repositoryFailure(failed.error.code, failed.error.message);
  }
  return repositorySuccess(
    buildCounts(
      results[0].data ?? [],
      results[1].data ?? [],
      results[2].data ?? [],
    ),
  );
}

export async function loadCatalogue(
  courseReader: CourseResourceReader,
  eventReader: EventReader,
  options: { force?: boolean } = {},
): Promise<RepositoryResult<CatalogueData>> {
  const bucket = getCacheBucket(catalogueCache, courseReader);
  const cached = bucket.get(eventReader);
  if (!options.force && cached && Date.now() - cached.ts < CACHE_TTL) {
    return repositorySuccess(cached.data);
  }

  const inflightBucket = getCacheBucket(
    catalogueInflight,
    courseReader,
  );
  const pending = inflightBucket.get(eventReader);
  if (!options.force && pending) return pending;

  const request = (async (): Promise<RepositoryResult<CatalogueData>> => {
    const eventsResult = await eventReader.listEvents();
    if (eventsResult.error) {
      return repositoryFailure(
        eventsResult.error.code,
        eventsResult.error.message,
      );
    }

    const entryResults = await Promise.all(
      COURSES.map(async (course): Promise<RepositoryResult<CourseEntry>> => {
        const theory = await loadModeCounts(
          courseReader,
          course.id,
          'theory',
        );
        if (theory.error) {
          return repositoryFailure(theory.error.code, theory.error.message);
        }
        let lab: RepositoryResult<CourseCounts> | null = null;
        if (course.hasLab) {
          lab = await loadModeCounts(courseReader, course.id, 'lab');
          if (lab.error) {
            return repositoryFailure(lab.error.code, lab.error.message);
          }
        }
        return repositorySuccess({
          course,
          theory: theory.data!,
          lab: lab?.data ?? null,
          eventCount: 0,
        });
      }),
    );

    const failed = entryResults.find((result) => result.error !== null);
    if (failed?.error) {
      return repositoryFailure(failed.error.code, failed.error.message);
    }

    const events = eventsResult.data ?? [];
    const countsByCourse = new Map<string, number>();
    events.forEach((event) => {
      countsByCourse.set(
        event.courseId,
        (countsByCourse.get(event.courseId) ?? 0) + 1,
      );
    });

    const entries = entryResults.map((result) => ({
      ...result.data!,
      eventCount: countsByCourse.get(result.data!.course.id) ?? 0,
    }));

    const data: CatalogueData = { entries, events };
    bucket.set(eventReader, { data, ts: Date.now() });
    return repositorySuccess(data);
  })();

  inflightBucket.set(eventReader, request);
  void request.finally(() => {
    if (inflightBucket.get(eventReader) === request) {
      inflightBucket.delete(eventReader);
    }
  });

  return request;
}

export async function loadCourseMode(
  courseReader: CourseResourceReader,
  eventReader: EventReader,
  courseId: CourseId,
  mode: CourseMode,
): Promise<RepositoryResult<CourseModeData>> {
  const categories = COURSE_MODE_CATEGORIES[mode];
  const [primary, papers, tertiary, eventsResult] = await Promise.all([
    courseReader.listResources(courseId, categories[0]),
    courseReader.listResources(courseId, categories[1]),
    courseReader.listResources(courseId, categories[2]),
    eventReader.listEvents(),
  ]);

  const failed = [primary, papers, tertiary].find(
    (result) => result.error !== null,
  );
  if (failed?.error) {
    return repositoryFailure(failed.error.code, failed.error.message);
  }

  const files: Partial<Record<FileCategory, ResourceFile[]>> = {
    [categories[0]]: primary.data ?? [],
    [categories[1]]: papers.data ?? [],
    [categories[2]]: tertiary.data ?? [],
  };

  const events = (eventsResult.data ?? [])
    .filter((event) => event.courseId === courseId)
    .sort((a, b) => {
      const byDate = String(a.date || '').localeCompare(String(b.date || ''));
      return byDate !== 0
        ? byDate
        : String(a.time || '').localeCompare(String(b.time || ''));
    });

  return repositorySuccess({
    counts: buildCounts(
      files[categories[0]] ?? [],
      files[categories[1]] ?? [],
      files[categories[2]] ?? [],
    ),
    files,
    events,
    eventsError: eventsResult.error,
  });
}

// ---- presentation helpers ----

export interface CourseCardItem {
  course: Course;
  counts: CourseCounts;
  eventCount: number;
  kind: CourseMode;
}

export interface CourseGroup {
  kind: CourseMode;
  label: string;
  jp: string;
  noun: string;
  items: CourseCardItem[];
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function homeTheoryItems(entries: CourseEntry[]): CourseCardItem[] {
  return entries.map((entry) => ({
    course: entry.course,
    counts: entry.theory,
    eventCount: entry.eventCount,
    kind: 'theory',
  }));
}

export function homeLabItems(entries: CourseEntry[]): CourseCardItem[] {
  return entries
    .filter((entry) => entry.course.hasLab && entry.lab)
    .map((entry) => ({
      course: entry.course,
      counts: entry.lab!,
      eventCount: entry.eventCount,
      kind: 'lab',
    }));
}

export function archiveGroups(
  entries: CourseEntry[],
  filter: CourseFilter,
  search: string,
  sort: CourseSort,
): { groups: CourseGroup[]; totalShown: number } {
  const term = search.trim().toLowerCase();
  const matches = (course: Course) =>
    !term ||
    [course.name, course.code, course.description].some((value) =>
      (value || '').toLowerCase().includes(term),
    );

  const sorters: Record<
    CourseSort,
    (a: CourseCardItem, b: CourseCardItem) => number
  > = {
    code: (a, b) => a.course.code.localeCompare(b.course.code),
    name: (a, b) => a.course.name.localeCompare(b.course.name),
    materials: (a, b) =>
      b.counts.total - a.counts.total ||
      a.course.code.localeCompare(b.course.code),
    updated: (a, b) =>
      b.counts.latestUpdated - a.counts.latestUpdated ||
      a.course.code.localeCompare(b.course.code),
  };

  const theory = entries
    .map(
      (entry): CourseCardItem => ({
        course: entry.course,
        counts: entry.theory,
        eventCount: entry.eventCount,
        kind: 'theory',
      }),
    )
    .filter((item) => matches(item.course))
    .sort(sorters[sort]);
  const labs = entries
    .filter((entry) => entry.course.hasLab && entry.lab)
    .map(
      (entry): CourseCardItem => ({
        course: entry.course,
        counts: entry.lab!,
        eventCount: entry.eventCount,
        kind: 'lab',
      }),
    )
    .filter((item) => matches(item.course))
    .sort(sorters[sort]);

  const groups: CourseGroup[] = [];
  if (filter !== 'lab') {
    groups.push({
      kind: 'theory',
      label: 'Theory Courses',
      jp: '理論',
      noun: 'Course',
      items: theory,
    });
  }
  if (filter !== 'theory') {
    groups.push({
      kind: 'lab',
      label: 'Lab Sections',
      jp: '実験',
      noun: 'Lab',
      items: labs,
    });
  }

  const visibleGroups = groups.filter((group) => group.items.length > 0);
  return {
    groups: visibleGroups,
    totalShown: visibleGroups.reduce(
      (sum, group) => sum + group.items.length,
      0,
    ),
  };
}

export function upcomingEvents(events: Event[], limit = 5): Event[] {
  const today = new Date().toISOString().split('T')[0];
  return events
    .filter((event) => event.date >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, limit);
}

export function formatEventDate(date: string): string {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatEventTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = Number.parseInt(h ?? '', 10);
  if (Number.isNaN(hour)) return time;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? '00'} ${ampm}`;
}

export function eventDayParts(date: string): { day: string; month: string } {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { day: '--', month: '---' };
  }
  return {
    day: String(parsed.getDate()).padStart(2, '0'),
    month: parsed
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase(),
  };
}

export function getCoursePath(
  courseId: CourseId,
  options: { mode?: CourseMode; tab?: CourseTab } = {},
): string {
  const base = `/courses/${courseId}`;
  const params = new URLSearchParams();
  if (options.mode && options.mode !== 'theory') {
    params.set('mode', options.mode);
  }
  if (options.tab && options.tab !== 'lectures') {
    params.set('tab', options.tab);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export { countFiles };
