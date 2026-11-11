// A single course resource row. The Reading Room view is deferred to a later
// checkpoint, so the row opens the source link directly while preserving the
// legacy row layout, format icon, description and Open/Download actions.

import type { ResourceFile } from '@/types';
import {
  describeResourceDescription,
  getResourceIconInfo,
  getResourceLinks,
} from './resourceHelpers';

export interface ResourceRowProps {
  file: ResourceFile;
}

export function ResourceRow({ file }: ResourceRowProps) {
  const iconInfo = getResourceIconInfo(file.type || file.name);
  const { previewUrl, downloadUrl } = getResourceLinks(file);
  const name = file.name || 'Untitled resource';
  const description = describeResourceDescription(file.description);

  return (
    <div className="file-item" data-resource-id={file.id} data-category={file.category}>
      {previewUrl ? (
        <a
          className="file-main"
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name}`}
        >
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
        </a>
      ) : (
        <div className="file-main">
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
        </div>
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
