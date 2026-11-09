'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

// ===== CP-10 calendar planning workspace =====

test('calendar masthead provides one h1 and supporting copy', () => {
  assert.match(HTML, /<header class="calendar-masthead">/);
  assert.match(HTML, /<h1 class="calendar-title">The Calendar<\/h1>/);
  assert.match(HTML, /class="calendar-kicker"/);
  assert.match(HTML, /class="calendar-lede"/);
  // The generic page header must be gone from the Calendar view.
  assert.doesNotMatch(HTML, /<h2 class="page-title"><i class="fas fa-calendar-alt"><\/i> Master Calendar<\/h2>/);
});

test('month navigation exposes accessible names and a today control', () => {
  assert.match(HTML, /id="cal-prev" type="button" aria-label="Previous month"/);
  assert.match(HTML, /id="cal-next" type="button" aria-label="Next month"/);
  assert.match(HTML, /id="cal-today" type="button">Today</);
  assert.match(HTML, /<h2 class="calendar-month-title" id="calendar-month-title" aria-live="polite">/);
  assert.match(APP, /const todayBtn = document\.getElementById\('cal-today'\);/);
});

test('calendar facts expose real summary hooks', () => {
  for (const id of ['calendar-fact-month', 'calendar-fact-events', 'calendar-fact-today']) {
    assert.match(HTML, new RegExp(`id="${id}"`));
  }
  assert.match(APP, /const monthEventCount = events\.filter/);
  assert.match(APP, /factEvents\.textContent = String\(monthEventCount\)/);
});

test('calendar day cells render as native buttons with accessible date names', () => {
  assert.match(APP, /const dayEl = document\.createElement\('button'\);/);
  assert.match(APP, /dayEl\.type = 'button';/);
  assert.match(APP, /dayEl\.setAttribute\('aria-label', `\$\{fullDate\}\. \$\{dayEvents\.length/);
  assert.match(APP, /dayEl\.setAttribute\('aria-current', 'date'\)/);
  assert.match(APP, /sourceEl\.classList\.add\('selected'\)/);
});

test('calendar implements roving tabindex and arrow-key navigation', () => {
  assert.match(APP, /function setCalendarRovingFocus\(activeDateStr\)/);
  assert.match(APP, /el\.tabIndex = el\.dataset\.date === activeDateStr \? 0 : -1;/);
  assert.match(APP, /case 'ArrowLeft': target = addCalendarDays\(current, -1\);/);
  assert.match(APP, /case 'ArrowRight': target = addCalendarDays\(current, 1\);/);
  assert.match(APP, /case 'ArrowUp': target = addCalendarDays\(current, -7\);/);
  assert.match(APP, /case 'ArrowDown': target = addCalendarDays\(current, 7\);/);
});

test('event chips show type colour and a discoverable overflow count', () => {
  assert.match(APP, /class="calendar-event-chip" style="--event-color: \$\{typeInfo\.color\}; --event-bg: \$\{typeInfo\.bg\};"/);
  assert.match(APP, /dayEvents\.length > 3/);
  assert.match(APP, /class="calendar-event-more" aria-hidden="true">\+\$\{dayEvents\.length - 3\}/);
});

test('day agenda uses dedicated cards and keeps owner delete permission', () => {
  assert.match(APP, /function createCalendarAgendaEvent\(event\)/);
  assert.match(APP, /card\.className = 'calendar-agenda-event';/);
  assert.match(APP, /event-delete-btn calendar-agenda-delete/);
  assert.match(APP, /card\.querySelector\('\.calendar-agenda-delete'\)\.addEventListener\('click', \(\) => deleteEvent\(event\.id\)\);/);
  // The delete control stays hidden for visitors because it reuses event-delete-btn.
  assert.match(CSS, /body\.is-admin \.event-delete-btn \{\s*display: flex;/);
});

test('day panel has agenda semantics and returns focus on close', () => {
  assert.match(HTML, /<section class="day-events-panel hidden" id="day-events-panel" aria-labelledby="day-events-title">/);
  assert.match(HTML, /id="close-day-panel" type="button"\s*\n\s*aria-label="Close day details"/);
  assert.match(APP, /function closeDayPanel\(restoreFocus = true\)/);
  assert.match(APP, /calendarReturnFocus\.focus\(\);/);
});

test('calendar exposes loading, error and empty states without mock data', () => {
  assert.match(APP, /setCalendarStatus\('Loading schedule…'\)/);
  assert.match(APP, /setCalendarStatus\('The schedule could not be loaded\.', 'error', true\)/);
  assert.match(APP, /calendar-retry-btn/);
  assert.match(APP, /const retryHadFocus = document\.activeElement && document\.activeElement\.id === 'calendar-retry-btn';/);
  assert.match(APP, /if \(retryHadFocus\) \{/);
  assert.match(APP, /No events on this day/);
  assert.doesNotMatch(APP, /const SAMPLE_EVENTS|mockEvents|fakeEvents/i);
});

test('calendar still reads the existing events collection and date range', () => {
  assert.match(APP, /db\.collection\('events'\)\s*\n?\s*\.where\('date', '>=', startDate\)\s*\n?\s*\.where\('date', '<=', endDate\)\s*\n?\s*\.get\(\)/);
  // The range must cover the whole six-week grid, not a fixed day of the next month.
  assert.match(APP, /const gridStart = new Date\(year, month, 1 - firstDay\);/);
  assert.match(APP, /const gridEnd = addCalendarDays\(gridStart, 41\);/);
});

test('calendar deep link clears the sticky masthead', () => {
  assert.match(CSS, /\.page-calendar #calendar\.anchor-target \{\s*scroll-margin-top: calc\(var\(--nav-height, 72px\) \+ 16px\);/);
});

test('event modal fields and validation contract are preserved', () => {
  for (const id of ['event-title', 'event-date', 'event-time', 'event-type', 'event-course', 'event-description', 'event-groups']) {
    assert.match(HTML, new RegExp(`id="${id}"`));
  }
  assert.match(HTML, /id="event-title" class="form-input" aria-required="true"/);
  assert.match(HTML, /id="event-date" class="form-input" aria-required="true"/);
  assert.match(APP, /if \(!title \|\| !date\) \{/);
  assert.match(APP, /db\.collection\('events'\)\.add\(eventData\);/);
  assert.match(APP, /if \(!isAdmin\) \{/);
});

test('CP-10 styles are scoped to the calendar and use theme tokens', () => {
  assert.match(CSS, /CP-10 — CALENDAR PLANNING WORKSPACE/);
  assert.match(CSS, /\.page-calendar \.calendar-masthead \{/);
  assert.match(CSS, /\.page-calendar \.calendar-day \{/);
  assert.match(CSS, /\.page-calendar \.calendar-agenda-event \{/);
  assert.match(CSS, /background: var\(--bg-card\)/);
  assert.match(CSS, /color: var\(--text-secondary\)/);
});

test('calendar styles define responsive and reduced-motion behaviour', () => {
  assert.match(CSS, /@media \(min-width: 700px\)[\s\S]*?\.page-calendar \.calendar-event-chip-label \{/);
  assert.match(CSS, /@media \(max-width: 560px\)[\s\S]*?\.page-calendar \.calendar-day \{/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.page-calendar \.calendar-day,/);
  // Long month names shrink instead of colliding with the chevrons at 320px.
  assert.match(CSS, /font-size: clamp\(1rem, 4\.6vw, 1\.25rem\);/);
  // Decorative floats are parked on phone-sized calendars so dates stay clear.
  assert.match(CSS, /body:has\(#page-calendar\.active\) #dock-shell,/);
  assert.match(CSS, /body:has\(#page-calendar\.active\) #tensa-moon,/);
  assert.match(CSS, /body:has\(#page-calendar\.active\) \.back-to-top \{/);
});
