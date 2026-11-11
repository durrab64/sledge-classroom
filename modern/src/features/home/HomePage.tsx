// Home page — migrated from the legacy #page-home section.
//
// Preserves the hero, gateway, archive grid (with independent filter),
// Latest Transmissions preview, About composition, curriculum directory and
// FAQ accordion. Course counts and events come from the CP4 repositories.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Event, RepositoryError } from '@/types';
import {
  COURSES,
  homeLabItems,
  homeTheoryItems,
  loadCatalogue,
  pad2,
  upcomingEvents,
  type CatalogueData,
  type CourseFilter,
  type CourseResourceReader,
  type EventReader,
} from '@/features/courses/courseData';
import { EventCard } from '@/components/events/EventCard';
import { courseRepository, eventRepository } from '@/services/repositories';

const FAQ_ITEMS = [
  {
    question: 'What is Sledge Classroom?',
    answer:
      'Sledge Classroom is an open, student-focused educational platform and resource hub created by Muhammad Durrab (Sledge) specifically for NUML Computer Science (BSCS) students. It organizes university lecture notes, past papers, lab manuals, and academic calendars in one accessible place.',
  },
  {
    question:
      'Are course materials and past papers on Sledge Classroom free?',
    answer:
      'Yes, 100% free! All students can view online previews and download lecture slides, past exams, and lab resources directly without paying or creating an account.',
  },
  {
    question:
      'Which NUML BSCS courses are included on Sledge Classroom?',
    answer:
      'Sledge Classroom currently hosts course materials for Theory of Automata (CS 311), Operating Systems (CS 321), Web Engineering (CS 341), Computer Architecture (CS 331), Statistics & Probability (STAT 301), and Multivariable Calculus (MATH 201), including dedicated practical lab sections.',
  },
  {
    question:
      'Do I need to sign in to download past papers and notes?',
    answer:
      'No login is required for students. Login access is strictly reserved for the administrator to upload and manage educational resources.',
  },
] as const;

const GATEWAY_CARDS = [
  {
    to: '/courses',
    kind: 'archive',
    index: '01',
    icon: 'fas fa-book-open',
    name: 'The Archive',
    desc: 'Lecture slides, past papers and reference material for every theory course in the BSCS programme.',
    cta: 'Browse courses',
  },
  {
    to: '/labs',
    kind: 'labs',
    index: '02',
    icon: 'fas fa-flask',
    name: 'The Labs',
    desc: 'Manuals, tasks and viva preparation for hands-on practical sections.',
    cta: 'Enter labs',
  },
  {
    to: '/calendar',
    kind: 'calendar',
    index: '03',
    icon: 'fas fa-calendar-day',
    name: 'Timeline',
    desc: 'Quizzes, assignments and presentations in one calendar.',
    cta: 'View calendar',
  },
] as const;

const CURRICULUM = [
  {
    id: 'automata',
    code: 'CS 311',
    badge: 'Theory',
    name: 'Theory of Automata',
    desc: 'Finite state automata, regular expressions, context-free grammars, pushdown automata, Turing machines, and decidability.',
    link: 'View Notes & Past Papers',
  },
  {
    id: 'os',
    code: 'CS 321',
    badge: 'Theory & Lab',
    name: 'Operating Systems',
    desc: 'Processes, CPU scheduling, thread synchronization, semaphores, deadlock handling, virtual memory, and Linux CLI lab tasks.',
    link: 'View Notes & Lab Manuals',
  },
  {
    id: 'web',
    code: 'CS 341',
    badge: 'Theory & Lab',
    name: 'Web Engineering',
    desc: 'Modern frontend & backend web development, DOM manipulation, responsive CSS, JavaScript, REST APIs, and database integration.',
    link: 'View Notes & Code Samples',
  },
  {
    id: 'arch',
    code: 'CS 331',
    badge: 'Theory & Lab',
    name: 'Computer Architecture',
    desc: 'Von Neumann architecture, instruction set architectures, instruction-level parallelism, pipelining, hazards, and memory hierarchy.',
    link: 'View Notes & Past Papers',
  },
  {
    id: 'stats',
    code: 'STAT 301',
    badge: 'Theory',
    name: 'Statistics & Probability',
    desc: 'Descriptive statistics, discrete & continuous probability distributions, Bayes theorem, hypothesis testing, and regression analysis.',
    link: 'View Notes & Past Papers',
  },
  {
    id: 'calculus',
    code: 'MATH 201',
    badge: 'Theory',
    name: 'Multivariable Calculus',
    desc: "Partial derivatives, chain rule in multiple variables, double & triple integration, vector fields, divergence, curl, and Green's theorem.",
    link: 'View Notes & Past Papers',
  },
] as const;

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: RepositoryError };

export interface HomePageProps {
  courseReader?: CourseResourceReader;
  eventReader?: EventReader;
}

export function HomePage({
  courseReader = courseRepository,
  eventReader = eventRepository,
}: HomePageProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [catalogue, setCatalogue] = useState<LoadState<CatalogueData>>({
    status: 'loading',
  });
  const [events, setEvents] = useState<LoadState<Event[]>>({
    status: 'loading',
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCatalogue({ status: 'loading' });
    loadCatalogue(courseReader, eventReader, { force: reloadToken > 0 })
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setCatalogue({ status: 'error', error: result.error });
        } else {
          setCatalogue({ status: 'success', data: result.data! });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalogue({
          status: 'error',
          error: {
            code: 'catalogue-load-failed',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [courseReader, eventReader, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    setEvents({ status: 'loading' });
    eventReader
      .listEvents()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setEvents({ status: 'error', error: result.error });
        } else {
          setEvents({ status: 'success', data: upcomingEvents(result.data ?? []) });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setEvents({
          status: 'error',
          error: {
            code: 'events-load-failed',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [eventReader]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const scrollToAbout = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      document
        .getElementById('about-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [],
  );

  const data = catalogue.status === 'success' ? catalogue.data : null;
  const theoryItems = useMemo(
    () => (data ? homeTheoryItems(data.entries) : []),
    [data],
  );
  const labItems = useMemo(
    () => (data ? homeLabItems(data.entries) : []),
    [data],
  );
  const counts = useMemo(() => {
    const theory = COURSES.length;
    const lab = COURSES.filter((course) => course.hasLab).length;
    return { theory, lab, all: theory + lab };
  }, []);

  return (
    <section className="page page-home active" id="page-home">
      <span id="home" className="anchor-target" aria-hidden="true" />

      {/* ===== HERO ===== */}
      <div className="hero">
        <div className="hero-atmosphere" aria-hidden="true">
          <span className="hero-grid" />
          <span className="hero-orbit hero-orbit-1" />
          <span className="hero-orbit hero-orbit-2" />
          <span className="hero-kanji">学</span>
          <span className="hero-vertical">知識は力なり</span>
        </div>
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="hero-chapter">第壱章</span>
            <span className="hero-kicker-rule" aria-hidden="true" />
            <span className="hero-kicker-label">The Academy · NUML BSCS</span>
            <span className="hero-open">Open &amp; Free</span>
          </div>
          <p className="hero-greeting">Welcome, scholars.</p>
          <h1 className="hero-title">
            <span className="hero-title-line">Knowledge</span>
            <span className="hero-title-line hero-title-gold">is power.</span>
          </h1>
          <p className="hero-tagline">
            Enter the archive. Discover your resources. Evolve beyond your
            limits.
          </p>
          <p className="hero-subtitle">
            Explore computer science study materials, programming labs, course
            notes, and past papers for NUML BSCS students. 100% free, with
            direct downloads and zero login barriers.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg hero-cta"
              id="hero-explore-btn"
              onClick={() => navigate('/courses')}
            >
              <span>Enter the Archive</span>
              <i className="fas fa-arrow-right" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="hero-secondary"
              id="hero-calendar-btn"
              onClick={() => navigate('/calendar')}
            >
              <i className="far fa-calendar" aria-hidden="true" /> View Calendar
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">06</span>
              <span className="stat-label">Theory Courses</span>
            </div>
            <div className="stat-divider" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-number">03</span>
              <span className="stat-label">Lab Sections</span>
            </div>
            <div className="stat-divider" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-number">∞</span>
              <span className="stat-label">Open Resources</span>
            </div>
          </div>
        </div>
        <div className="hero-foot" aria-hidden="true">
          <span>Sledge Classroom</span>
          <span className="hero-foot-line" />
          <span>Open access · Est. 2026</span>
        </div>
      </div>

      {/* ===== GATEWAY ===== */}
      <section
        className="section gateway"
        id="gateway"
        aria-labelledby="gateway-title"
      >
        <div className="gateway-head">
          <div className="gateway-heading">
            <span className="section-flag">
              <span className="flag-num">第弐章</span> The Gateway
            </span>
            <h2 className="section-title gateway-title" id="gateway-title">
              Choose your path
            </h2>
          </div>
          <p className="gateway-intro">
            Four doors into the academy. Start with the archive, move into the
            practical labs, or check the timeline before your next deadline.
          </p>
        </div>
        <div className="gateway-grid">
          {GATEWAY_CARDS.map((card) => (
            <Link
              key={card.to}
              className={`gateway-card gateway-card--${card.kind}`}
              to={card.to}
            >
              <span className="gateway-index" aria-hidden="true">
                {card.index}
              </span>
              <span className="gateway-icon">
                <i className={card.icon} aria-hidden="true" />
              </span>
              <span className="gateway-name">{card.name}</span>
              <span className="gateway-desc">{card.desc}</span>
              <span className="gateway-cta">
                {card.cta} <i className="fas fa-arrow-right" aria-hidden="true" />
              </span>
            </Link>
          ))}
          <a
            className="gateway-card gateway-card--about"
            href="#about-section"
            onClick={scrollToAbout}
          >
            <span className="gateway-index" aria-hidden="true">
              04
            </span>
            <span className="gateway-icon">
              <i className="fas fa-graduation-cap" aria-hidden="true" />
            </span>
            <span className="gateway-name">The Academy</span>
            <span className="gateway-desc">
              Who built this archive, and why it stays open to everyone.
            </span>
            <span className="gateway-cta">
              Read the story <i className="fas fa-arrow-right" aria-hidden="true" />
            </span>
          </a>
        </div>
      </section>

      {/* ===== ARCHIVE GRID ===== */}
      <div className="section" id="archive-section">
        <div className="section-header">
          <span className="section-flag">
            <span className="flag-num">第参章</span> The Archive
          </span>
          <h2 className="section-title">Coursework &amp; Labs</h2>
          <p className="section-subtitle">
            Theory lecture slides, past papers and practical lab resources,
            organised by course.
          </p>
        </div>

        <div className="course-filter-bar" id="home-filter-bar">
          {(
            [
              { value: 'all', icon: 'fas fa-th-large', label: 'All' },
              {
                value: 'theory',
                icon: 'fas fa-book-reader',
                label: 'Theory Courses',
              },
              { value: 'lab', icon: 'fas fa-flask', label: 'Lab Sections' },
            ] as const
          ).map((pill) => (
            <button
              key={pill.value}
              className={`filter-pill${filter === pill.value ? ' active' : ''}`}
              type="button"
              data-filter={pill.value}
              aria-pressed={filter === pill.value}
              onClick={() => setFilter(pill.value)}
            >
              <i className={pill.icon} /> {pill.label} (
              <span>
                {pill.value === 'all'
                  ? counts.all
                  : pill.value === 'theory'
                    ? counts.theory
                    : counts.lab}
              </span>
              )
            </button>
          ))}
        </div>

        <div
          className="courses-grid"
          id="home-courses-grid"
          aria-busy={catalogue.status === 'loading'}
        >
          {catalogue.status === 'loading'
            ? Array.from({ length: 6 }, (_, index) => (
                <div className="skeleton-card" aria-hidden="true" key={index} />
              ))
            : null}

          {catalogue.status === 'error' ? (
            <div className="empty-state resource-error-state" role="alert">
              <i className="fas fa-cloud-exclamation" />
              <h3>Course catalogue could not be loaded</h3>
              <p>
                We couldn&apos;t reach the resource counts. Check your connection
                and try again.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={reload}
              >
                <i className="fas fa-redo" aria-hidden="true" /> Retry
              </button>
            </div>
          ) : null}

          {data && (filter === 'all' || filter === 'theory') ? (
            <>
              {filter === 'all' ? (
                <div className="courses-group-header" style={{ gridColumn: '1 / -1' }}>
                  <div className="courses-group-title">
                    <i
                      className="fas fa-book-reader"
                      style={{ color: 'var(--blue-500)' }}
                    />{' '}
                    Theory Courses
                  </div>
                  <span className="courses-group-badge theory">
                    {counts.theory} Courses
                  </span>
                </div>
              ) : null}
              {theoryItems.map((item, index) => {
                const accent = item.course.color;
                return (
                  <Link
                    key={`theory-${item.course.id}`}
                    className="course-card course-card--home"
                    to={`/courses/${item.course.id}`}
                    aria-label={`${item.course.name}, ${item.course.code}, theory course`}
                    style={{
                      ['--card-accent' as string]: accent,
                      animationDelay: `${index * 0.04}s`,
                    }}
                  >
                    <span className="course-type-badge theory">
                      <i className="fas fa-book-reader" /> Theory
                    </span>
                    <div className="card-index" aria-hidden="true">
                      TH {pad2(index + 1)}
                    </div>
                    <div
                      className="card-icon"
                      style={{ background: item.course.gradient }}
                    >
                      <i className={item.course.icon} />
                    </div>
                    <div className="card-title">
                      {item.course.name}
                      {item.course.hasLab ? ' — Theory' : ''}
                    </div>
                    <div className="card-subtitle">
                      {item.course.code} · Theory Coursework
                    </div>
                    <div className="card-meta">
                      {item.counts.primary > 0 ? (
                        <div className="card-meta-item">
                          <i className="fas fa-chalkboard" />{' '}
                          {item.counts.primary} Slides
                        </div>
                      ) : null}
                      {item.counts.papers > 0 ? (
                        <div className="card-meta-item">
                          <i className="fas fa-scroll" /> {item.counts.papers}{' '}
                          Papers
                        </div>
                      ) : null}
                      {item.counts.tertiary > 0 ? (
                        <div className="card-meta-item">
                          <i className="fas fa-paperclip" />{' '}
                          {item.counts.tertiary} Materials
                        </div>
                      ) : null}
                      {item.eventCount > 0 ? (
                        <div className="card-meta-item">
                          <i className="fas fa-calendar-day" />{' '}
                          {item.eventCount} Events
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </>
          ) : null}

          {data && (filter === 'all' || filter === 'lab') ? (
            <>
              {filter === 'all' ? (
                <div className="courses-group-header" style={{ gridColumn: '1 / -1' }}>
                  <div className="courses-group-title">
                    <i className="fas fa-flask" style={{ color: '#10b981' }} />{' '}
                    Lab Sections
                  </div>
                  <span className="courses-group-badge lab">
                    {counts.lab} Labs
                  </span>
                </div>
              ) : null}
              {labItems.map((item, index) => (
                <Link
                  key={`lab-${item.course.id}`}
                  className="course-card course-card--home"
                  to={`/courses/${item.course.id}?mode=lab`}
                  aria-label={`${item.course.name}, ${item.course.code}, lab section`}
                  style={{
                    ['--card-accent' as string]: '#10b981',
                    animationDelay: `${index * 0.04}s`,
                  }}
                >
                  <span className="course-type-badge lab">
                    <i className="fas fa-flask" /> Practical Lab
                  </span>
                  <div className="card-index" aria-hidden="true">
                    LB {pad2(index + 1)}
                  </div>
                  <div
                    className="card-icon"
                    style={{
                      background:
                        'linear-gradient(135deg, #10b981, #059669)',
                    }}
                  >
                    <i className="fas fa-flask" />
                  </div>
                  <div className="card-title">{item.course.name} — Lab</div>
                  <div className="card-subtitle">
                    {item.course.code} · Hands-on Practical Lab
                  </div>
                  <div className="card-meta">
                    {item.counts.primary > 0 ? (
                      <div className="card-meta-item">
                        <i className="fas fa-vial" /> {item.counts.primary}{' '}
                        Manuals
                      </div>
                    ) : null}
                    {item.counts.papers > 0 ? (
                      <div className="card-meta-item">
                        <i className="fas fa-scroll" /> {item.counts.papers} Past
                        Papers
                      </div>
                    ) : null}
                    {item.counts.tertiary > 0 ? (
                      <div className="card-meta-item">
                        <i className="fas fa-laptop-code" />{' '}
                        {item.counts.tertiary} Tasks
                      </div>
                    ) : null}
                    {item.eventCount > 0 ? (
                      <div className="card-meta-item">
                        <i className="fas fa-calendar-day" /> {item.eventCount}{' '}
                        Events
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </>
          ) : null}
        </div>
      </div>

      {/* ===== LATEST TRANSMISSIONS ===== */}
      <div className="section" id="transmissions-section">
        <div className="section-header transmission-head">
          <div>
            <span className="section-flag">
              <span className="flag-num">第肆章</span> Latest Transmissions
            </span>
            <h2 className="section-title">Upcoming Events</h2>
            <p className="section-subtitle">
              Briefings from the academy calendar — quizzes, assignments and
              presentations, ordered by date.
            </p>
          </div>
          <Link className="section-aside-link" to="/calendar">
            Full timeline <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>
        <div className="events-preview" id="home-events-preview">
          {events.status === 'loading' ? (
            <div className="empty-state">
              <div className="spinner" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: 12 }}>Loading events...</p>
            </div>
          ) : null}
          {events.status === 'error' ? (
            <div className="empty-state" role="alert">
              <i className="fas fa-cloud-exclamation" />
              <h3>Failed to load events.</h3>
              <p>Check your connection and try again.</p>
            </div>
          ) : null}
          {events.status === 'success' && events.data.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-calendar-check" />
              <h3>No Upcoming Events</h3>
              <p>Add events from the Calendar page to see them here.</p>
            </div>
          ) : null}
          {events.status === 'success'
            ? events.data.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                  variant="transmission"
                  courseName={
                    COURSES.find((course) => course.id === event.courseId)?.name ??
                    ''
                  }
                />
              ))
            : null}
        </div>
      </div>

      {/* ===== ABOUT ===== */}
      <div className="section" id="about-section">
        <div className="section-header">
          <span className="section-flag">
            <span className="flag-num">第伍章</span> The Academy
          </span>
          <h2 className="section-title">About Sledge Classroom</h2>
          <p className="section-subtitle">
            A student-focused open learning archive, built for NUML BSCS and
            free for everyone.
          </p>
        </div>
        <div className="about-grid">
          <div className="about-card about-card--lead">
            <div className="about-card-icon">
              <i className="fas fa-chalkboard-teacher" />
            </div>
            <h3>NUML BSCS Curated Notes</h3>
            <p>
              Comprehensive lecture slides and presentations for core Computer
              Science semester subjects, neatly organized by topic and lecture
              number.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-icon">
              <i className="fas fa-scroll" />
            </div>
            <h3>Past Papers &amp; Exam Prep</h3>
            <p>
              Midterm and final exam past papers with solution guidelines,
              marking schemes, and revision keys to help university students
              excel.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-icon">
              <i className="fas fa-laptop-code" />
            </div>
            <h3>Practical Programming Labs</h3>
            <p>
              Lab manuals, code templates, viva questions, and hands-on
              exercises for practical subjects like Operating Systems, Web
              Engineering, and Computer Architecture.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-icon">
              <i className="fas fa-unlock-alt" />
            </div>
            <h3>100% Free &amp; Open Access</h3>
            <p>
              Created by Muhammad Durrab (Sledge) with zero paywalls, mandatory
              registrations, or subscription fees. Click, preview online, and
              download directly.
            </p>
          </div>
        </div>
      </div>

      {/* ===== CURRICULUM ===== */}
      <div className="section" id="curriculum-section">
        <div className="section-header">
          <span className="section-flag">
            <span className="flag-num">第陸章</span> Curriculum Directory
          </span>
          <h2 className="section-title">NUML BSCS Course Curriculum</h2>
          <p className="section-subtitle">
            Explore lecture notes, solved papers, and lab manuals by subject.
          </p>
        </div>
        <div className="curriculum-grid">
          {CURRICULUM.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="curriculum-card"
              data-course={course.id}
            >
              <div>
                <div className="curriculum-card-header">
                  <span className="curriculum-code">{course.code}</span>
                  <span className="curriculum-badge">{course.badge}</span>
                </div>
                <h3>{course.name}</h3>
                <p>{course.desc}</p>
              </div>
              <span className="curriculum-link">
                {course.link} <i className="fas fa-arrow-right" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== FAQ ===== */}
      <div className="section" id="faq-section">
        <div className="section-header">
          <span className="section-flag">
            <span className="flag-num">第漆章</span> Enquiries
          </span>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Common questions about Sledge Classroom and the study materials.
          </p>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, index) => {
            const open = openFaq === index;
            return (
              <div className={`faq-item${open ? ' active' : ''}`} key={item.question}>
                <button
                  className="faq-question"
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : index)}
                >
                  <span>{item.question}</span>
                  <i className="fas fa-chevron-down" />
                </button>
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
