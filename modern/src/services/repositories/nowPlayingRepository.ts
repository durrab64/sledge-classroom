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

import {
  type Database,
  get,
  onValue,
  ref,
  type DataSnapshot,
} from 'firebase/database';
import type { NowPlaying, RepositoryResult } from '@/types';
import { repositoryFailure, repositorySuccess } from '@/types';

export interface NowPlayingRepositoryDependencies {
  readonly database: Database | null;
}

export class NowPlayingRepository {
  private readonly database: Database | null;

  constructor(dependencies: NowPlayingRepositoryDependencies) {
    this.database = dependencies.database;
  }

  /** One-time read of the current now-playing record. */
  async getNowPlaying(): Promise<RepositoryResult<NowPlaying | null>> {
    if (!this.database) {
      return repositoryFailure(
        'firebase-not-configured',
        'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
      );
    }

    try {
      const snapshot = await get(ref(this.database, 'nowPlaying/current'));
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
  ): () => void {
    if (!this.database) {
      onChange(null);
      return () => {
        /* no-op when unconfigured */
      };
    }

    const nowPlayingRef = ref(this.database, 'nowPlaying/current');
    const unsubscribe = onValue(
      nowPlayingRef,
      (snapshot: DataSnapshot) => {
        onChange(mapNowPlaying(snapshot));
      },
    );
    return unsubscribe;
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
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

// ---- pure normalization helpers (testable without Firebase) ----

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
