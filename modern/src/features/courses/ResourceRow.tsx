// A single course resource row. The row opens the Reading Room for the stable
// resource ID while its explicit Open/Download actions stay independent, as in
// the legacy createFileItem markup.

import { Link, useNavigate } from 'react-router-dom';
import type { MouseEvent } from 'react';
import type { CourseId, FileCategory, ResourceFile } from '@/types';
import { buildReaderPath } from '@/features/reading-room/readerData';
import {
  describeResourceDescription,
  getResourceIconInfo,
  getResourceLinks,
} from './resourceHelpers';

export interface ResourceRowProps {
  file: ResourceFile;
  /** Current course/category; preferred over the stored document fields. */
  courseId?: CourseId;
  category?: FileCategory;
}

export function ResourceRow({ file, courseId, category }: ResourceRowProps) {
  const navigate = useNavigate();
  const iconInfo = getResourceIconInfo(file.type || file.name);
  const { previewUrl, downloadUrl } = getResourceLinks(file);
  const name = file.name || 'Untitled resource';
  const description = describeResourceDescription(file.description);
  const resourceCourse = courseId ?? file.courseId;
  const resourceCategory = category ?? file.category;
  const readerPath = file.id
    ? buildReaderPath(resourceCourse, resourceCategory, file.id)
    : '';

  const body = (
    <>
      <div className={`file-icon ${iconInfo.type}`} aria-hidden="true">
        <i className={iconInfo.icon} />
      </div>
      <div className="file-info">
        <div className="file-name" title={name}>
          {name}
        </div>
        {description ? <div className="file-desc">{description}</div> : null}
        <div className="file-meta">
          <span className="file-type-pill">{iconInfo.label}</span>
          {file.date ? (
            <>
              <span className="file-meta-sep" aria-hidden="true">
                ·
              </span>
              <span>{file.date}</span>
            </>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <div
      className="file-item"
      data-resource-id={file.id}
      data-category={resourceCategory}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        if (!readerPath) return;
        if ((event.target as HTMLElement).closest('a, button')) return;
        navigate(readerPath, { state: { readerDepth: 1 } });
      }}
    >
      {readerPath ? (
        <Link
          className="file-main"
          to={readerPath}
          state={{ readerDepth: 1 }}
          aria-label={`Read ${name} in the Reading Room`}
        >
          {body}
        </Link>
      ) : previewUrl ? (
        <a
          className="file-main"
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name}`}
        >
          {body}
        </a>
      ) : (
        <div className="file-main">{body}</div>
      )}

      <div className="file-actions">
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="file-action-btn"
            data-action="open"
            title="Open online"
            aria-label={`Open ${name} online`}
          >
            <i className="fas fa-external-link-alt" aria-hidden="true" />
            <span className="file-action-label">Open</span>
          </a>
        ) : null}
        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="file-action-btn"
            data-action="download"
            title="Download"
            aria-label={`Download ${name}`}
          >
            <i className="fas fa-download" aria-hidden="true" />
            <span className="file-action-label">Download</span>
          </a>
        ) : null}
        {!previewUrl && !downloadUrl ? (
          <span className="file-link-missing">
            <i className="fas fa-link-slash" aria-hidden="true" /> Link
            unavailable
          </span>
        ) : null}
      </div>
    </div>
  );
}
