// Repository barrel.
//
// Live repository instances are constructed here from the Firebase service
// (`src/services/firebase.ts`). Components import repositories from this
// barrel rather than instantiating them directly, keeping Firebase usage
// centralized in the service layer.
//
// Tests construct repositories directly with mock dependencies instead of
// importing this barrel, so no Firebase SDK or network is involved in tests.

import { db, rtdb, firebaseConfigured } from '../firebase';
import { CourseRepository } from './courseRepository';
import { EventRepository } from './eventRepository';
import { NowPlayingRepository } from './nowPlayingRepository';

// `db` / `rtdb` are `Firestore | null` / `Database | null` when Firebase is
// not configured, which matches the repository dependency types.
export const courseRepository = new CourseRepository({ firestore: db });
export const eventRepository = new EventRepository({ firestore: db });
export const nowPlayingRepository = new NowPlayingRepository({ database: rtdb });

export { firebaseConfigured };
export type { RepositoryResult, RepositoryError } from '@/types';
export type { CourseRepository } from './courseRepository';
export type { EventRepository } from './eventRepository';
export type { NowPlayingRepository } from './nowPlayingRepository';

// Re-export pure mapping functions for component-level testing.
export { mapResourceFile } from './courseRepository';
export { mapEvent } from './eventRepository';
export { mapNowPlaying } from './nowPlayingRepository';
