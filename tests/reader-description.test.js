'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const ReaderDescription = require('../reader-description.js');

test('getDisplayDescription exposes a function', () => {
    assert.equal(typeof ReaderDescription.getDisplayDescription, 'function');
    assert.equal(typeof ReaderDescription.hasDescription, 'function');
});

test('empty string is treated as no description', () => {
    assert.equal(ReaderDescription.getDisplayDescription(''), '');
    assert.equal(ReaderDescription.hasDescription(''), false);
});

test('whitespace-only string is treated as no description', () => {
    assert.equal(ReaderDescription.getDisplayDescription('   '), '');
    assert.equal(ReaderDescription.getDisplayDescription('\t\n  '), '');
    assert.equal(ReaderDescription.hasDescription('   '), false);
    assert.equal(ReaderDescription.hasDescription('\t\n  '), false);
});

test('null description is treated as no description', () => {
    assert.equal(ReaderDescription.getDisplayDescription(null), '');
    assert.equal(ReaderDescription.hasDescription(null), false);
});

test('undefined description is treated as no description', () => {
    assert.equal(ReaderDescription.getDisplayDescription(undefined), '');
    assert.equal(ReaderDescription.hasDescription(undefined), false);
});

test('valid non-empty description is preserved', () => {
    assert.equal(
        ReaderDescription.getDisplayDescription('Follow the video inside to install the cracked version'),
        'Follow the video inside to install the cracked version'
    );
    assert.equal(ReaderDescription.hasDescription('Follow the video inside to install the cracked version'), true);
});

test('leading and trailing whitespace is trimmed for display', () => {
    assert.equal(ReaderDescription.getDisplayDescription('  Statistics 1  '), 'Statistics 1');
    assert.equal(ReaderDescription.getDisplayDescription('\nStatistics 1\n'), 'Statistics 1');
    assert.equal(ReaderDescription.hasDescription('  Statistics 1  '), true);
});

test('unexpected non-string values fail closed', () => {
    assert.equal(ReaderDescription.getDisplayDescription(0), '');
    assert.equal(ReaderDescription.getDisplayDescription(42), '');
    assert.equal(ReaderDescription.getDisplayDescription({}), '');
    assert.equal(ReaderDescription.getDisplayDescription([]), '');
    assert.equal(ReaderDescription.getDisplayDescription(true), '');
    assert.equal(ReaderDescription.getDisplayDescription(false), '');
    assert.equal(ReaderDescription.hasDescription(0), false);
    assert.equal(ReaderDescription.hasDescription({}), false);
    assert.equal(ReaderDescription.hasDescription([]), false);
});

test('a description of only spaces after trimming is hidden', () => {
    assert.equal(ReaderDescription.getDisplayDescription(' '), '');
    assert.equal(ReaderDescription.hasDescription(' '), false);
});
