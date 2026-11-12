// Resource URL parsing/normalization ported from the legacy Reading Room
// (`parseResourceUrl`, `isDirectDownloadUrl`, `inferResourceType`,
// `normalizeResourceKey` in app.js).
//
// Only http(s) URLs are accepted. Google Drive/Docs embed URLs are derived
// from the resource's own stable file ID using the exact legacy formulas; no
// Drive URLs or file IDs are invented, and nothing is moved off Drive.

import type { ResourceType } from '@/types';

export type ResourceUrlKind = 'invalid' | 'external' | 'drive' | 'folder' | 'docs';

export type GoogleDocType = 'document' | 'presentation' | 'spreadsheets';

export interface ParsedResourceUrl {
  readonly kind: ResourceUrlKind;
  readonly url: string;
  readonly host: string;
  readonly source: string;
  readonly embedUrl: string;
  readonly externalLabel: string;
  readonly id: string;
  readonly docType?: GoogleDocType;
  readonly published?: boolean;
}

export const INVALID_RESOURCE_URL: ParsedResourceUrl = {
  kind: 'invalid',
  url: '',
  host: '',
  source: 'Unknown source',
  embedUrl: '',
  externalLabel: 'Open link',
  id: '',
};

function baseHref(): string {
  return typeof window !== 'undefined' && window.location
    ? window.location.href
    : 'http://localhost/';
}

/** Return a safe absolute http(s) URL, or an empty string. */
export function safeHttpUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value, baseHref());
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : '';
  } catch {
    return '';
  }
}

function driveSource(docType: GoogleDocType): string {
  if (docType === 'presentation') return 'Google Slides';
  if (docType === 'spreadsheets') return 'Google Sheets';
  return 'Google Docs';
}

/**
 * Recognize the link shapes the legacy reader could honestly embed. Anything
 * else stays an external link; an embed is never fabricated for unknown hosts.
 */
export function parseResourceUrl(value: string): ParsedResourceUrl {
  const safe = safeHttpUrl(value);
  if (!safe) return INVALID_RESOURCE_URL;

  let parsed: URL;
  try {
    parsed = new URL(safe);
  } catch {
    return INVALID_RESOURCE_URL;
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const path = parsed.pathname;
  const search = parsed.searchParams;
  const base: ParsedResourceUrl = {
    kind: 'external',
    url: safe,
    host,
    source: host || 'External link',
    embedUrl: '',
    externalLabel: 'Open external link',
    id: '',
  };

  if (host === 'drive.google.com') {
    let id = '';
    const fileMatch = path.match(/\/file\/d\/([^/]+)/);
    if (fileMatch) id = fileMatch[1];
    if (!id && /^\/(open|uc)\/?$/.test(path) && search.get('id')) {
      id = search.get('id') as string;
    }
    if (id) {
      return {
        ...base,
        kind: 'drive',
        id,
        source: 'Google Drive',
        embedUrl: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`,
        externalLabel: 'Open in Google Drive',
      };
    }
    if (/\/folders\//.test(path)) {
      return {
        ...base,
        kind: 'folder',
        source: 'Google Drive',
        externalLabel: 'Open folder in Google Drive',
      };
    }
  }

  if (host === 'docs.google.com') {
    let match = path.match(
      /\/(document|presentation|spreadsheets)\/d\/e\/([^/]+)/,
    );
    if (match) {
      const docType = match[1] as GoogleDocType;
      const id = match[2];
      const source = driveSource(docType);
      return {
        ...base,
        kind: 'docs',
        docType,
        published: true,
        id,
        source,
        embedUrl: `https://docs.google.com/${docType}/d/e/${encodeURIComponent(id)}/pub?embedded=true`,
        externalLabel: `Open in ${source}`,
      };
    }
    match = path.match(/\/(document|presentation|spreadsheets)\/d\/([^/]+)/);
    if (match) {
      const docType = match[1] as GoogleDocType;
      const id = match[2];
      const source = driveSource(docType);
      return {
        ...base,
        kind: 'docs',
        docType,
        published: false,
        id,
        source,
        embedUrl: `https://docs.google.com/${docType}/d/${encodeURIComponent(id)}/preview`,
        externalLabel: `Open in ${source}`,
      };
    }
  }

  return base;
}

/**
 * A download action is only exposed for a URL that represents an actual file
 * download, not another editor/view page (e.g. Google Docs).
 */
export function isDirectDownloadUrl(value: string): boolean {
  const info = parseResourceUrl(value);
  if (info.kind === 'invalid' || info.kind === 'folder') return false;

  let parsed: URL;
  try {
    parsed = new URL(info.url);
  } catch {
    return false;
  }
  const search = parsed.searchParams;

  if (info.kind === 'drive') {
    return /\/uc\/?$/.test(parsed.pathname) || search.get('export') === 'download';
  }
  if (info.kind === 'docs') {
    return /\/export\/?$/.test(parsed.pathname) || search.get('export') === 'download';
  }
  if (/\.(pdf|pptx?|docx?|xlsx?|zip|rar|7z|csv|txt)$/i.test(parsed.pathname)) {
    return true;
  }
  return search.get('download') === '1' || search.get('dl') === '1';
}

/**
 * Infer a format only from an unambiguous signal. Generic Drive file URLs are
 * deliberately left alone: Drive does not expose the MIME type in the URL.
 */
export function inferResourceType(value: string): ResourceType | '' {
  const info = parseResourceUrl(value);
  if (info.kind === 'invalid') return '';
  if (info.kind === 'folder') return 'link';
  if (info.kind === 'docs') {
    if (info.docType === 'presentation') return 'ppt';
    if (info.docType === 'spreadsheets') return 'sheet';
    return 'doc';
  }

  let path = '';
  try {
    path = new URL(info.url).pathname.toLowerCase();
  } catch {
    return '';
  }

  if (/\.pdf$/.test(path)) return 'pdf';
  if (/\.(ppt|pptx)$/.test(path)) return 'ppt';
  if (/\.(doc|docx)$/.test(path)) return 'doc';
  if (/\.(xls|xlsx|csv)$/.test(path)) return 'sheet';
  if (/\.(zip|rar|7z|tar|gz)$/.test(path)) return 'zip';
  if (/\.(py|js|java|cpp|c|cs|html|css|json|ts|jsx|tsx)$/.test(path)) {
    return 'code';
  }
  return '';
}

/**
 * Stable identity for duplicate detection. Drive/Docs/folder links collapse to
 * their file ID so tracking parameters cannot hide a duplicate.
 */
export function normalizeResourceKey(value: string): string {
  const info = parseResourceUrl(value);
  if (info.kind === 'invalid') return '';
  if (info.kind === 'drive' && info.id) return `drive:${info.id}`;
  if (info.kind === 'docs' && info.id) {
    return `docs:${info.docType}:${info.id}`;
  }
  if (info.kind === 'folder') {
    const match = info.url.match(/\/folders\/([^/?#]+)/);
    if (match) return `drive-folder:${match[1]}`;
  }
  return info.url.replace(/\/+$/, '').toLowerCase();
}
