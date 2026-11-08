'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const admin = require('../admin-auth.js');

const OWNER = 'dRHxakX2iAWM4w1IqtYPLpCZrwr2';

test('exposes the confirmed owner UID', () => {
    assert.equal(admin.OWNER_UID, OWNER);
});

test('confirmed owner is admin', () => {
    assert.equal(admin.resolveAdminState({ uid: OWNER, email: 'owner@example.com' }, null), true);
});

test('non-owner authenticated user is not admin', () => {
    assert.equal(admin.resolveAdminState({ uid: 'someone-else', email: 'owner@example.com' }, null), false);
});

test('anonymous visitor is not admin', () => {
    assert.equal(admin.resolveAdminState(null, null), false);
    assert.equal(admin.resolveAdminState(undefined, null), false);
});

test('auth error fails closed even with an owner-shaped object', () => {
    assert.equal(admin.resolveAdminState({ uid: OWNER }, new Error('auth unavailable')), false);
    assert.equal(admin.resolveAdminState(null, new Error('auth unavailable')), false);
});

test('malformed user objects are not admin', () => {
    assert.equal(admin.isOwnerUser({}), false);
    assert.equal(admin.isOwnerUser({ uid: null }), false);
    assert.equal(admin.isOwnerUser({ uid: 123 }), false);
    assert.equal(admin.isOwnerUser('not-an-object'), false);
});

test('email similarity alone never grants admin', () => {
    assert.equal(admin.isOwnerUser({ uid: 'attacker', email: 'mhdurrabrehan@gmail.com' }), false);
});

test('owner UID is exact and case-sensitive', () => {
    assert.equal(admin.isOwnerUser({ uid: OWNER.toUpperCase() }), false);
    assert.equal(admin.isOwnerUser({ uid: OWNER + ' ' }), false);
});

test('canWrite mirrors resolveAdminState', () => {
    assert.equal(admin.canWrite({ uid: OWNER }, null), true);
    assert.equal(admin.canWrite({ uid: 'other' }, null), false);
    assert.equal(admin.canWrite(null, null), false);
});
