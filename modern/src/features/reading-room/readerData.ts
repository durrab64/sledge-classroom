// Reading Room presentation metadata.
//
// The category labels/icons come from the legacy RESOURCE_CATEGORY_META table
// in app.js (which stayed in sync with the course tabs). Mode/tab routing is
// shared with the migrated course detail through RESOURCE_CATEGORY_META so a
// reader link always lands on the matching catalogue tab.

import type { CourseId, FileCategory } from '@/types';
import {
  RESOURCE_CATEGORY_META,
  type CourseMode,
  type CourseTab,
} from '@/features/courses/courseData';

export interface ReaderCategoryMeta {
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly mode: CourseMode;
  readonly tab: CourseTab;
}

const CATEGORY_LABELS: Record<
  FileCategory,
  { label: string; shortLabel: string; icon: string }
> = {
  lectures: {
    label: 'Lecture Slides',
    shortLabel: 'Slides',
    icon: 'fas fa-chalkboard',
  },
  papers: {
    label: 'Past Papers',
    shortLabel: 'Papers',
    icon: 'fas fa-scroll',
  },
  related: {
    label: 'Related Materials',
    shortLabel: 'Materials',
    icon: 'fas fa-paperclip',
  },
  lab: {
    label: 'Lab Manuals',
    shortLabel: 'Manuals',
    icon: 'fas fa-flask',
  },
  lab_papers: {
    label: 'Lab Past Papers',
    shortLabel: 'Lab papers',
    icon: 'fas fa-scroll',
  },
  lab_tasks: {
    label: 'Code & Lab Tasks',
    shortLabel: 'Tasks',
    icon: 'fas fa-laptop-code',
  },
};

export function getReaderCategoryMeta(
  category: string,
): ReaderCategoryMeta | null {
  const key = category as FileCategory;
  const routing = RESOURCE_CATEGORY_META[key];
  const labels = CATEGORY_LABELS[key];
  if (!routing || !labels) return null;
  return { ...routing, ...labels };
}

/** Build the modern reader path for a resource's stable Firestore ID. */
export function buildReaderPath(
  courseId: CourseId,
  category: FileCategory,
  docId: string,
): string {
  const encodedDoc = docId
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `/courses/${encodeURIComponent(courseId)}/${encodeURIComponent(
    category,
  )}/${encodedDoc}`;
}

export interface ReaderFocusTarget {
  readonly courseId: CourseId;
  readonly category: string;
  readonly docId: string;
}

const RETURN_FOCUS_KEY = 'sledge.reader.returnFocus';

/** Remember the row that opened the reader so Back can restore focus to it. */
export function rememberReaderFocus(target: ReaderFocusTarget): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(RETURN_FOCUS_KEY, JSON.stringify(target));
  } catch {
    // Storage can be unavailable (private mode); focus restoration is optional.
  }
}

/** Consume a pending focus target for a course, if one exists. */
export function takeReaderFocus(
  courseId: CourseId,
): ReaderFocusTarget | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(RETURN_FOCUS_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(RETURN_FOCUS_KEY);
    const parsed = JSON.parse(raw) as Partial<ReaderFocusTarget>;
    if (
      parsed.courseId === courseId &&
      typeof parsed.category === 'string' &&
      typeof parsed.docId === 'string'
    ) {
      return {
        courseId: parsed.courseId,
        category: parsed.category,
        docId: parsed.docId,
      };
    }
    return null;
  } catch {
    return null;
  }
}
