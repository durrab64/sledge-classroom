// Resource URL / icon helpers ported from the legacy createFileItem logic.
// Only http(s) URLs are rendered; missing or unsafe links are surfaced as
// "Link unavailable" rather than invented.

import type { ResourceFile } from '@/types';

export interface ResourceIconInfo {
  type: 'pdf' | 'ppt' | 'doc' | 'xls' | 'img' | 'zip' | 'default';
  icon: string;
  label: string;
}

export function getResourceIconInfo(typeOrName: string): ResourceIconInfo {
  const value = (typeOrName || '').toLowerCase();
  if (value.includes('pdf')) {
    return { type: 'pdf', icon: 'fas fa-file-pdf', label: 'PDF' };
  }
  if (
    value.includes('ppt') ||
    value.includes('presentation') ||
    value.includes('slides')
  ) {
    return { type: 'ppt', icon: 'fas fa-file-powerpoint', label: 'Slides' };
  }
  if (value.includes('doc') || value.includes('word')) {
    return { type: 'doc', icon: 'fas fa-file-word', label: 'Document' };
  }
  if (
    value.includes('sheet') ||
    value.includes('xls') ||
    value.includes('excel')
  ) {
    return { type: 'xls', icon: 'fas fa-file-excel', label: 'Spreadsheet' };
  }
  if (
    value.includes('code') ||
    value.includes('py') ||
    value.includes('js') ||
    value.includes('cpp') ||
    value.includes('java')
  ) {
    return { type: 'img', icon: 'fas fa-file-code', label: 'Code' };
  }
  if (value.includes('zip') || value.includes('rar') || value.includes('tar')) {
    return { type: 'zip', icon: 'fas fa-file-archive', label: 'Archive' };
  }
  return { type: 'default', icon: 'fas fa-link', label: 'Resource' };
}

/** Return a safe absolute http(s) URL, or an empty string. */
export function safeHttpUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : '';
  } catch {
    return '';
  }
}

/** Download is only shown for an actual file-download URL. */
export function isDirectDownloadUrl(value: string): boolean {
  const safe = safeHttpUrl(value);
  if (!safe) return false;
  let parsed: URL;
  try {
    parsed = new URL(safe);
  } catch {
    return false;
  }
  const search = parsed.searchParams;
  if (parsed.hostname === 'drive.google.com') {
    return (
      /\/uc\/?$/.test(parsed.pathname) || search.get('export') === 'download'
    );
  }
  if (parsed.hostname === 'docs.google.com') {
    return (
      /\/export\/?$/.test(parsed.pathname) ||
      search.get('export') === 'download'
    );
  }
  if (
    /\.(pdf|pptx?|docx?|xlsx?|zip|rar|7z|csv|txt)$/i.test(parsed.pathname)
  ) {
    return true;
  }
  return search.get('download') === '1' || search.get('dl') === '1';
}

export function describeResourceDescription(value: string): string {
  return value.trim();
}

export interface ResourceLinks {
  previewUrl: string;
  downloadUrl: string;
}

export function getResourceLinks(file: ResourceFile): ResourceLinks {
  const previewUrl = safeHttpUrl(file.previewURL || file.url);
  const downloadCandidate = safeHttpUrl(file.downloadURL);
  const downloadUrl =
    downloadCandidate &&
    downloadCandidate !== previewUrl &&
    isDirectDownloadUrl(downloadCandidate)
      ? downloadCandidate
      : '';
  return { previewUrl, downloadUrl };
}
