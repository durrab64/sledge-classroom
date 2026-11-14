// Repository barrel.
//
// Live repository instances are constructed here from the Firebase service
// (`src/services/firebase.ts`). Components import repositories from this
// barrel rather than instantiating them directly, keeping Firebase usage
// centralized in the service layer.
//
// Tests construct repositories directly with mock dependencies instead of
// importing this barrel, so no Firebase SDK or network is involved in tests.

import { db, getRtdb, firebaseConfigured } from '../firebase';
import { AdminRepository } from './adminRepository';
import { CourseRepository } from './courseRepository';
import { EventRepository } from './eventRepository';
import { NowPlayingRepository } from './nowPlayingRepository';

// `db` is `Firestore | null` when Firebase is not configured, which matches
// the repository dependency types. The RTDB handle is resolved lazily so the
// Realtime Database SDK never loads into the critical bundle.
export const courseRepository = new CourseRepository({ firestore: db });
export const adminRepository = new AdminRepository({ firestore: db });
export const eventRepository = new EventRepository({ firestore: db });
export const nowPlayingRepository = new NowPlayingRepository({
  database: getRtdb(),
});

export { firebaseConfigured };
export type { RepositoryResult, RepositoryError } from '@/types';
export type { AdminRepository } from './adminRepository';
export type { CourseRepository } from './courseRepository';
export type { EventRepository } from './eventRepository';
export type { NowPlayingRepository } from './nowPlayingRepository';

// Re-export pure mapping functions for component-level testing.
export { mapResourceFile } from './courseRepository';
export { mapEvent } from './eventRepository';
export { mapNowPlaying } from './nowPlayingRepository';
