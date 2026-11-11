// Shared footer, ported from the legacy colophon. Course links use the
// migrated routes so they resolve through the hash router.

import { Link } from 'react-router-dom';
import { COURSES } from '@/features/courses/courseData';

const PAGE_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/labs', label: 'Labs' },
  { to: '/calendar', label: 'Calendar' },
] as const;

export function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-masthead">
        <span className="footer-flag">第漆章</span>
        <span className="footer-masthead-rule" aria-hidden="true" />
        <span className="footer-masthead-label">Colophon</span>
        <span className="footer-masthead-jp" aria-hidden="true">
          知識は力なり
        </span>
        <span className="footer-seal" aria-hidden="true">
          学
        </span>
      </div>
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo">
            <i className="fas fa-graduation-cap" />
            <span>
              Sledge<span className="logo-accent">Classroom</span>
            </span>
          </div>
          <p className="footer-tagline">
            Making education accessible for everyone.
          </p>
          <p className="footer-note">
            NUML BSCS · Open access learning archive · Est. 2026
          </p>
        </div>
        <div className="footer-links-section">
          <h3>Quick Links</h3>
          {PAGE_LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="footer-links-section">
          <h3>Courses</h3>
          {COURSES.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`}>
              {course.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          Made by{' '}
          <a
            href="https://github.com/durrab64"
            className="author-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>Muhammad Durrab</strong>
          </a>{' '}
          aka <strong>Sledge</strong>
        </p>
        <p>&copy; 2026 SledgeClassroom. All rights reserved.</p>
      </div>
    </footer>
  );
}
