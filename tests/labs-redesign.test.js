'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

// ===== CP-9 laboratory workspace redesign =====

test('Labs page renders a dedicated masthead with a single h1', () => {
  assert.match(HTML, /class="labs-workspace labs-list-view" id="labs-list-view"/);
  assert.match(HTML, /<header class="labs-masthead">/);
  assert.match(HTML, /<h1 class="labs-title">The Laboratory<\/h1>/);
  assert.match(HTML, /class="labs-kicker"/);
  assert.match(HTML, /class="labs-lede"/);
  // The old generic page header must be gone from the Labs list view.
  assert.doesNotMatch(HTML, /<h2 class="page-title"><i class="fas fa-flask"><\/i> Lab Sections<\/h2>/);
});

test('Labs masthead exposes real stat hooks for aggregate data', () => {
  for (const key of ['sections', 'manuals', 'tasks', 'events']) {
    assert.match(HTML, new RegExp(`data-lab-stat="${key}"`));
  }
  assert.match(HTML, /class="labs-stats" aria-label="Laboratory overview"/);
});

test('Bench directory keeps the grid id and is labelled by its heading', () => {
  assert.match(HTML, /<section class="labs-directory" aria-labelledby="labs-index-title">/);
  assert.match(HTML, /<h2 class="labs-index-title" id="labs-index-title">Bench Directory<\/h2>/);
  assert.match(HTML, /<div class="labs-grid" id="labs-grid">/);
  assert.match(HTML, /id="labs-index-count" aria-live="polite"/);
});

test('renderLabCards builds native anchor bench entries with accessible names', () => {
  assert.match(APP, /function renderLabCards\(entries\)/);
  assert.match(APP, /const card = document\.createElement\('a'\);\s*\n\s*card\.className = 'lab-entry';/);
  assert.match(APP, /card\.href = `#course-\$\{course\.id\}`;/);
  assert.match(APP, /lab bench, \$\{course\.code\}/);
});

test('lab entries still open the existing course-detail route', () => {
  assert.match(APP, /card\.addEventListener\('click', \(event\) => \{\s*\n\s*event\.preventDefault\(\);\s*\n\s*openCourseDetail\(course\.id, 'lab', 'labs'\);/);
});

test('renderLabCards updates the masthead stats and index count from real data', () => {
  assert.match(APP, /data-lab-stat="\$\{key\}"/);
  assert.match(APP, /sections: benches\.length/);
  assert.match(APP, /manuals: totals\.manuals/);
  assert.match(APP, /tasks: totals\.tasks/);
  assert.match(APP, /events: totals\.events/);
  assert.match(APP, /getElementById\('labs-index-count'\)/);
  assert.match(APP, /bench\$\{benches\.length === 1 \? '' : 'es'\}/);
});

test('lab bench metadata renders four counts and styles zero values', () => {
  assert.match(APP, /metric\('fa-book', counts\.primary, 'Manuals'\)/);
  assert.match(APP, /metric\('fa-scroll', counts\.papers, 'Papers'\)/);
  assert.match(APP, /metric\('fa-laptop-code', counts\.tertiary, 'Tasks'\)/);
  assert.match(APP, /metric\('fa-calendar-day', eventCount, 'Events'\)/);
  assert.match(APP, /lab-metric--zero/);
});

test('empty Labs state is intentional and not a broken grid', () => {
  assert.match(APP, /class="labs-empty"/);
  assert.match(APP, /No laboratory benches yet/);
  assert.match(APP, /Lab sections appear here once a practical course is configured\./);
});

test('legacy lab detail markup is preserved for the existing route', () => {
  assert.match(HTML, /id="lab-detail-view"/);
  assert.match(HTML, /id="lab-files-list"/);
});

test('CP-9 styles are scoped to the Labs page and use theme tokens', () => {
  assert.match(CSS, /CP-9 — LABORATORY WORKSPACE/);
  assert.match(CSS, /\.page-labs \.labs-masthead \{/);
  assert.match(CSS, /\.page-labs \.labs-stats \{/);
  assert.match(CSS, /\.page-labs \.lab-entry \{/);
  assert.match(CSS, /\.page-labs \.labs-empty \{/);
  assert.match(CSS, /background: var\(--bg-card\)/);
  assert.match(CSS, /color: var\(--text-secondary\)/);
  assert.match(CSS, /var\(--lab-accent, #10b981\)/);
});

test('Labs styles define the 720/900 responsive layouts', () => {
  assert.match(CSS, /@media \(min-width: 720px\)[\s\S]*?\.page-labs \.lab-entry \{/);
  assert.match(CSS, /@media \(min-width: 900px\)[\s\S]*?\.page-labs \.labs-masthead \{/);
  assert.match(CSS, /grid-template-areas: 'rail body action';/);
});

test('Labs motion respects reduced-motion preferences', () => {
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*\.page-labs \.lab-entry \{/);
  assert.match(CSS, /\.page-labs \.lab-entry:hover \{\s*\n\s*transform: none;/);
});
