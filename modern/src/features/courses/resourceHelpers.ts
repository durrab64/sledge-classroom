// Resource URL / icon helpers ported from the legacy createFileItem logic.
// Only http(s) URLs are rendered; missing or unsafe links are surfaced as
// "Link unavailable" rather than invented.

import type { ResourceFile } from '@/types';
import { isDirectDownloadUrl, safeHttpUrl } from '@/lib/resourceUrl';

export { isDirectDownloadUrl, safeHttpUrl };

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
