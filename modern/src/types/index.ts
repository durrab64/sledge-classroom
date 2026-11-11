// Shared TypeScript models for the Sledge Classroom 2.0 migration.
// These mirror the legacy domain model (see CP2 blueprint §2.2) so the
// React implementation can preserve data shape and validation.

export type CourseId = 'stats' | 'automata' | 'calculus' | 'os' | 'web' | 'arch';

export type FileCategory =
  | 'lectures'
  | 'papers'
  | 'related'
  | 'lab'
  | 'lab_papers'
  | 'lab_tasks';

export type ResourceType =
  | 'pdf'
  | 'ppt'
  | 'doc'
  | 'sheet'
  | 'code'
  | 'zip'
  | 'link';

export interface Course {
  id: CourseId;
  name: string;
  code: string;
  color: string;
  gradient: string;
  icon: string;
  hasLab: boolean;
  description: string;
}

export interface ResourceFile {
  id: string;
  courseId: CourseId;
  category: FileCategory;
  name: string;
  url: string;
  previewURL: string;
  downloadURL: string;
  type: ResourceType;
  description: string;
  date: string;
  createdAt?: unknown; // Firestore server timestamp (opaque until integrated)
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  courseId: CourseId;
  groups: string;
  description: string;
  createdAt?: unknown;
}

export interface NowPlaying {
  title: string;
  artist: string;
  artwork?: string;
  ytLink?: string;
  updatedAt: number;
}

export interface VisualState {
  accent: string;
  font: 'bebas' | 'inter' | 'jetbrains';
  cursor: string;
  cards: string;
  animation: 'off' | 'reduced' | 'full';
  characterFrequency: 'off' | 'rare' | 'normal' | 'frequent';
  spotlight: boolean;
  cursorTrail: boolean;
  bloodMoon: boolean;
  quietMode: boolean;
}

// Repository result types (shared models).
//
// Every repository method returns a RepositoryResult<T>. Exactly one of
// `data` / `error` is populated: on success `data` is present and `error`
// is null; on failure `error` is present and `data` is null. Repositories
// never silently fall back to invented data.

export interface RepositoryError {
  readonly code: string;
  readonly message: string;
}

export interface RepositoryResult<T> {
  readonly data: T | null;
  readonly error: RepositoryError | null;
}

export function repositorySuccess<T>(data: T): RepositoryResult<T> {
  return { data, error: null };
}

export function repositoryFailure(code: string, message: string): RepositoryResult<never> {
  return { data: null, error: { code, message } };
}

// Migration scaffolding marker: routes and features below are placeholders.
export interface MigrationStatus {
  feature: string;
  status: 'planned' | 'in-progress' | 'migrated';
  note: string;
}

// Authentication types (mirror legacy auth behavior, see CP2 §3.3).
// The legacy owner UID is audited from firestore.rules / admin-auth.js and
// must not be changed here.
export const AUTH_OWNER_UID = 'dRHxakX2iAWM4w1IqtYPLpCZrwr2';

export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
}

export interface AuthError {
  readonly code: string;
  readonly message: string;
}

export type AuthStatus = 'unauthenticated' | 'authenticated' | 'loading' | 'error';

export interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly status: AuthStatus;
  readonly isAuthenticated: boolean;
  readonly isOwner: boolean;
  readonly error: AuthError | null;
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly clearError: () => void;
}

export interface RouteGuardResult {
  readonly canAccess: boolean;
  readonly reason: 'loading' | 'unauthenticated' | 'not-owner' | 'allowed';
}
