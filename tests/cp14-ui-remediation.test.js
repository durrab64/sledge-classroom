'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const BEE = fs.readFileSync(path.join(root, 'bleach-easter-egg.js'), 'utf8');
const CSS = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const HTML = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// ===== U1 — GIF pop-up transparency =====

test('U1: pop-up wrapper no longer paints a rectangular shadow or radius', () => {
  assert.match(BEE, /'\.bee-wrap\{position:fixed;pointer-events:auto;cursor:pointer;'/);
  assert.doesNotMatch(BEE, /\.bee-wrap\{[^']*box-shadow/);
  assert.doesNotMatch(BEE, /\.bee-wrap\{[^']*border-radius/);
});

test('U1: sprite is contained, uncropped and shadowed by its own alpha', () => {
  assert.match(BEE, /'\.bee-img\{display:block;object-fit:contain;object-position:center;/);
  assert.doesNotMatch(BEE, /\.bee-img\{[^']*object-fit:cover/);
  assert.doesNotMatch(BEE, /\.bee-img\{[^']*border-radius/);
  assert.match(BEE, /filter:drop-shadow\(0 6px 10px rgba\(0,0,0,\.28\)\)/);
});

test('U1: character assets stay animated (no static conversion) and keep their sources', () => {
  assert.match(BEE, /var CHARACTERS = \[/);
  for (const src of ['orihime.webp', 'orihime.gif', 'ichigo.gif', 'miku.gif']) {
    assert.match(BEE, new RegExp(`'${src.replace('.', '\\.')}'`));
  }
  // Still an <img>, still loading the character's src/fallbackSrc.
  assert.match(BEE, /img\.src = char\.src;/);
  assert.match(BEE, /img\.src = char\.fallbackSrc;/);
  assert.match(BEE, /function showCharacter\(\)/);
  assert.match(BEE, /function dismiss\(character\)/);
});

// Minimal GIF89a walker: reports every frame's Graphic Control Extension.
function inspectGif(file) {
  const data = fs.readFileSync(path.join(root, file));
  const width = data.readUInt16LE(6);
  const height = data.readUInt16LE(8);
  const packed = data[10];
  const gctSize = packed & 0x80 ? 2 ** ((packed & 0x07) + 1) : 0;
  let pos = 13 + gctSize * 3;
  const frames = [];
  let pending = null;

  const skipSubBlocks = () => {
    while (data[pos] !== 0) pos += data[pos] + 1;
    pos += 1;
  };

  while (pos < data.length && data[pos] !== 0x3b) {
    if (data[pos] === 0x21) {
      const label = data[pos + 1];
      pos += 2;
      if (label === 0xf9) {
        const size = data[pos];
        const block = data[pos + 1];
        pending = {
          disposal: (block >> 2) & 0x07,
          transparent: Boolean(block & 0x01),
        };
        pos += 1 + size;
        skipSubBlocks();
      } else {
        skipSubBlocks();
      }
      continue;
    }
    if (data[pos] === 0x2c) {
      pos += 1;
      const lpacked = data[pos + 8];
      const lctSize = lpacked & 0x80 ? 2 ** ((lpacked & 0x07) + 1) : 0;
      pos += 9 + lctSize * 3;
      pos += 1; // LZW minimum code size
      skipSubBlocks();
      frames.push(pending);
      pending = null;
      continue;
    }
    pos += 1;
  }
  return { width, height, frames };
}

test('U1: every GIF frame carries disposal=2 and transparency (no ghosting)', () => {
  const expected = {
    'ichigo.gif': [500, 500],
    'miku.gif': [160, 120],
    'orihime.gif': [360, 360],
  };
  for (const [file, size] of Object.entries(expected)) {
    const gif = inspectGif(file);
    assert.equal(gif.width, size[0], `${file} width unchanged`);
    assert.equal(gif.height, size[1], `${file} height unchanged`);
    assert.ok(gif.frames.length > 0, `${file} still animated`);
    gif.frames.forEach((gce, i) => {
      assert.ok(gce, `${file} frame ${i} must declare a Graphic Control Extension`);
      assert.equal(gce.disposal, 2, `${file} frame ${i} must use disposal=2`);
      assert.equal(gce.transparent, true, `${file} frame ${i} must be transparent`);
    });
  }
});

// ===== U4 — mobile navbar alignment =====

test('U4: mobile bar re-anchors its actions to the right edge', () => {
  const mobile = CSS.match(/@media \(max-width: 768px\) \{([\s\S]*?)\n\}/);
  assert.ok(mobile, 'mobile media query must exist');
  assert.match(mobile[1], /\.nav-actions \{\s*\n\s*margin-left: auto;\s*\n\s*\}/);
  assert.match(mobile[1], /\.logo-text \{\s*\n\s*min-width: 0;/);
  assert.match(mobile[1], /text-overflow: ellipsis;/);
});

test('U4: mobile controls stay present, labelled and on the same bar', () => {
  assert.match(HTML, /<div class="nav-actions">/);
  assert.match(HTML, /id="theme-toggle" aria-label="Toggle dark mode"/);
  assert.match(HTML, /id="admin-btn" title="Admin Login" aria-label="Admin Login"/);
  assert.match(HTML, /id="mobile-menu-btn" aria-label="Toggle menu"/);
  // Narrow-phone shrink/hide rules for the wordmark are still in force.
  assert.match(CSS, /@media \(max-width: 430px\)[\s\S]*?\.logo-text \{\s*\n\s*font-size: 1rem;/);
  assert.match(CSS, /@media \(max-width: 360px\)[\s\S]*?\.logo-text \{\s*\n\s*display: none;/);
});

// ===== U5 — desktop hover menu =====

test('U5: JavaScript is the only visibility authority for the admin menu', () => {
  assert.doesNotMatch(CSS, /body\.is-admin:has\(\.admin-btn:hover\)/);
  assert.doesNotMatch(CSS, /\.is-admin \.admin-btn:hover ~ \.admin-dropdown/);
  assert.match(CSS, /Menu visibility is controlled exclusively in app\.js/);
  assert.match(CSS, /\.admin-dropdown\.hidden \{/);
});

test('U5: an invisible bridge spans the navbar gap', () => {
  assert.match(CSS, /\.admin-dropdown \{[^}]*overflow: visible;/);
  assert.match(CSS, /\.admin-dropdown::before \{[\s\S]*?top: -14px;[\s\S]*?height: 14px;/);
  // The trigger extends its own hover area down to the panel bridge.
  assert.match(CSS, /\.admin-btn::after \{[\s\S]*?top: 100%;[\s\S]*?height: 22px;/);
});

test('U5: hover uses a 300–400ms grace delay plus pointer events', () => {
  assert.match(APP, /adminMenuTimer = setTimeout\(\(\) => dropdown\.classList\.add\('hidden'\), 350\);/);
  assert.match(APP, /adminBtn\.addEventListener\('mouseenter', showAdminMenu\)/);
  assert.match(APP, /adminBtn\.addEventListener\('mouseleave', scheduleHideAdminMenu\)/);
  assert.match(APP, /dropdown\.addEventListener\('mouseenter', showAdminMenu\)/);
  assert.match(APP, /dropdown\.addEventListener\('mouseleave', scheduleHideAdminMenu\)/);
});

test('U5: keyboard focus and Escape are supported', () => {
  assert.match(APP, /dropdown\.addEventListener\('focusin', showAdminMenu\)/);
  assert.match(APP, /dropdown\.addEventListener\('focusout'/);
  assert.match(APP, /if \(event\.key !== 'Escape' \|\| dropdown\.classList\.contains\('hidden'\)\) return;/);
  assert.match(APP, /adminBtn\.focus\(\);/);
});

test('U5: touch keeps tap-to-toggle and admin gating is unchanged', () => {
  assert.match(APP, /if \(!hoverMenu \|\| !hoverMenu\.matches\) \{\s*\n\s*dropdown\.classList\.toggle\('hidden'\);/);
  assert.match(APP, /const showAdminMenu = \(\) => \{\s*\n\s*if \(!isAdmin\) return;/);
  assert.match(APP, /const scheduleHideAdminMenu = \(\) => \{\s*\n\s*if \(!isAdmin\) return;/);
  assert.match(APP, /if \(!owner && dropdown\) dropdown\.classList\.add\('hidden'\)/);
});

// ===== U3 — Labs anchor clipping =====

test('U3: Labs deep link parks below the fixed navbar', () => {
  assert.match(
    CSS,
    /\.page-labs #labs\.anchor-target \{\s*\n\s*scroll-margin-top: calc\(var\(--nav-height, 72px\) \+ 16px\);\s*\n\s*\}/
  );
});

test('U3: Calendar keeps the equivalent offset (shared pattern)', () => {
  assert.match(CSS, /scroll-margin-top: calc\(var\(--nav-height\) \+ 16px\)/);
});

// ===== U2 — navbar consistency refresh =====

test('U2: navbar adopts the editorial type system with a scoped block', () => {
  assert.match(CSS, /CP-14 — NAVBAR CONSISTENCY REFRESH/);
  assert.match(CSS, /\.navbar \.logo-text \{[^}]*font-family: 'Bebas Neue'/);
  assert.match(CSS, /\.navbar \.nav-link \{[^}]*font-family: 'JetBrains Mono'/);
  assert.match(CSS, /\.navbar \.nav-link\.active::after \{\s*\n\s*background: #a16207;/);
  assert.match(CSS, /\[data-theme="dark"\] \.navbar \.nav-link\.active::after \{\s*\n\s*background: #d8b45f;/);
});

test('U2: navigation structure, destinations and hash routes are untouched', () => {
  for (const page of ['home', 'courses', 'labs', 'calendar']) {
    assert.match(HTML, new RegExp(`href="#${page}" class="nav-link[^"]*" data-page="${page}"`));
    assert.match(HTML, new RegExp(`href="#${page}" class="mobile-link[^"]*" data-page="${page}"`));
  }
  assert.match(HTML, /<nav class="navbar" id="navbar">/);
  assert.match(HTML, /<div class="nav-links" id="nav-links">/);
});

test('U2: theme switching, admin authorization and focus styles survive the refresh', () => {
  assert.match(HTML, /id="theme-toggle"/);
  assert.match(APP, /data-theme/);
  assert.match(APP, /document\.body\.classList\.toggle\('is-admin', owner\)/);
  // No new rule may repaint the legacy blue pill as the active indicator.
  assert.doesNotMatch(CSS, /\.navbar \.nav-link\.active \{[^}]*background: var\(--blue-50\)/);
});

test('U2: refreshed wordmark cannot leak desktop sizing onto narrow phones', () => {
  assert.match(CSS, /@media \(max-width: 430px\) \{\s*\n\s*\.navbar \.logo-text \{\s*\n\s*font-size: 1rem;/);
  assert.match(CSS, /@media \(max-width: 360px\) \{\s*\n\s*\.navbar \.logo-text \{\s*\n\s*display: none;/);
});
