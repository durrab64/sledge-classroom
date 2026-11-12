// Pure admin resource helpers.
//
// These functions port the legacy upload normalization, validation, duplicate
// detection and metadata-patch rules without touching Firebase. Keeping them
// pure makes the workflow testable and prevents business logic from being
// duplicated between the admin UI and the repository.

import type {
  Course,
  CourseId,
  FileCategory,
  ResourceFile,
  ResourceType,
} from '@/types';
import { COURSES } from '@/features/courses/courseData';
import {
  inferResourceType,
  normalizeResourceKey,
  safeHttpUrl,
} from '@/lib/resourceUrl';
import type {
  ResourceCreateInput,
  ResourceMetadataOriginal,
  ResourceMetadataPatch,
} from '@/services/repositories/adminRepository';

export const ADMIN_RESOURCE_TYPES: readonly {
  value: ResourceType;
  label: string;
}[] = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'ppt', label: 'Presentation (PPT / Slides)' },
  { value: 'doc', label: 'Word Document (DOC / DOCX)' },
  { value: 'sheet', label: 'Spreadsheet (Excel / Sheet)' },
  { value: 'code', label: 'Code / Lab Exercise' },
  { value: 'zip', label: 'ZIP / Archive' },
  { value: 'link', label: 'Web Link / External' },
];

export const RESOURCE_TYPE_VALUES: readonly ResourceType[] =
  ADMIN_RESOURCE_TYPES.map((type) => type.value);

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  lectures: 'Lecture Slides',
  papers: 'Past Papers',
  related: 'Related Material',
  lab: 'Lab Manuals',
  lab_papers: 'Lab Past Papers',
  lab_tasks: 'Code & Lab Tasks',
};

export const CATEGORY_ICONS: Record<FileCategory, string> = {
  lectures: 'fas fa-chalkboard',
  papers: 'fas fa-scroll',
  related: 'fas fa-paperclip',
  lab: 'fas fa-flask',
  lab_papers: 'fas fa-scroll',
  lab_tasks: 'fas fa-laptop-code',
};

/** Categories offered for a course, matching the legacy theory/lab split. */
export function categoriesForCourse(course: Course): FileCategory[] {
  return course.hasLab
    ? ['lectures', 'papers', 'related', 'lab', 'lab_papers', 'lab_tasks']
    : ['lectures', 'papers', 'related'];
}

/** Legacy default format per category (openUploadModal). */
export function defaultTypeForCategory(
  category: FileCategory,
): ResourceType {
  if (category === 'lectures') return 'ppt';
  if (category === 'lab_tasks') return 'code';
  return 'pdf';
}

export function courseForId(courseId: string | undefined): Course | null {
  return COURSES.find((course) => course.id === courseId) ?? null;
}

export interface UploadDraft {
  title: string;
  url: string;
  type: ResourceType;
  description: string;
}

export interface NormalizedUploadLinks {
  url: string;
  previewURL: string;
  downloadURL: string;
}

export type UrlNormalizationResult =
  | { ok: true; links: NormalizedUploadLinks }
  | { ok: false; message: string };

/**
 * Port of the legacy confirmUpload() URL handling:
 *   - scheme correction (// and bare hosts)
 *   - http(s)-only validation
 *   - explicit Google Drive file/open/uc conversion
 *   - Dropbox dl=0 -> dl=1 download conversion
 * Existing records are never rewritten; this only affects new uploads.
 */
export function normalizeUploadUrl(rawUrl: string): UrlNormalizationResult {
  let url = rawUrl.trim();
  if (!url) {
    return { ok: false, message: 'Please enter the document or share link.' };
  }

  if (/^\/\//.test(url)) {
    url = `https:${url}`;
  } else if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    url = `https://${url}`;
  }

  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) {
    return {
      ok: false,
      message: 'That link is not a valid http:// or https:// URL.',
    };
  }
  url = safeUrl;

  let previewURL = url;
  let downloadURL = url;

  const driveFileMatch = url.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
  );
  const driveIdMatch = url.match(
    /drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i,
  );
  const driveFileId = driveFileMatch
    ? driveFileMatch[1]
    : driveIdMatch
      ? driveIdMatch[1]
      : '';

  if (driveFileId) {
    previewURL = `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;
    downloadURL = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  } else if (url.includes('dropbox.com') && /dl=0(?:&|$)/.test(url)) {
    downloadURL = url.replace('dl=0', 'dl=1');
  }

  return { ok: true, links: { url, previewURL, downloadURL } };
}

export type UploadValidationResult =
  | { ok: true; input: ResourceCreateInput }
  | { ok: false; message: string; field?: 'title' | 'url' };

/** Validate and build the exact document payload for a new resource. */
export function buildResourceInput(
  draft: UploadDraft,
  now: Date = new Date(),
): UploadValidationResult {
  const title = draft.title.trim();
  if (!title) {
    return {
      ok: false,
      message: 'Please enter a resource title.',
      field: 'title',
    };
  }

  const normalized = normalizeUploadUrl(draft.url);
  if (!normalized.ok) {
    return { ok: false, message: normalized.message, field: 'url' };
  }

  const inferredType = inferResourceType(normalized.links.url);
  const type =
    inferredType && RESOURCE_TYPE_VALUES.includes(inferredType)
      ? inferredType
      : draft.type;

  return {
    ok: true,
    input: {
      name: title,
      url: normalized.links.url,
      previewURL: normalized.links.previewURL,
      downloadURL: normalized.links.downloadURL,
      type,
      description: draft.description.trim(),
      date: now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    },
  };
}

/**
 * Duplicate detection scoped to the current course/category. Links collapse to
 * their stable Drive/Docs key so tracking parameters cannot hide a copy.
 */
export function isDuplicateResource(
  url: string,
  existing: readonly ResourceFile[],
): boolean {
  const key = normalizeResourceKey(url);
  if (!key) return false;
  return existing.some((file) =>
    [file.url, file.previewURL, file.downloadURL].some(
      (candidate) =>
        Boolean(candidate) &&
        normalizeResourceKey(candidate) === key,
    ),
  );
}

export interface MetadataFormValues {
  name: string;
  description: string;
  type: ResourceType;
}

export type MetadataPatchResult =
  | { ok: true; patch: ResourceMetadataPatch }
  | { ok: false; message: string; field?: keyof MetadataFormValues };

/**
 * Port of the legacy updateResourceMetadata() validation:
 *   - only name/description/type are accepted
 *   - name is required, trimmed and capped at 120 characters
 *   - description is capped at 280 characters
 *   - type must be one of the legacy resource formats
 */
export function buildMetadataPatch(
  values: MetadataFormValues,
): MetadataPatchResult {
  if (typeof values.name !== 'string' || !values.name.trim()) {
    return { ok: false, message: 'Invalid title.', field: 'name' };
  }
  if (values.name.length > 120) {
    return {
      ok: false,
      message: 'Title must be 120 characters or fewer.',
      field: 'name',
    };
  }
  if (
    typeof values.description !== 'string' ||
    values.description.length > 280
  ) {
    return {
      ok: false,
      message: 'Description must be 280 characters or fewer.',
      field: 'description',
    };
  }
  if (!RESOURCE_TYPE_VALUES.includes(values.type)) {
    return { ok: false, message: 'Invalid resource type.', field: 'type' };
  }

  return {
    ok: true,
    patch: {
      name: values.name.trim(),
      description: values.description,
      type: values.type,
    },
  };
}

/** Build the original snapshot used for stale detection/read-back checks. */
export function metadataOriginalFrom(
  file: ResourceFile,
): ResourceMetadataOriginal {
  return {
    name: file.name ?? '',
    description: file.description ?? '',
    type: file.type,
    url: file.url ?? '',
    previewURL: file.previewURL ?? '',
    downloadURL: file.downloadURL ?? '',
    date: file.date ?? '',
  };
}

/** Default select value for a new resource in a category. */
export function initialUploadDraft(category: FileCategory): UploadDraft {
  return {
    title: '',
    url: '',
    type: defaultTypeForCategory(category),
    description: '',
  };
}

/** Type guard for legacy category strings. */
export function isFileCategory(value: string): value is FileCategory {
  return Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, value);
}

/** Type guard for legacy course ids. */
export function isCourseId(value: string): value is CourseId {
  return COURSES.some((course) => course.id === value);
}
