'use strict';

import { describe, it, expect } from 'vitest';
import {
  EVENT_TYPE_VALUES,
  buildEventInput,
  initialEventDraft,
  parseEventGroups,
} from '@/features/admin/adminEvent';

describe('parseEventGroups', () => {
  it('splits, trims and drops empty comma-separated names', () => {
    expect(parseEventGroups(' Group A , ,Group B, ')).toEqual([
      'Group A',
      'Group B',
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(parseEventGroups('   ')).toEqual([]);
  });
});

describe('buildEventInput (legacy saveEvent rules)', () => {
  it('starts with a quiz draft for the selected course', () => {
    const draft = initialEventDraft('os');
    expect(draft.courseId).toBe('os');
    expect(draft.type).toBe('quiz');
    expect(draft.title).toBe('');
  });

  it('requires a title', () => {
    const result = buildEventInput({
      ...initialEventDraft('os'),
      title: '   ',
      date: '2026-11-20',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe('title');
  });

  it('requires a valid ISO date', () => {
    const result = buildEventInput({
      ...initialEventDraft('os'),
      title: 'Quiz',
      date: '20/11/2026',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe('date');
  });

  it('builds the exact events document payload', () => {
    const result = buildEventInput({
      title: '  Quiz 02  ',
      date: '2026-11-20',
      time: ' 10:30 ',
      type: 'quiz',
      courseId: 'os',
      description: '  Chapters 3-4 ',
      groups: 'Group A, Group B ',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input).toEqual({
        title: 'Quiz 02',
        date: '2026-11-20',
        time: '10:30',
        type: 'quiz',
        courseId: 'os',
        description: 'Chapters 3-4',
        groups: ['Group A', 'Group B'],
      });
    }
  });

  it('rejects unknown event types', () => {
    const result = buildEventInput({
      ...initialEventDraft('os'),
      title: 'Quiz',
      date: '2026-11-20',
      type: 'unknown',
    });
    expect(result.ok).toBe(false);
  });

  it('only accepts the five legacy event types', () => {
    expect(EVENT_TYPE_VALUES).toEqual([
      'quiz',
      'assignment',
      'presentation',
      'exam',
      'other',
    ]);
  });
});
