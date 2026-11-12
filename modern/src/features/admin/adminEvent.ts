// Pure admin event helpers.
//
// These functions port the legacy `saveEvent()` validation and payload rules
// without touching Firebase. Keeping them pure makes the calendar-event
// workflow testable alongside the resource workflows and prevents the payload
// shape from drifting from the existing `events/{eventId}` contract.

import type { CourseId } from '@/types';
import { COURSES } from '@/features/courses/courseData';
import type { EventCreateInput } from '@/services/repositories/adminRepository';

export const EVENT_TYPE_OPTIONS: readonly {
  value: string;
  label: string;
  icon: string;
}[] = [
  { value: 'quiz', label: 'Quiz', icon: 'fas fa-question-circle' },
  { value: 'assignment', label: 'Assignment', icon: 'fas fa-clipboard-list' },
  {
    value: 'presentation',
    label: 'Presentation',
    icon: 'fas fa-chalkboard-teacher',
  },
  { value: 'exam', label: 'Exam', icon: 'fas fa-file-signature' },
  { value: 'other', label: 'Other', icon: 'fas fa-star' },
];

export const EVENT_TYPE_VALUES: readonly string[] = EVENT_TYPE_OPTIONS.map(
  (option) => option.value,
);

export interface EventDraft {
  title: string;
  date: string;
  time: string;
  type: string;
  courseId: CourseId;
  description: string;
  groups: string;
}

export type EventValidationResult =
  | { ok: true; input: EventCreateInput }
  | { ok: false; message: string; field?: 'title' | 'date' };

/** Split the legacy comma-separated groups input into trimmed names. */
export function parseEventGroups(value: string): string[] {
  return value
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean);
}

/** Default form values for the add-event dialog. */
export function initialEventDraft(courseId: CourseId): EventDraft {
  return {
    title: '',
    date: '',
    time: '',
    type: 'quiz',
    courseId,
    description: '',
    groups: '',
  };
}

/**
 * Validate and build the exact document payload for a new event. Mirrors the
 * legacy saveEvent() rules: title and date are required, date is an ISO
 * `YYYY-MM-DD` value from the date input, and groups are comma-separated.
 */
export function buildEventInput(draft: EventDraft): EventValidationResult {
  const title = draft.title.trim();
  if (!title) {
    return {
      ok: false,
      message: 'Please fill in the title and date.',
      field: 'title',
    };
  }

  const date = draft.date.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      ok: false,
      message: 'Please fill in the title and date.',
      field: 'date',
    };
  }

  if (!COURSES.some((course) => course.id === draft.courseId)) {
    return { ok: false, message: 'Please choose a course.' };
  }

  if (!EVENT_TYPE_VALUES.includes(draft.type)) {
    return { ok: false, message: 'Please choose an event type.' };
  }

  return {
    ok: true,
    input: {
      title,
      date,
      time: draft.time.trim(),
      type: draft.type,
      courseId: draft.courseId,
      description: draft.description.trim(),
      groups: parseEventGroups(draft.groups),
    },
  };
}
