'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

// ===== CP-8 accessibility regressions =====

test('homepage course cards use native links with accessible names', () => {
  assert.match(APP, /const card = document\.createElement\('a'\);\s*\n\s*card\.className = 'course-card course-card--home';/);
  assert.match(APP, /card\.href = `#course-\$\{course\.id\}`;/);
  assert.match(APP, /card\.setAttribute\('aria-label', `\$\{course\.name\}, \$\{course\.code\}, theory course`\);/);
  assert.match(APP, /card\.setAttribute\('aria-label', `\$\{course\.name\}, \$\{course\.code\}, lab section`\);/);
});

test('labs page bench entries use native links with accessible names', () => {
  assert.match(APP, /const card = document\.createElement\('a'\);\s*\n\s*card\.className = 'lab-entry';/);
  assert.match(APP, /card\.setAttribute\('aria-label', `\$\{course\.name\} lab bench, \$\{course\.code\}\. \$\{counts\.primary\} manuals, \$\{counts\.papers\} papers, \$\{counts\.tertiary\} tasks, \$\{eventCount\} events\.`\);/);
});

test('course card anchors keep the existing SPA click routing', () => {
  assert.match(APP, /card\.addEventListener\('click', \(event\) => \{\s*\n\s*event\.preventDefault\(\);\s*\n\s*openCourseDetail\(course\.id, 'lab', 'labs'\);/);
  assert.match(APP, /card\.addEventListener\('click', \(event\) => \{\s*\n\s*event\.preventDefault\(\);\s*\n\s*openCourseDetail\(course\.id, 'theory', currentPage\);/);
});

test('login modal exposes dialog semantics and a named close control', () => {
  assert.match(HTML, /id="login-modal" role="dialog" aria-modal="true"/);
  assert.match(HTML, /aria-labelledby="login-modal-title"/);
  assert.match(HTML, /id="login-modal-title"/);
  assert.match(HTML, /id="login-modal-close" aria-label="Close admin login"/);
});

test('event modal exposes dialog semantics and a named close control', () => {
  assert.match(HTML, /id="event-modal" role="dialog" aria-modal="true"/);
  assert.match(HTML, /aria-labelledby="event-modal-title"/);
  assert.match(HTML, /id="event-modal-close" aria-label="Close add event"/);
});

test('modals close on Escape and trap Tab focus', () => {
  assert.match(APP, /function bindDialogKeyboard\(modalId, closeFn\)/);
  assert.match(APP, /event\.key === 'Escape' \|\| event\.key === 'Esc'/);
  assert.match(APP, /if \(event\.key !== 'Tab'\) return;/);
  assert.match(APP, /bindDialogKeyboard\('login-modal', closeLoginModal\);/);
  assert.match(APP, /bindDialogKeyboard\('event-modal', closeEventModal\);/);
});

test('login modal restores focus to the element that opened it', () => {
  assert.match(APP, /let loginReturnFocus = null;/);
  assert.match(APP, /loginReturnFocus = document\.activeElement instanceof HTMLElement \? document\.activeElement : null;/);
  assert.match(APP, /loginReturnFocus\.focus\(\);/);
});

test('mobile menu button reports expanded state and is linked to its menu', () => {
  assert.match(HTML, /id="mobile-menu-btn" aria-label="Toggle menu"\s*\n\s*aria-expanded="false" aria-controls="mobile-menu"/);
  assert.match(APP, /button\.setAttribute\('aria-expanded', String\(open\)\);/);
  assert.match(APP, /function closeMobileMenu\(\) \{\s*\n\s*setMobileMenuOpen\(false\);/);
});

test('desktop admin menu opens on hover/focus and only touch keeps click toggle', () => {
  assert.match(APP, /window\.matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/);
  assert.match(APP, /if \(!hoverMenu \|\| !hoverMenu\.matches\) \{\s*\n\s*dropdown\.classList\.toggle\('hidden'\);/);
  // CP-14: JS is the single visibility authority with a 350ms grace delay.
  assert.match(APP, /adminMenuTimer = setTimeout\(\(\) => dropdown\.classList\.add\('hidden'\), 350\);/);
  assert.match(APP, /dropdown\.addEventListener\('focusin', showAdminMenu\)/);
  assert.match(APP, /dropdown\.addEventListener\('focusout'/);
  // CP-14 removed the competing CSS :has()/hover visibility override.
  assert.doesNotMatch(CSS, /body\.is-admin:has\(\.admin-btn:hover\) \.admin-dropdown/);
  assert.match(CSS, /\.admin-dropdown::before \{/);
});

test('course metadata uses a readable text token', () => {
  assert.match(CSS, /\.card-meta-item \{[\s\S]*?color: var\(--text-secondary\);/);
});

test('footer secondary text is above the old low-contrast values', () => {
  assert.match(CSS, /\.footer-note \{[\s\S]*?color: rgba\(244, 241, 234, 0\.58\);/);
  assert.match(CSS, /\.footer \.footer-bottom p \{\s*\n\s*color: rgba\(244, 241, 234, 0\.58\);/);
});

test('reduced-motion mode disables smooth scrolling', () => {
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*html \{\s*\n\s*scroll-behavior: auto;/);
});
