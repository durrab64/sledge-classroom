// Event card shared by the Home "Latest Transmissions" feed and the
// Course Calendar tab. Mirrors the legacy card markup for both variants.
// Delete controls are admin-only in the legacy app and write operations are
// deferred, so no delete button is rendered in this checkpoint.

import type { Event } from '@/types';
import {
  EVENT_TYPES,
  eventDayParts,
  formatEventDate,
  formatEventTime,
} from '@/features/courses/courseData';

export interface EventCardProps {
  event: Event;
  index?: number;
  variant?: 'default' | 'transmission';
  courseName?: string;
}

export function eventGroupList(groups: Event['groups']): string[] {
  if (Array.isArray(groups)) {
    return groups.filter((group): group is string => typeof group === 'string');
  }
  if (typeof groups === 'string' && groups.trim()) {
    return groups
      .split(',')
      .map((group) => group.trim())
      .filter(Boolean);
  }
  return [];
}

export function EventCard({
  event,
  index = 0,
  variant = 'default',
  courseName = '',
}: EventCardProps) {
  const typeInfo =
    EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] ?? EVENT_TYPES.other;
  const transmission = variant === 'transmission';
  const featured = transmission && index === 0;
  const groups = eventGroupList(event.groups);
  const { day, month } = eventDayParts(event.date);

  const className = [
    'event-card',
    transmission ? 'event-card--transmission' : '',
    featured ? 'event-card--featured' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const details = (
    <div className="event-details">
      <span>
        <i className="fas fa-calendar" /> {formatEventDate(event.date)}
      </span>
      {event.time ? (
        <span>
          <i className="fas fa-clock" /> {formatEventTime(event.time)}
        </span>
      ) : null}
      <span>
        <i className="fas fa-book" /> {courseName}
      </span>
      {!transmission ? (
        <span style={{ color: typeInfo.color, fontWeight: 600 }}>
          {typeInfo.label}
        </span>
      ) : null}
    </div>
  );

  return (
    <div
      className={className}
      style={{ ['--event-color' as string]: typeInfo.color }}
    >
      {transmission ? (
        <div className="transmission-stamp" aria-hidden="true">
          <span className="transmission-day">{day}</span>
          <span className="transmission-month">{month}</span>
        </div>
      ) : (
        <div
          className="event-type-icon"
          style={{ background: typeInfo.bg, color: typeInfo.color }}
        >
          <i className={typeInfo.icon} />
        </div>
      )}
      <div className="event-info">
        {transmission ? (
          <div className="transmission-meta">
            <span className="transmission-index">
              Transmission {String(index + 1).padStart(2, '0')}
            </span>
            <span
              className="transmission-type"
              style={{ color: typeInfo.color }}
            >
              {typeInfo.label}
            </span>
          </div>
        ) : null}
        <div className="event-title">{event.title}</div>
        {details}
        {event.description ? (
          <div className="event-description">{event.description}</div>
        ) : null}
        {groups.length > 0 ? (
          <div className="event-groups">
            {groups.map((group) => (
              <span className="group-tag" key={group}>
                {group}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
