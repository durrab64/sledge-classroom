'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn(),
}));

import { collection, query, getDocs } from 'firebase/firestore';

import { EventRepository, mapEvent } from '@/services/repositories/eventRepository';

beforeEach(() => {
  vi.clearAllMocks();
  (collection as any).mockReturnValue({} as never);
  (query as any).mockReturnValue({} as never);
});

describe('mapEvent', () => {
  it('maps a complete legacy document to Event', () => {
    const doc = mapEvent('e1', {
      title: 'Quiz 1',
      date: 'Oct 5, 2026',
      time: '14:00',
      type: 'assessment',
      courseId: 'automata',
      groups: 'A, B',
      description: 'Covers chapters 1-3.',
      createdAt: { seconds: 1 },
    });

    expect(doc).toEqual({
      id: 'e1',
      title: 'Quiz 1',
      date: 'Oct 5, 2026',
      time: '14:00',
      type: 'assessment',
      courseId: 'automata',
      groups: 'A, B',
      description: 'Covers chapters 1-3.',
      createdAt: { seconds: 1 },
    });
  });

  it('applies safe defaults for missing or malformed fields', () => {
    const doc = mapEvent('e2', {
      courseId: 'unknown-course',
    });

    expect(doc.title).toBe('');
    expect(doc.date).toBe('');
    expect(doc.time).toBe('');
    expect(doc.type).toBe('');
    expect(doc.courseId).toBe('stats');
    expect(doc.groups).toBe('');
    expect(doc.description).toBe('');
    expect(doc.createdAt).toBeNull();
  });
});

describe('EventRepository.listEvents', () => {
  it('returns firebase-not-configured when firestore is null', async () => {
    const repo = new EventRepository({ firestore: null });
    const result = await repo.listEvents();

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('firebase-not-configured');
    expect(collection).not.toHaveBeenCalled();
  });

  it('maps returned documents successfully', async () => {
    const docs = [
      {
        id: 'e1',
        data: () => ({
          title: 'Quiz 1',
          date: 'Oct 5, 2026',
          time: '14:00',
          type: 'assessment',
          courseId: 'automata',
          groups: 'A',
          description: 'q',
          createdAt: {},
        }),
      },
    ];
    (getDocs as any).mockResolvedValue({ docs } as never);

    const repo = new EventRepository({ firestore: {} as Firestore });
    const result = await repo.listEvents();

    expect(collection).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data![0]).toMatchObject({ id: 'e1', title: 'Quiz 1' });
  });

  it('handles an empty events collection', async () => {
    (getDocs as any).mockResolvedValue({ docs: [] } as never);

    const repo = new EventRepository({ firestore: {} as Firestore });
    const result = await repo.listEvents();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('propagates read errors', async () => {
    (getDocs as any).mockRejectedValue(new Error('network error'));

    const repo = new EventRepository({ firestore: {} as Firestore });
    const result = await repo.listEvents();

    expect(result.data).toBeNull();
    expect(result.error!.code).toBe('firestore-read-failed');
    expect(result.error!.message).toBe('network error');
  });
});
