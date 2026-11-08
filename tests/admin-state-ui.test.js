'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const FB = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));

test('admin UI visibility is driven by the resolved owner flag', () => {
    assert.match(APP, /function applyAdminState\(user, error\)/);
    assert.match(APP, /document\.body\.classList\.toggle\('is-admin', owner\)/);
    assert.match(APP, /if \(!owner && dropdown\) dropdown\.classList\.add\('hidden'\)/);
});

test('auth state changes and errors both go through applyAdminState', () => {
    assert.match(APP, /onAuthStateChanged\(\(user\) => \{\s*applyAdminState\(user, null\);/);
    assert.match(APP, /\(error\) => \{\s*applyAdminState\(null, error\);/);
});

test('login success checks the owner UID before showing admin state', () => {
    assert.match(APP, /SledgeAdmin\.isOwnerUser\(signedInUser\)/);
    assert.match(APP, /this account does not have admin access/);
});

test('logout still signs out and therefore clears admin state', () => {
    assert.match(APP, /auth\.signOut\(\)/);
});

test('no alternate email-based admin grant exists', () => {
    assert.doesNotMatch(APP, /isAdmin\s*=\s*[^;]*email/i);
    assert.doesNotMatch(APP, /isAdmin\s*=\s*user\b/);
});

test('public read path is not gated by admin state', () => {
    assert.match(APP, /await db\.collection\('courses'\)\.doc\(courseId\)\s*\n?\s*\.collection\(category\)/);
    assert.doesNotMatch(APP, /getFilesFromDB[\s\S]{0,400}?isAdmin/);
});

test('index.html loads scripts in dependency order', () => {
    const adminIdx = HTML.indexOf('admin-auth.js?v=1');
    const readerIdx = HTML.indexOf('reader-description.js?v=1');
    const appIdx = HTML.indexOf('app.js?v=28');
    assert.ok(adminIdx > -1, 'admin-auth.js must be loaded');
    assert.ok(readerIdx > -1, 'reader-description.js must be loaded');
    assert.ok(appIdx > -1, 'app.js must be loaded');
    assert.ok(readerIdx > adminIdx, 'reader-description.js must load after admin-auth.js');
    assert.ok(appIdx > readerIdx, 'app.js must load after reader-description.js');
});

test('test files are excluded from hosting', () => {
    assert.ok(FB.hosting.ignore.includes('tests/**'));
    assert.ok(FB.hosting.ignore.includes('firestore.rules'));
});
