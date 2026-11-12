'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}));

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import {
  AdminRepository,
  type ResourceCreateInput,
  type ResourceMetadataOriginal,
} from '@/services/repositories/adminRepository';

const firestore = {} as Firestore;
const COURSE = 'stats' as const;
const CATEGORY = 'lectures' as const;

const input: ResourceCreateInput = {
  name: 'Lecture 01',
  url: 'https://drive.google.com/file/d/FILE123/view',
  previewURL: 'https://drive.google.com/file/d/FILE123/view?usp=sharing',
  downloadURL: 'https://drive.google.com/uc?export=download&id=FILE123',
  type: 'pdf',
  description: 'Intro',
  date: 'Nov 12, 2026',
};

const original: ResourceMetadataOriginal = {
  name: 'Lecture 01',
  description: 'Intro',
  type: 'pdf',
  url: input.url,
  previewURL: input.previewURL,
  downloadURL: input.downloadURL,
  date: input.date,
};

function makeRepo() {
  return new AdminRepository({ firestore });
}

beforeEach(() => {
  vi.clearAllMocks();
  (collection as any).mockReturnValue({ path: 'collection-ref' });
  (doc as any).mockReturnValue({ path: 'doc-ref' });
  (serverTimestamp as any).mockReturnValue({ __serverTimestamp: true });
});

describe('AdminRepository without Firebase', () => {
  it('fails closed for every write when Firestore is not configured', async () => {
    const repo = new AdminRepository({ firestore: null });
    expect((await repo.createResource(COURSE, CATEGORY, input)).error?.code).toBe(
      'firebase-not-configured',
    );
    expect(
      (
        await repo.updateResourceMetadata(
          COURSE,
          CATEGORY,
          'id',
          { name: 'x' },
          original,
        )
      ).error?.code,
    ).toBe('firebase-not-configured');
    expect(
      (await repo.deleteResource(COURSE, CATEGORY, 'id')).error?.code,
    ).toBe('firebase-not-configured');
    expect(addDoc).not.toHaveBeenCalled();
    expect(deleteDoc).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

describe('AdminRepository.createResource', () => {
  it('writes the exact legacy document payload to the legacy path', async () => {
    (addDoc as any).mockResolvedValue({ id: 'new-resource' });

    const result = await makeRepo().createResource(COURSE, CATEGORY, input);

    expect(collection).toHaveBeenCalledWith(firestore, 'courses/stats/lectures');
    expect(serverTimestamp).toHaveBeenCalledTimes(1);
    expect(addDoc).toHaveBeenCalledWith(
      { path: 'collection-ref' },
      {
        name: 'Lecture 01',
        url: input.url,
        previewURL: input.previewURL,
        downloadURL: input.downloadURL,
        type: 'pdf',
        description: 'Intro',
        date: 'Nov 12, 2026',
        createdAt: { __serverTimestamp: true },
      },
    );
    expect(result).toEqual({ data: { id: 'new-resource' }, error: null });
  });

  it('reports a repository failure instead of throwing', async () => {
    (addDoc as any).mockRejectedValue(new Error('permission-denied'));

    const result = await makeRepo().createResource(COURSE, CATEGORY, input);

    expect(result.data).toBeNull();
    expect(result.error).toEqual({
      code: 'resource-create-failed',
      message: 'permission-denied',
    });
  });
});

describe('AdminRepository.updateResourceMetadata', () => {
  function mockTransaction(current: Record<string, unknown>) {
    const update = vi.fn();
    (runTransaction as any).mockImplementation(
      async (_db: unknown, callback: (tx: unknown) => Promise<void>) =>
        callback({
          get: vi.fn(async () => ({
            exists: () => true,
            data: () => current,
          })),
          update,
        }),
    );
    return update;
  }

  it('reads, stale-checks, updates and verifies the saved document', async () => {
    const update = mockTransaction({
      name: 'Lecture 01',
      description: 'Intro',
      type: 'pdf',
    });
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Lecture 01 (revised)',
        description: 'Updated',
        type: 'ppt',
        url: original.url,
        previewURL: original.previewURL,
        downloadURL: original.downloadURL,
        date: original.date,
      }),
    });

    const result = await makeRepo().updateResourceMetadata(
      COURSE,
      CATEGORY,
      'res-1',
      { name: 'Lecture 01 (revised)', description: 'Updated', type: 'ppt' },
      original,
    );

    expect(doc).toHaveBeenCalledWith(firestore, 'courses/stats/lectures/res-1');
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      { path: 'doc-ref' },
      { name: 'Lecture 01 (revised)', description: 'Updated', type: 'ppt' },
    );
    expect(result).toEqual({ data: null, error: null });
  });

  it('rejects a stale document instead of performing a blind update', async () => {
    const update = mockTransaction({
      name: 'Changed elsewhere',
      description: 'Intro',
      type: 'pdf',
    });

    const result = await makeRepo().updateResourceMetadata(
      COURSE,
      CATEGORY,
      'res-1',
      { name: 'New name' },
      original,
    );

    expect(update).not.toHaveBeenCalled();
    expect(result.error?.code).toBe('resource-stale');
    expect(result.error?.message).toMatch(/changed since/i);
  });

  it('rejects a missing document', async () => {
    (runTransaction as any).mockImplementation(
      async (_db: unknown, callback: (tx: unknown) => Promise<void>) =>
        callback({
          get: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
          update: vi.fn(),
        }),
    );

    const result = await makeRepo().updateResourceMetadata(
      COURSE,
      CATEGORY,
      'res-1',
      { name: 'New name' },
      original,
    );

    expect(result.error?.code).toBe('resource-missing');
  });

  it('rejects when read-back cannot verify the saved patch', async () => {
    mockTransaction({
      name: 'Lecture 01',
      description: 'Intro',
      type: 'pdf',
    });
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Still the old name',
        description: 'Intro',
        type: 'pdf',
        url: original.url,
        previewURL: original.previewURL,
        downloadURL: original.downloadURL,
        date: original.date,
      }),
    });

    const result = await makeRepo().updateResourceMetadata(
      COURSE,
      CATEGORY,
      'res-1',
      { name: 'Lecture 01 (revised)' },
      original,
    );

    expect(result.error?.code).toBe('resource-update-unverified');
  });

  it('rejects when unrelated resource fields changed during save', async () => {
    mockTransaction({
      name: 'Lecture 01',
      description: 'Intro',
      type: 'pdf',
    });
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Lecture 01 (revised)',
        description: 'Intro',
        type: 'pdf',
        url: 'https://example.com/replaced.pdf',
        previewURL: original.previewURL,
        downloadURL: original.downloadURL,
        date: original.date,
      }),
    });

    const result = await makeRepo().updateResourceMetadata(
      COURSE,
      CATEGORY,
      'res-1',
      { name: 'Lecture 01 (revised)' },
      original,
    );

    expect(result.error?.code).toBe('resource-fields-changed');
  });

  it('maps transaction failures to a safe repository error', async () => {
    (runTransaction as any).mockRejectedValue(new Error('unavailable'));

    const result = await makeRepo().updateResourceMetadata(
      COURSE,
      CATEGORY,
      'res-1',
      { name: 'New name' },
      original,
    );

    expect(result.error?.code).toBe('resource-update-failed');
  });
});

describe('AdminRepository.deleteResource', () => {
  it('deletes only the Firestore metadata document', async () => {
    (deleteDoc as any).mockResolvedValue(undefined);

    const result = await makeRepo().deleteResource(COURSE, CATEGORY, 'res-1');

    expect(doc).toHaveBeenCalledWith(firestore, 'courses/stats/lectures/res-1');
    expect(deleteDoc).toHaveBeenCalledWith({ path: 'doc-ref' });
    // Metadata-only: no Drive/Storage call exists in this repository.
    expect(result).toEqual({ data: null, error: null });
  });

  it('reports deletion failures', async () => {
    (deleteDoc as any).mockRejectedValue(new Error('permission-denied'));

    const result = await makeRepo().deleteResource(COURSE, CATEGORY, 'res-1');

    expect(result.error).toEqual({
      code: 'resource-delete-failed',
      message: 'permission-denied',
    });
  });
});
