// Event / calendar repository (read-only).
//
// Reads from the legacy Firestore contract:
//   events/{eventId}
//
// Document fields (preserved verbatim):
//   title, date, time, type, courseId, groups, description, createdAt
//
// No writes, transactions, or admin operations are performed here.

import {
  type Firestore,
  collection,
  query,
  getDocs,
  where,
} from 'firebase/firestore';
import type {
  CourseId,
  Event,
  RepositoryResult,
} from '@/types';
import { repositoryFailure, repositorySuccess } from '@/types';

export interface EventRepositoryDependencies {
  readonly firestore: Firestore | null;
}

export class EventRepository {
  private readonly firestore: Firestore | null;

  constructor(dependencies: EventRepositoryDependencies) {
    this.firestore = dependencies.firestore;
  }

  /** List all events. Returns an error when Firebase is unconfigured. */
  async listEvents(): Promise<RepositoryResult<Event[]>> {
    if (!this.firestore) {
      return repositoryFailure(
        'firebase-not-configured',
        'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
      );
    }

    try {
      const snapshot = await getDocs(query(collection(this.firestore, 'events')));
      const data: Event[] = snapshot.docs.map((doc) => mapEvent(doc.id, doc.data()));
      return repositorySuccess(data);
    } catch (error) {
      return repositoryFailure(
        'firestore-read-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * List events whose `date` falls inside the inclusive `YYYY-MM-DD` range.
   *
   * This mirrors the legacy calendar's single-field range query. No composite
   * index is required, and no write is performed.
   */
  async listEventsInRange(
    startDate: string,
    endDate: string,
  ): Promise<RepositoryResult<Event[]>> {
    if (!this.firestore) {
      return repositoryFailure(
        'firebase-not-configured',
        'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
      );
    }

    try {
      const snapshot = await getDocs(
        query(
          collection(this.firestore, 'events'),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
        ),
      );
      const data: Event[] = snapshot.docs.map((doc) => mapEvent(doc.id, doc.data()));
      return repositorySuccess(data);
    } catch (error) {
      return repositoryFailure(
        'firestore-read-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

/** Map a legacy Firestore document to the shared Event model. */
export function mapEvent(docId: string, data: Record<string, unknown>): Event {
  return {
    id: docId,
    title: normalizeString(data.title, ''),
    date: normalizeString(data.date, ''),
    time: normalizeString(data.time, ''),
    type: normalizeString(data.type, ''),
    courseId: normalizeCourseId(data.courseId),
    // Legacy events store `groups` as either a string or an array of names.
    // Preserve both shapes so the UI can render group tags without inventing
    // content for malformed values.
    groups: Array.isArray(data.groups)
      ? data.groups.filter((group): group is string => typeof group === 'string')
      : normalizeString(data.groups, ''),
    description: normalizeString(data.description, ''),
    createdAt: data.createdAt ?? null,
  };
}

// ---- pure normalization helpers (testable without Firebase) ----

function normalizeCourseId(value: unknown): CourseId {
  const allowed: CourseId[] = [
    'stats', 'automata', 'calculus', 'os', 'web', 'arch',
  ];
  const raw = typeof value === 'string' ? value : '';
  return allowed.includes(raw as CourseId) ? (raw as CourseId) : 'stats';
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
