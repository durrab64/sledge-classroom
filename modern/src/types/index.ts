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

// Migration scaffolding marker: routes and features below are placeholders.
export interface MigrationStatus {
  feature: string;
  status: 'planned' | 'in-progress' | 'migrated';
  note: string;
}
