'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// ===== Reader previous/next navigation (CP-7) ====

test('Reader nav disabled state is rendered when previous resource is absent', () => {
  // When prevFile is null, the disabled nav link should be rendered
  assert.match(APP, /rr-nav-disabled/);
  assert.match(APP, /aria-disabled="true"/);
  assert.match(APP, /aria-label="No previous resource"/);
  assert.match(APP, /role="button"/);
});

test('Reader nav disabled state is rendered when next resource is absent', () => {
  assert.match(APP, /rr-nav-disabled/);
  assert.match(APP, /aria-label="No next resource"/);
});

test('Reader nav active link is rendered when previous resource exists', () => {
  assert.match(APP, /rr-nav-prev/);
  assert.match(APP, /data-rr-open-resource=/);
  assert.match(APP, /href=/);
});

test('Reader nav active link is rendered when next resource exists', () => {
  assert.match(APP, /rr-nav-next/);
  assert.match(APP, /href=/);
});

test('Reader nav disabled state uses rr-nav-disabled CSS class', () => {
  assert.match(APP, /class="rr-nav-link rr-nav-disabled"/);
});

test('Reader nav disabled state is applied symmetrically for prev and next', () => {
  const prevDisabled = APP.match(/rr-nav-disabled.*previous resource/);
  const nextDisabled = APP.match(/rr-nav-disabled.*next resource/);
  assert.ok(prevDisabled, 'Previous disabled state found');
  assert.ok(nextDisabled, 'Next disabled state found');
});

// ===== Course card zero-count metric hiding (CP-7) ====

test('course card primary metric is conditionally rendered when count > 0', () => {
  assert.match(APP, /counts\.primary > 0 \?/);
});

test('course card papers metric is conditionally rendered when count > 0', () => {
  assert.match(APP, /counts\.papers > 0 \?/);
});

test('course card tertiary metric is conditionally rendered when count > 0', () => {
  assert.match(APP, /counts\.tertiary > 0 \?/);
});

test('course card event count is conditionally rendered when count > 0', () => {
  assert.match(APP, /eventCount > 0 \?/);
});

test('zero-count metric hiding applies to both theory and lab card paths', () => {
  // Theory card path uses 'Slides', 'Papers', 'Materials'
  assert.match(APP, /counts\.primary > 0 \?.*Slides/);
  assert.match(APP, /counts\.papers > 0 \?.*Papers/);
  assert.match(APP, /counts\.tertiary > 0 \?.*Materials/);
  // Lab card path uses 'Manuals', 'Past Papers', 'Tasks'
  assert.match(APP, /counts\.primary > 0 \?.*Manuals/);
  assert.match(APP, /counts\.papers > 0 \?.*Past Papers/);
  assert.match(APP, /counts\.tertiary > 0 \?.*Tasks/);
});

test('zero-count metric hiding does not remove event count when events exist', () => {
  assert.match(APP, /eventCount > 0 \?/);
});

test('zero-count hiding applies conditionally per-metric, not all-or-nothing', () => {
  // Each metric has its own independent ternary, so hiding one doesn't hide others
  const patterns = [
    /counts\.primary > 0 \?/,
    /counts\.papers > 0 \?/,
    /counts\.tertiary > 0 \?/,
    /eventCount > 0 \?/,
  ];
  for (const pattern of patterns) {
    assert.match(APP, pattern);
  }
});
