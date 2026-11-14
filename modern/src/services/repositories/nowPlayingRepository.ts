// Now Playing repository (read-only).
//
// Reads from the legacy Realtime Database contract:
//   nowPlaying/current
//
// Public read path (database.rules.json):
//   nowPlaying/current: ".read": true, ".write": "auth != null"
// All other paths: read/write false.
//
// This repository performs reads only. Writes to RTDB are deferred to later
// checkpoints and are never invoked here.

import type { Database, DataSnapshot } from 'firebase/database';
import type { NowPlaying, RepositoryResult } from '@/types';
import { repositoryFailure, repositorySuccess } from '@/types';

export interface NowPlayingRepositoryDependencies {
  /**
   * The RTDB instance, or a promise resolving to it (lazy SDK load), or null
   * when Firebase is unconfigured.
   */
  readonly database: Database | null | Promise<Database | null>;
}

export class NowPlayingRepository {
  private readonly database: Database | null | Promise<Database | null>;

  constructor(dependencies: NowPlayingRepositoryDependencies) {
    this.database = dependencies.database;
  }

  /** Resolve the (possibly lazy) database handle. */
  private async resolveDatabase(): Promise<Database | null> {
    if (this.database === null) {
      return null;
    }
    if (typeof (this.database as Promise<unknown>).then === 'function') {
      return this.database as Promise<Database | null>;
    }
    return this.database;
  }

  /** One-time read of the current now-playing record. */
  async getNowPlaying(): Promise<RepositoryResult<NowPlaying | null>> {
    const database = await this.resolveDatabase();
    if (!database) {
      return repositoryFailure(
        'firebase-not-configured',
        'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
      );
    }

    try {
      // The Realtime Database SDK is dynamically imported so it stays out of
      // the critical bundle; it is only needed for this decorative widget.
      const { get, ref } = await import('firebase/database');
      const snapshot = await get(ref(database, 'nowPlaying/current'));
      return repositorySuccess(mapNowPlaying(snapshot));
    } catch (error) {
      return repositoryFailure(
        'rtdb-read-failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /** Subscribe to real-time now-playing updates. Returns an unsubscribe function. */
  subscribeNowPlaying(
    onChange: (data: NowPlaying | null) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const database = await this.resolveDatabase();
      if (cancelled) {
        return;
      }
      if (!database) {
        onChange(null);
        return;
      }
      // Dynamic SDK import (see getNowPlaying) keeps the bundle lazy.
      const { ref, onValue } = await import('firebase/database');
      if (cancelled) {
        return;
      }
      unsubscribe = onValue(
        ref(database, 'nowPlaying/current'),
        (snapshot: DataSnapshot) => {
          onChange(mapNowPlaying(snapshot));
        },
        (error: Error) => {
          onError?.(error);
        },
      );
    })().catch((error: Error) => {
      if (!cancelled) {
        onError?.(error);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }
}

/** Map an RTDB snapshot to the shared NowPlaying model. Returns null when absent/invalid. */
export function mapNowPlaying(snapshot: DataSnapshot): NowPlaying | null {
  const value = snapshot.val();
  if (value === null || value === undefined || typeof value !== 'object') {
    return null;
  }
  const data = value as Record<string, unknown>;

  const title = normalizeString(data.title, '');
  const artist = normalizeString(data.artist, '');
  if (!title && !artist) {
    return null;
  }

  return {
    title,
    artist,
    artwork: typeof data.artwork === 'string' ? data.artwork : undefined,
    ytLink: typeof data.ytLink === 'string' ? data.ytLink : undefined,
    songUrl: typeof data.songUrl === 'string' ? data.songUrl : undefined,
    source: typeof data.source === 'string' ? data.source : undefined,
    isPlaying: typeof data.isPlaying === 'boolean' ? data.isPlaying : undefined,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

// ---- pure normalization helpers (testable without Firebase) ----

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
