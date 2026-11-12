// Owner-only resource write repository.
//
// Ports the three legacy Firestore write operations verbatim in behaviour:
//   - confirmUpload()            -> createResource()
//   - updateResourceMetadata()   -> updateResourceMetadata()
//   - deleteFileFromDB()         -> deleteResource()
//   - saveEvent()                -> createEvent()
//   - deleteEvent()              -> deleteEvent()
//
// Document contract (unchanged):
//   courses/{courseId}/{category}/{fileId}
//   events/{eventId}
//   name, url, previewURL, downloadURL, type, description, date, createdAt
//
// Deletion semantics are metadata-only: the legacy application deletes the
// Firestore document and never deletes the Google Drive file. createResource()
// is the only new-resource persistence path; the admin UI calls it exclusively
// from the confirmed upload dialog.
//
// Authorization is enforced by the deployed Firestore rules. This repository
// performs no client-side authorization and never claims to replace the rules.

import {
  type Firestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import type {
  CourseId,
  FileCategory,
  RepositoryResult,
  ResourceType,
} from '@/types';
import { repositoryFailure, repositorySuccess } from '@/types';

/** The exact new-resource document payload built by the upload workflow. */
export interface ResourceCreateInput {
  name: string;
  url: string;
  previewURL: string;
  downloadURL: string;
  type: ResourceType;
  description: string;
  date: string;
}

/** The metadata fields the legacy transaction is allowed to update. */
export type ResourceMetadataPatch = Partial<
  Pick<{ name: string; description: string; type: ResourceType },
    'name' | 'description' | 'type'>
>;

/**
 * The exact new-event payload built by the admin event dialog. Mirrors the
 * legacy saveEvent() write to `events/{eventId}`.
 */
export interface EventCreateInput {
  title: string;
  date: string;
  time: string;
  type: string;
  courseId: CourseId;
  description: string;
  groups: string[];
}

/** Snapshot used for legacy stale-document detection and read-back checks. */
export interface ResourceMetadataOriginal {
  name: string;
  description: string;
  type: ResourceType;
  url: string;
  previewURL: string;
  downloadURL: string;
  date: string;
}

export interface AdminRepositoryDependencies {
  readonly firestore: Firestore | null;
}

function notConfigured(): RepositoryResult<never> {
  return repositoryFailure(
    'firebase-not-configured',
    'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resourcePath(
  courseId: CourseId,
  category: FileCategory,
  resourceId?: string,
): string {
  const base = `courses/${courseId}/${category}`;
  return resourceId ? `${base}/${resourceId}` : base;
}

export class AdminRepository {
  private readonly firestore: Firestore | null;

  constructor(dependencies: AdminRepositoryDependencies) {
    this.firestore = dependencies.firestore;
  }

  /**
   * Persist a new resource document. This mirrors the legacy confirmUpload()
   * write exactly, including the server timestamp and the derived
   * preview/download links supplied by the caller.
   */
  async createResource(
    courseId: CourseId,
    category: FileCategory,
    input: ResourceCreateInput,
  ): Promise<RepositoryResult<{ id: string }>> {
    if (!this.firestore) return notConfigured();

    try {
      const ref = await addDoc(
        collection(this.firestore, resourcePath(courseId, category)),
        {
          name: input.name,
          url: input.url,
          previewURL: input.previewURL,
          downloadURL: input.downloadURL,
          type: input.type,
          description: input.description,
          date: input.date,
          createdAt: serverTimestamp(),
        },
      );
      return repositorySuccess({ id: ref.id });
    } catch (error) {
      return repositoryFailure('resource-create-failed', messageOf(error));
    }
  }

  /**
   * Transactional metadata edit. Preserves the legacy sequence:
   * get -> compare current name/description/type against the caller's original
   * snapshot -> update -> read back -> verify saved fields and unrelated
   * resource fields. It never performs a blind update.
   */
  async updateResourceMetadata(
    courseId: CourseId,
    category: FileCategory,
    resourceId: string,
    patch: ResourceMetadataPatch,
    original: ResourceMetadataOriginal,
  ): Promise<RepositoryResult<null>> {
    if (!this.firestore) return notConfigured();

    const ref = doc(
      this.firestore,
      resourcePath(courseId, category, resourceId),
    );
    const originalName = (original.name ?? '').trim();
    const originalDescription = (original.description ?? '').trim();
    const originalType = (original.type ?? '').trim();

    try {
      await runTransaction(this.firestore, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) {
          throw new Error('missing-document');
        }
        const current = snapshot.data() ?? {};
        const currentName = String(current.name ?? '').trim();
        const currentDescription = String(current.description ?? '').trim();
        const currentType = String(current.type ?? '').trim();
        if (
          currentName !== originalName ||
          currentDescription !== originalDescription ||
          currentType !== originalType
        ) {
          throw new Error('stale-document');
        }
        transaction.update(
          ref,
          patch as Record<string, unknown>,
        );
      });
    } catch (error) {
      const message = messageOf(error);
      if (message === 'missing-document') {
        return repositoryFailure(
          'resource-missing',
          'Resource no longer exists.',
        );
      }
      if (message === 'stale-document') {
        return repositoryFailure(
          'resource-stale',
          'Resource changed since you loaded it. Reload and try again.',
        );
      }
      return repositoryFailure(
        'resource-update-failed',
        'Could not save metadata. Please try again.',
      );
    }

    try {
      const savedSnapshot = await getDoc(ref);
      if (!savedSnapshot.exists()) {
        return repositoryFailure(
          'resource-missing',
          'Resource no longer exists.',
        );
      }
      const saved = savedSnapshot.data() ?? {};
      for (const field of Object.keys(patch)) {
        if (
          saved[field] !==
          (patch as Record<string, unknown>)[field]
        ) {
          return repositoryFailure(
            'resource-update-unverified',
            'Saved metadata could not be verified.',
          );
        }
      }
      if (
        String(saved.url ?? '') !== (original.url ?? '') ||
        String(saved.previewURL ?? '') !== (original.previewURL ?? '') ||
        String(saved.downloadURL ?? '') !== (original.downloadURL ?? '') ||
        String(saved.date ?? '') !== (original.date ?? '')
      ) {
        return repositoryFailure(
          'resource-fields-changed',
          'Unrelated resource fields changed during save.',
        );
      }
      return repositorySuccess(null);
    } catch {
      return repositoryFailure(
        'resource-update-unverified',
        'Saved metadata could not be verified.',
      );
    }
  }

  /**
   * Delete the resource metadata document. The Google Drive file is left
   * untouched, matching the established legacy behaviour.
   */
  async deleteResource(
    courseId: CourseId,
    category: FileCategory,
    resourceId: string,
  ): Promise<RepositoryResult<null>> {
    if (!this.firestore) return notConfigured();

    try {
      await deleteDoc(
        doc(this.firestore, resourcePath(courseId, category, resourceId)),
      );
      return repositorySuccess(null);
    } catch (error) {
      return repositoryFailure('resource-delete-failed', messageOf(error));
    }
  }

  /**
   * Persist a new calendar event under `events/{eventId}`. This mirrors the
   * legacy saveEvent() payload exactly, including the server timestamp and
   * the comma-separated groups array.
   */
  async createEvent(
    input: EventCreateInput,
  ): Promise<RepositoryResult<{ id: string }>> {
    if (!this.firestore) return notConfigured();

    try {
      const ref = await addDoc(collection(this.firestore, 'events'), {
        title: input.title,
        date: input.date,
        time: input.time,
        type: input.type,
        courseId: input.courseId,
        description: input.description,
        groups: input.groups,
        createdAt: serverTimestamp(),
      });
      return repositorySuccess({ id: ref.id });
    } catch (error) {
      return repositoryFailure('event-create-failed', messageOf(error));
    }
  }

  /** Delete a calendar event document by id. Mirrors the legacy deleteEvent(). */
  async deleteEvent(eventId: string): Promise<RepositoryResult<null>> {
    if (!this.firestore) return notConfigured();

    try {
      await deleteDoc(doc(this.firestore, 'events', eventId));
      return repositorySuccess(null);
    } catch (error) {
      return repositoryFailure('event-delete-failed', messageOf(error));
    }
  }
}
