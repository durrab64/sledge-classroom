import { describe, expect, it } from 'vitest';
import {
  inferResourceType,
  isDirectDownloadUrl,
  normalizeResourceKey,
  parseResourceUrl,
  safeHttpUrl,
} from '@/lib/resourceUrl';

describe('safeHttpUrl', () => {
  it('accepts http(s) and rejects unsafe schemes', () => {
    expect(safeHttpUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeHttpUrl('//example.com/a')).toMatch(
      /^https?:\/\/example\.com\/a$/,
    );
    expect(safeHttpUrl('javascript:alert(1)')).toBe('');
    expect(safeHttpUrl('data:text/html,hello')).toBe('');
    expect(safeHttpUrl('')).toBe('');
  });
});

describe('parseResourceUrl (Google Drive)', () => {
  it('derives the legacy preview embed for /file/d/<id> links', () => {
    const info = parseResourceUrl(
      'https://drive.google.com/file/d/FILE_ID/view?usp=sharing',
    );
    expect(info.kind).toBe('drive');
    expect(info.id).toBe('FILE_ID');
    expect(info.source).toBe('Google Drive');
    expect(info.embedUrl).toBe(
      'https://drive.google.com/file/d/FILE_ID/preview',
    );
    expect(info.externalLabel).toBe('Open in Google Drive');
  });

  it('extracts the id from /open and /uc links', () => {
    expect(
      parseResourceUrl('https://drive.google.com/open?id=ABC_123').embedUrl,
    ).toBe('https://drive.google.com/file/d/ABC_123/preview');
    expect(
      parseResourceUrl(
        'https://drive.google.com/uc?export=download&id=ABC_123',
      ).id,
    ).toBe('ABC_123');
  });

  it('treats Drive folders as external links without inventing an embed', () => {
    const info = parseResourceUrl(
      'https://drive.google.com/drive/folders/FOLDER_ID',
    );
    expect(info.kind).toBe('folder');
    expect(info.embedUrl).toBe('');
    expect(info.externalLabel).toBe('Open folder in Google Drive');
  });
});

describe('parseResourceUrl (Google Docs)', () => {
  it('uses the published /d/e/ embed for published documents', () => {
    const info = parseResourceUrl(
      'https://docs.google.com/presentation/d/e/PUB_ID/pub?start=false',
    );
    expect(info.kind).toBe('docs');
    expect(info.docType).toBe('presentation');
    expect(info.published).toBe(true);
    expect(info.source).toBe('Google Slides');
    expect(info.embedUrl).toBe(
      'https://docs.google.com/presentation/d/e/PUB_ID/pub?embedded=true',
    );
  });

  it('uses the /preview embed for unpublished documents', () => {
    const info = parseResourceUrl(
      'https://docs.google.com/spreadsheets/d/SHEET_ID/edit',
    );
    expect(info.kind).toBe('docs');
    expect(info.docType).toBe('spreadsheets');
    expect(info.published).toBe(false);
    expect(info.embedUrl).toBe(
      'https://docs.google.com/spreadsheets/d/SHEET_ID/preview',
    );
  });
});

describe('parseResourceUrl (external and invalid)', () => {
  it('keeps unknown hosts as external links with no embed', () => {
    const info = parseResourceUrl('https://example.com/notes.pdf');
    expect(info.kind).toBe('external');
    expect(info.source).toBe('example.com');
    expect(info.embedUrl).toBe('');
  });

  it('returns the invalid sentinel for unsafe or empty values', () => {
    expect(parseResourceUrl('javascript:alert(1)').kind).toBe('invalid');
    expect(parseResourceUrl('').kind).toBe('invalid');
  });
});

describe('isDirectDownloadUrl', () => {
  it('recognizes Drive and Docs export links', () => {
    expect(
      isDirectDownloadUrl(
        'https://drive.google.com/uc?export=download&id=FILE_ID',
      ),
    ).toBe(true);
    expect(
      isDirectDownloadUrl('https://drive.google.com/file/d/FILE_ID/view'),
    ).toBe(false);
    expect(
      isDirectDownloadUrl(
        'https://docs.google.com/document/d/DOC_ID/export?format=pdf',
      ),
    ).toBe(true);
    expect(
      isDirectDownloadUrl('https://docs.google.com/document/d/DOC_ID/edit'),
    ).toBe(false);
  });

  it('recognizes file extensions and download query flags', () => {
    expect(isDirectDownloadUrl('https://example.com/paper.pdf')).toBe(true);
    expect(isDirectDownloadUrl('https://example.com/file?dl=1')).toBe(true);
    expect(isDirectDownloadUrl('https://example.com/page')).toBe(false);
    expect(
      isDirectDownloadUrl('https://drive.google.com/drive/folders/FOLDER'),
    ).toBe(false);
  });
});

describe('inferResourceType', () => {
  it('infers formats only from unambiguous evidence', () => {
    expect(inferResourceType('https://example.com/a.pdf')).toBe('pdf');
    expect(inferResourceType('https://example.com/a.pptx')).toBe('ppt');
    expect(inferResourceType('https://example.com/a.cs')).toBe('code');
    expect(
      inferResourceType('https://docs.google.com/presentation/d/X/edit'),
    ).toBe('ppt');
    expect(
      inferResourceType('https://drive.google.com/file/d/X/view'),
    ).toBe('');
    expect(inferResourceType('javascript:alert(1)')).toBe('');
  });
});

describe('normalizeResourceKey', () => {
  it('collapses Drive tracking variants to the same stable key', () => {
    expect(
      normalizeResourceKey('https://drive.google.com/file/d/FILE_ID/view'),
    ).toBe('drive:FILE_ID');
    expect(
      normalizeResourceKey(
        'https://drive.google.com/uc?export=download&id=FILE_ID',
      ),
    ).toBe('drive:FILE_ID');
  });

  it('keeps Docs types distinct and normalizes folders', () => {
    expect(
      normalizeResourceKey('https://docs.google.com/document/d/DOC_ID/edit'),
    ).toBe('docs:document:DOC_ID');
    expect(
      normalizeResourceKey('https://docs.google.com/presentation/d/DOC_ID/edit'),
    ).toBe('docs:presentation:DOC_ID');
    expect(
      normalizeResourceKey('https://drive.google.com/drive/folders/FOLDER_ID'),
    ).toBe('drive-folder:FOLDER_ID');
  });

  it('normalizes external URLs and rejects invalid ones', () => {
    expect(normalizeResourceKey('https://example.com/a/')).toBe(
      'https://example.com/a',
    );
    expect(normalizeResourceKey('javascript:alert(1)')).toBe('');
  });
});
