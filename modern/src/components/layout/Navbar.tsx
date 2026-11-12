// Shared navigation chrome, ported from the legacy navbar and mobile menu.
// The Pakistan clock and the light/dark toggle are global experience controls;
// the admin control still routes to the migrated login screen.

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalExperience } from '@/features/global/GlobalExperienceContext';

const PKT_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Karachi',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function PktClock() {
  const [time, setTime] = useState(() => PKT_FORMATTER.format(new Date()));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const render = () => {
      try {
        setTime(PKT_FORMATTER.format(new Date()));
      } catch {
        setTime(
          new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        );
      }
    };
    // Align updates to the minute boundary, then tick every minute.
    const msToNextMinute = 60000 - (Date.now() % 60000);
    const timeout = setTimeout(() => {
      render();
      interval = setInterval(render, 60000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="pkt-clock"
      id="pkt-clock"
      title="Pakistan Standard Time (Asia/Karachi)"
    >
      <i className="fas fa-clock" aria-hidden="true" />
      <span id="pkt-time">{time}</span>
      <span className="pkt-zone">PKT</span>
    </div>
  );
}

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: 'fas fa-home', end: true },
  { to: '/courses', label: 'Courses', icon: 'fas fa-book-open', end: false },
  { to: '/labs', label: 'Labs', icon: 'fas fa-flask', end: false },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: 'fas fa-calendar-alt',
    end: false,
  },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? ' active' : ''}`;
const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `mobile-link${isActive ? ' active' : ''}`;

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { isOwner, signOut } = useAuth();
  const { settings, toggleMode } = useGlobalExperience();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <>
      <nav className="navbar" id="navbar">
        <div className="nav-container">
          <Link
            to="/"
            className="nav-logo"
            id="nav-logo-link"
            aria-label="Sledge Classroom Home"
          >
            <span className="logo-icon">
              <i className="fas fa-graduation-cap" />
            </span>
            <span className="logo-text">
              Sledge<span className="logo-accent">Classroom</span>
            </span>
          </Link>

          <div className="nav-links" id="nav-links">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={linkClass}
                data-page={link.label.toLowerCase()}
              >
                <i className={link.icon} /> {link.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-actions">
            <PktClock />
            <button
              type="button"
              className="theme-toggle"
              id="theme-toggle"
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
              onClick={toggleMode}
            >
              <i
                className={settings.mode === 'light' ? 'fas fa-moon' : 'fas fa-sun'}
                id="theme-icon"
              />
            </button>
            {isOwner ? (
              <button
                type="button"
                className="admin-btn logged-in"
                title="Sign out of admin"
                aria-label="Sign out of admin"
                onClick={() => {
                  void signOut();
                }}
              >
                <i className="fas fa-user-shield" />
              </button>
            ) : (
              <Link
                to="/login"
                className="admin-btn"
                title="Admin Login"
                aria-label="Admin Login"
              >
                <i className="fas fa-user-shield" />
              </Link>
            )}
            <button
              type="button"
              className="mobile-menu-btn"
              id="mobile-menu-btn"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <i className={menuOpen ? 'fas fa-times' : 'fas fa-bars'} />
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`mobile-menu${menuOpen ? ' open' : ''}`}
        id="mobile-menu"
      >
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={mobileLinkClass}
            data-page={link.label.toLowerCase()}
          >
            <i className={link.icon} /> {link.label}
          </NavLink>
        ))}
      </div>
    </>
  );
}
