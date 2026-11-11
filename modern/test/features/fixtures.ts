import { vi } from 'vitest';
import type {
  CourseId,
  Event,
  FileCategory,
  RepositoryError,
  RepositoryResult,
  ResourceFile,
} from '@/types';
import { repositoryFailure, repositorySuccess } from '@/types';
import type {
  CourseResourceReader,
  EventReader,
} from '@/features/courses/courseData';
import type { CalendarEventReader } from '@/features/calendar/calendarUtils';

export function makeResource(
  id: string,
  courseId: CourseId,
  category: FileCategory,
  overrides: Partial<ResourceFile> = {},
): ResourceFile {
  return {
    id,
    courseId,
    category,
    name: overrides.name ?? `${category} resource ${id}`,
    url: overrides.url ?? 'https://example.com/resource',
    previewURL: overrides.previewURL ?? 'https://example.com/preview',
    downloadURL: overrides.downloadURL ?? 'https://example.com/download',
    type: overrides.type ?? 'pdf',
    description: overrides.description ?? '',
    date: overrides.date ?? 'Jan 1, 2026',
    createdAt: overrides.createdAt ?? null,
  };
}

export function makeEvent(
  id: string,
  overrides: Partial<Event> = {},
): Event {
  return {
    id,
    title: overrides.title ?? `Event ${id}`,
    date: overrides.date ?? '2099-01-15',
    time: overrides.time ?? '10:00',
    type: overrides.type ?? 'quiz',
    courseId: overrides.courseId ?? 'os',
    groups: overrides.groups ?? [],
    description: overrides.description ?? '',
    createdAt: overrides.createdAt ?? null,
  };
}

export interface FakeCourseReader extends CourseResourceReader {
  listResources: ReturnType<typeof vi.fn>;
}

export function createCourseReader(
  resources: ResourceFile[] = [],
  failures: string[] = [],
): FakeCourseReader {
  return {
    listResources: vi.fn(
      async (
        courseId: CourseId,
        category: FileCategory,
      ): Promise<RepositoryResult<ResourceFile[]>> => {
        const key = `${courseId}:${category}`;
        if (failures.includes(key)) {
          return repositoryFailure('firestore-read-failed', `failed ${key}`);
        }
        return repositorySuccess(
          resources.filter(
            (file) =>
              file.courseId === courseId && file.category === category,
          ),
        );
      },
    ),
  };
}

export interface FakeEventReader extends EventReader {
  listEvents: ReturnType<typeof vi.fn>;
}

export function createEventReader(
  events: Event[] = [],
  error: RepositoryError | null = null,
): FakeEventReader {
  return {
    listEvents: vi.fn(async (): Promise<RepositoryResult<Event[]>> => {
      if (error) return repositoryFailure(error.code, error.message);
      return repositorySuccess(events);
    }),
  };
}

export interface FakeRangeEventReader extends CalendarEventReader {
  listEventsInRange: ReturnType<typeof vi.fn>;
}

/** Mirrors the Firestore inclusive `date` range query used by the calendar. */
export function createRangeEventReader(
  events: Event[] = [],
  error: RepositoryError | null = null,
): FakeRangeEventReader {
  return {
    listEventsInRange: vi.fn(
      async (
        startDate: string,
        endDate: string,
      ): Promise<RepositoryResult<Event[]>> => {
        if (error) return repositoryFailure(error.code, error.message);
        return repositorySuccess(
          events.filter(
            (event) => event.date >= startDate && event.date <= endDate,
          ),
        );
      },
    ),
  };
}
