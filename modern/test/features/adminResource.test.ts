'use strict';

import { describe, expect, it } from 'vitest';
import { makeResource } from './fixtures';
import {
  buildMetadataPatch,
  buildResourceInput,
  categoriesForCourse,
  courseForId,
  defaultTypeForCategory,
  initialUploadDraft,
  isDuplicateResource,
  isFileCategory,
  isCourseId,
  metadataOriginalFrom,
  normalizeUploadUrl,
  ADMIN_RESOURCE_TYPES,
} from '@/features/admin/adminResource';
import { COURSES } from '@/features/courses/courseData';

const NOW = new Date('2026-11-12T10:00:00Z');

describe('normalizeUploadUrl (legacy confirmUpload rules)', () => {
  it('prefixes // links with https:', () => {
    const result = normalizeUploadUrl('//example.com/file.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.links.url).toBe('https://example.com/file.pdf');
      expect(result.links.previewURL).toBe('https://example.com/file.pdf');
    }
  });

  it('adds https:// to bare hosts', () => {
    const result = normalizeUploadUrl('example.com/handout.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.links.url).toBe('https://example.com/handout.pdf');
  });

  it('rejects empty and non-http(s) links before any write', () => {
    expect(normalizeUploadUrl('   ').ok).toBe(false);
    expect(normalizeUploadUrl('javascript:alert(1)').ok).toBe(false);
    expect(normalizeUploadUrl('data:text/html,hi').ok).toBe(false);
    expect(normalizeUploadUrl('ftp://example.com/file.pdf').ok).toBe(false);
  });

  it('derives Drive preview and download links from a file/d/<id> URL', () => {
    const result = normalizeUploadUrl(
      'https://drive.google.com/file/d/ABC_123/view?usp=sharing',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.links.previewURL).toBe(
        'https://drive.google.com/file/d/ABC_123/view?usp=sharing',
      );
      expect(result.links.downloadURL).toBe(
        'https://drive.google.com/uc?export=download&id=ABC_123',
      );
    }
  });

  it('derives Drive links from open/uc?id= URLs', () => {
    const result = normalizeUploadUrl(
      'https://drive.google.com/open?id=XYZ789',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.links.previewURL).toBe(
        'https://drive.google.com/file/d/XYZ789/view?usp=sharing',
      );
      expect(result.links.downloadURL).toBe(
        'https://drive.google.com/uc?export=download&id=XYZ789',
      );
    }
  });

  it('converts Dropbox dl=0 to a direct download only for the download link', () => {
    const result = normalizeUploadUrl(
      'https://www.dropbox.com/s/abc/file.pdf?dl=0',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.links.url).toContain('dl=0');
      expect(result.links.downloadURL).toContain('dl=1');
    }
  });
});

describe('buildResourceInput (validation and payload)', () => {
  it('requires a title', () => {
    const result = buildResourceInput(
      { title: '  ', url: 'https://example.com/a.pdf', type: 'pdf', description: '' },
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe('title');
  });

  it('requires a valid http(s) link', () => {
    const result = buildResourceInput(
      { title: 'Title', url: 'javascript:alert(1)', type: 'pdf', description: '' },
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe('url');
  });

  it('builds the exact legacy resource fields and date format', () => {
    const result = buildResourceInput(
      {
        title: '  Lecture 01  ',
        url: 'https://example.com/notes.pdf',
        type: 'link',
        description: '  Intro  ',
      },
      NOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input).toEqual({
        name: 'Lecture 01',
        url: 'https://example.com/notes.pdf',
        previewURL: 'https://example.com/notes.pdf',
        downloadURL: 'https://example.com/notes.pdf',
        type: 'pdf',
        description: 'Intro',
        date: 'Nov 12, 2026',
      });
    }
  });

  it('prefers an inferred type over the selected type (legacy behaviour)', () => {
    const result = buildResourceInput(
      {
        title: 'Slides',
        url: 'https://example.com/deck.pptx',
        type: 'pdf',
        description: '',
      },
      NOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input.type).toBe('ppt');
  });

  it('keeps the selected type when the URL has no clear extension', () => {
    const result = buildResourceInput(
      {
        title: 'A link',
        url: 'https://example.com/resource',
        type: 'link',
        description: '',
      },
      NOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input.type).toBe('link');
  });
});

describe('duplicate detection', () => {
  const existing = [
    makeResource('a', 'stats', 'lectures', {
      url: 'https://drive.google.com/file/d/DUP123/view?usp=sharing',
      previewURL: 'https://drive.google.com/file/d/DUP123/view?usp=sharing',
      downloadURL: 'https://drive.google.com/uc?export=download&id=DUP123',
    }),
  ];

  it('detects a Drive duplicate hidden by different URL parameters', () => {
    expect(
      isDuplicateResource(
        'https://drive.google.com/file/d/DUP123/view?usp=drive_link',
        existing,
      ),
    ).toBe(true);
  });

  it('detects a duplicate against the stored download/preview links', () => {
    expect(
      isDuplicateResource(
        'https://drive.google.com/uc?export=download&id=DUP123',
        existing,
      ),
    ).toBe(true);
  });

  it('does not flag a new link or empty keys', () => {
    expect(
      isDuplicateResource('https://drive.google.com/file/d/OTHER456/view', existing),
    ).toBe(false);
    expect(isDuplicateResource('', existing)).toBe(false);
  });
});

describe('metadata patch (legacy updateResourceMetadata validation)', () => {
  it('accepts only name, description and type', () => {
    const result = buildMetadataPatch({
      name: '  New title  ',
      description: 'Notes',
      type: 'ppt',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.patch).sort()).toEqual([
        'description',
        'name',
        'type',
      ]);
      expect(result.patch.name).toBe('New title');
    }
  });

  it('rejects an empty name', () => {
    expect(
      buildMetadataPatch({ name: '   ', description: '', type: 'pdf' }).ok,
    ).toBe(false);
  });

  it('rejects over-long name and description', () => {
    expect(
      buildMetadataPatch({ name: 'x'.repeat(121), description: '', type: 'pdf' })
        .ok,
    ).toBe(false);
    expect(
      buildMetadataPatch({
        name: 'ok',
        description: 'x'.repeat(281),
        type: 'pdf',
      }).ok,
    ).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(
      buildMetadataPatch({
        name: 'ok',
        description: '',
        type: 'exe' as never,
      }).ok,
    ).toBe(false);
  });

  it('builds the stale-detection original snapshot from a resource', () => {
    const file = makeResource('a', 'stats', 'lectures', {
      name: 'Old',
      description: 'Old desc',
      type: 'ppt',
      date: 'Jan 1, 2026',
    });
    expect(metadataOriginalFrom(file)).toEqual({
      name: 'Old',
      description: 'Old desc',
      type: 'ppt',
      url: file.url,
      previewURL: file.previewURL,
      downloadURL: file.downloadURL,
      date: 'Jan 1, 2026',
    });
  });
});

describe('course/category association', () => {
  it('offers theory-only categories for non-lab courses', () => {
    const stats = COURSES.find((course) => course.id === 'stats')!;
    expect(categoriesForCourse(stats)).toEqual([
      'lectures',
      'papers',
      'related',
    ]);
  });

  it('offers theory and lab categories for lab courses', () => {
    const os = COURSES.find((course) => course.id === 'os')!;
    expect(categoriesForCourse(os)).toEqual([
      'lectures',
      'papers',
      'related',
      'lab',
      'lab_papers',
      'lab_tasks',
    ]);
  });

  it('resolves the legacy default format per category', () => {
    expect(defaultTypeForCategory('lectures')).toBe('ppt');
    expect(defaultTypeForCategory('lab_tasks')).toBe('code');
    expect(defaultTypeForCategory('papers')).toBe('pdf');
  });

  it('builds an empty draft with the category default', () => {
    expect(initialUploadDraft('lab_tasks')).toEqual({
      title: '',
      url: '',
      type: 'code',
      description: '',
    });
  });

  it('validates course/category identifiers', () => {
    expect(isCourseId('os')).toBe(true);
    expect(isCourseId('nope')).toBe(false);
    expect(isFileCategory('lab_papers')).toBe(true);
    expect(isFileCategory('nope')).toBe(false);
    expect(courseForId('os')?.name).toContain('Operating');
    expect(courseForId('nope')).toBeNull();
  });

  it('lists every legacy resource type exactly once', () => {
    const values = ADMIN_RESOURCE_TYPES.map((type) => type.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toEqual([
      'pdf',
      'ppt',
      'doc',
      'sheet',
      'code',
      'zip',
      'link',
    ]);
  });
});
