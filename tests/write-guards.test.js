'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function functionBody(source, name) {
    const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
    const m = re.exec(source);
    if (!m) return null;
    const start = m.index + m[0].length - 1;
    let depth = 0;
    for (let i = start; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
            depth--;
            if (depth === 0) return { start, end: i, text: source.slice(start, i + 1) };
        }
    }
    return null;
}

test('app.js uses the centralized owner-state resolver', () => {
    assert.match(APP, /SledgeAdmin\.resolveAdminState/);
});

test('admin state is never set to true unconditionally', () => {
    assert.doesNotMatch(APP, /isAdmin\s*=\s*true/);
});

test('every Firestore write is inside a guarded function', () => {
    const writeRe = /db\.collection\([\s\S]{0,200}?\.(add|delete|set|update)\(/g;
    const writes = [];
    let m;
    while ((m = writeRe.exec(APP)) !== null) {
        writes.push({ index: m.index, method: m[1] });
    }

    assert.equal(writes.length, 4, 'expected exactly 4 Firestore write sites');

    const guardedFunctions = ['deleteFileFromDB', 'confirmUpload', 'saveEvent', 'deleteEvent'];
    const spans = guardedFunctions.map(name => ({ name, body: functionBody(APP, name) }));

    for (const s of spans) {
        assert.ok(s.body, 'could not locate function ' + s.name);
        assert.match(s.body.text, /if\s*\([^)]*!\s*isAdmin[^)]*\)/, s.name + ' must guard on isAdmin');
    }

    for (const w of writes) {
        const owner = spans.find(s => s.body && w.index >= s.body.start && w.index <= s.body.end);
        assert.ok(owner, 'write at offset ' + w.index + ' (' + w.method + ') is not inside a known guarded function');
    }

    assert.deepEqual(writes.map(w => w.method).sort(), ['add', 'add', 'delete', 'delete']);
});

test('saveEvent has an explicit owner guard before writing', () => {
    const body = functionBody(APP, 'saveEvent');
    assert.ok(body);
    const guard = body.text.search(/if\s*\(!isAdmin\)/);
    const write = body.text.search(/db\.collection\(/);
    assert.ok(guard >= 0, 'saveEvent must guard on isAdmin');
    assert.ok(write > guard, 'the guard must precede the write');
});

test('no Firestore update/set writes exist outside the audited paths', () => {
    assert.doesNotMatch(APP, /db\.collection\([\s\S]{0,200}?\.(set|update)\(/);
});
