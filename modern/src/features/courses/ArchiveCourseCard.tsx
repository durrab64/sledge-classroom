// Editorial archive card used by the Courses directory. Mirrors the legacy
// createArchiveCourseCard markup, including the four metric columns.

import { Link } from 'react-router-dom';
import type { CourseCardItem } from './courseData';
import { pad2, pluralize } from './courseData';

export interface ArchiveCourseCardProps {
  item: CourseCardItem;
  index: number;
}

export function ArchiveCourseCard({ item, index }: ArchiveCourseCardProps) {
  const { course, counts, eventCount, kind } = item;
  const isLab = kind === 'lab';
  const accent = isLab ? '#10b981' : course.color;
  const primaryLabel = isLab ? 'Manual' : 'Slide';
  const tertiaryLabel = isLab ? 'Task' : 'Material';
  const metrics = [
    { value: counts.primary, label: pluralize(counts.primary, primaryLabel) },
    { value: counts.papers, label: pluralize(counts.papers, 'Paper') },
    {
      value: counts.tertiary,
      label: pluralize(counts.tertiary, tertiaryLabel),
    },
    { value: eventCount, label: pluralize(eventCount, 'Event') },
  ];

  const to = `/courses/${course.id}${isLab ? '?mode=lab' : ''}`;

  return (
    <Link
      className={`course-card course-card--archive course-card--${kind}`}
      to={to}
      data-course-id={course.id}
      data-course-mode={kind}
      style={{ ['--card-accent' as string]: accent }}
      aria-label={`${course.name}, ${course.code}, ${
        isLab ? 'lab section' : 'theory course'
      }`}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
    >
      <span className="archive-card-top">
        <span className="archive-card-index">
          {isLab ? 'LB' : 'TH'} {pad2(index + 1)}
        </span>
        <span className={`archive-card-type ${kind}`}>
          {isLab ? 'Lab' : 'Theory'}
        </span>
      </span>
      <span className="archive-card-code">{course.code}</span>
      <span className="archive-card-title">{course.name}</span>
      <span className="archive-card-desc">{course.description}</span>
      <span className="archive-card-metrics">
        {metrics.map((metric) => (
          <span className="archive-metric" key={metric.label}>
            <span className="archive-metric-value">{pad2(metric.value)}</span>
            <span className="archive-metric-label">{metric.label}</span>
          </span>
        ))}
      </span>
      <span className="archive-card-open">
        Open course <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
