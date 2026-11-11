// Course / resource catalogue repository (read-only).
//
// Reads from the legacy Firestore contract:
//   courses/{courseId}/{category}/{fileId}
//
// Document fields (preserved verbatim):
//   name, url, previewURL, downloadURL, type, description, date, createdAt
//
// No writes, transactions, or admin operations are performed here. Those are
// deferred to later checkpoints (confirmUpload(), transactional metadata edit).

import {
  type Firestore,
  collection,
  query,
  getDocs,
} from 'firebase/firestore';
import type {
  CourseId,
  FileCategory,
  ResourceFile,
  RepositoryResult,
} from '@/types';
import { repositoryFailure, repositorySuccess } from '@/types';

export interface CourseRepositoryDependencies {
  readonly firestore: Firestore | null;
}

export class CourseRepository {
  private readonly firestore: Firestore | null;

  constructor(dependencies: CourseRepositoryDependencies) {
    this.firestore = dependencies.firestore;
  }

  /** List resources for a course/category. Returns empty array when Firebase is unconfigured. */
  async listResources(
    courseId: CourseId,
    category: FileCategory,
  ): Promise<RepositoryResult<ResourceFile[]>> {
    if (!this.firestore) {
      return repositoryFailure(
        'firebase-not-configured',
        'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
      );
    }

    try {
      const categoryRef = collection(
        this.firestore,
        `courses/${courseId}/${category}`,
      );
      const snapshot = await getDocs(query(categoryRef));
      const data: ResourceFile[] = snapshot.docs.map((doc) =>
        mapResourceFile(doc.id, doc.data()),
      );
      return repositorySuccess(data);
    } catch (error) {
      return repositoryFailure(
        'firestore-read-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

/** Map a legacy Firestore document to the shared ResourceFile model. */
export function mapResourceFile(
  docId: string,
  data: Record<string, unknown>,
): ResourceFile {
  return {
    id: docId,
    courseId: normalizeCourseId(data.courseId),
    category: normalizeCategory(data.category),
    name: normalizeString(data.name, ''),
    url: normalizeString(data.url, ''),
    previewURL: normalizeString(data.previewURL, ''),
    downloadURL: normalizeString(data.downloadURL, ''),
    type: normalizeResourceType(data.type),
    description: normalizeString(data.description, ''),
    date: normalizeString(data.date, ''),
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

function normalizeCategory(value: unknown): FileCategory {
  const allowed: FileCategory[] = [
    'lectures', 'papers', 'related', 'lab', 'lab_papers', 'lab_tasks',
  ];
  const raw = typeof value === 'string' ? value : '';
  return allowed.includes(raw as FileCategory) ? (raw as FileCategory) : 'lectures';
}

function normalizeResourceType(value: unknown): 'pdf' | 'ppt' | 'doc' | 'sheet' | 'code' | 'zip' | 'link' {
  const allowed: ('pdf' | 'ppt' | 'doc' | 'sheet' | 'code' | 'zip' | 'link')[] = [
    'pdf', 'ppt', 'doc', 'sheet', 'code', 'zip', 'link',
  ];
  const raw = typeof value === 'string' ? value : '';
  return allowed.includes(raw as 'pdf' | 'ppt' | 'doc' | 'sheet' | 'code' | 'zip' | 'link')
    ? (raw as 'pdf' | 'ppt' | 'doc' | 'sheet' | 'code' | 'zip' | 'link')
    : 'link';
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
