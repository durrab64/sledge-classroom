'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn(),
}));

import { collection, orderBy, query, getDocs } from 'firebase/firestore';

import {
  CourseRepository,
  mapResourceFile,
} from '@/services/repositories/courseRepository';

const COURSE_ID = 'stats' as const;
const CATEGORY = 'lectures' as const;

beforeEach(() => {
  vi.clearAllMocks();
  (collection as any).mockReturnValue({} as never);
  (orderBy as any).mockReturnValue({} as never);
  (query as any).mockReturnValue({} as never);
});

describe('mapResourceFile', () => {
  it('maps a complete legacy document to ResourceFile', () => {
    const doc = mapResourceFile('abc123', {
      courseId: 'calculus',
      category: 'papers',
      name: 'Midterm 2026',
      url: 'https://drive.google.com/file/d/FILEID/view',
      previewURL: 'https://drive.google.com/file/d/FILEID/view?usp=sharing',
      downloadURL: 'https://drive.google.com/uc?export=download&id=FILEID',
      type: 'pdf',
      description: 'A midterm exam.',
      date: 'Oct 5, 2026',
      createdAt: { seconds: 1, nanoseconds: 2 },
    });

    expect(doc).toEqual({
      id: 'abc123',
      courseId: 'calculus',
      category: 'papers',
      name: 'Midterm 2026',
      url: 'https://drive.google.com/file/d/FILEID/view',
      previewURL: 'https://drive.google.com/file/d/FILEID/view?usp=sharing',
      downloadURL: 'https://drive.google.com/uc?export=download&id=FILEID',
      type: 'pdf',
      description: 'A midterm exam.',
      date: 'Oct 5, 2026',
      createdAt: { seconds: 1, nanoseconds: 2 },
    });
  });

  it('applies safe defaults when fields are missing or malformed', () => {
    const doc = mapResourceFile('missing', {
      courseId: 'not-a-course',
      category: 'not-a-category',
      type: 'not-a-type',
    });

    expect(doc.courseId).toBe('stats');
    expect(doc.category).toBe('lectures');
    expect(doc.type).toBe('link');
    expect(doc.name).toBe('');
    expect(doc.url).toBe('');
    expect(doc.createdAt).toBeNull();
  });

  it('treats non-string fields as empty defaults', () => {
    const doc = mapResourceFile('x', {
      name: 123,
      url: null,
      description: undefined,
    });
    expect(doc.name).toBe('');
    expect(doc.url).toBe('');
    expect(doc.description).toBe('');
  });
});

describe('CourseRepository.listResources (unconfigured)', () => {
  it('returns a firebase-not-configured error when firestore is null', async () => {
    const repo = new CourseRepository({ firestore: null });
    const result = await repo.listResources(COURSE_ID, CATEGORY);

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('firebase-not-configured');
    expect(collection).not.toHaveBeenCalled();
  });
});

describe('CourseRepository.listResources (mocked firestore)', () => {
  it('maps returned documents successfully', async () => {
    const docs = [
      {
        id: 'f1',
        data: () => ({
          courseId: 'stats',
          category: 'lectures',
          name: 'A',
          url: 'u',
          previewURL: 'p',
          downloadURL: 'd',
          type: 'pdf',
          description: 'd',
          date: 'Oct 1, 2026',
        }),
      },
      {
        id: 'f2',
        data: () => ({
          courseId: 'os',
          category: 'lab',
          name: 'B',
          url: 'u2',
          previewURL: 'p2',
          downloadURL: 'd2',
          type: 'link',
          description: '',
          date: 'Oct 2, 2026',
        }),
      },
    ];
    (getDocs as any).mockResolvedValue({ docs } as never);

    const repo = new CourseRepository({ firestore: {} as Firestore });
    const result = await repo.listResources(COURSE_ID, CATEGORY);

    expect(collection).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(query).toHaveBeenCalledTimes(1);
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data![0]).toMatchObject({ id: 'f1', courseId: 'stats', name: 'A' });
    expect(result.data![1]).toMatchObject({ id: 'f2', courseId: 'os', category: 'lab' });
  });

  it('propagates firestore read errors', async () => {
    (getDocs as any).mockRejectedValue(new Error('permission denied'));

    const repo = new CourseRepository({ firestore: {} as Firestore });
    const result = await repo.listResources(COURSE_ID, CATEGORY);

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('firestore-read-failed');
    expect(result.error!.message).toBe('permission denied');
  });

  it('handles an empty collection', async () => {
    (getDocs as any).mockResolvedValue({ docs: [] } as never);

    const repo = new CourseRepository({ firestore: {} as Firestore });
    const result = await repo.listResources(COURSE_ID, CATEGORY);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});
