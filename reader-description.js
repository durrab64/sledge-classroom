/*
 * Sledge Classroom — reader description helper.
 *
 * Pure, dependency-free helpers for deciding whether a resource description
 * should be rendered in the Reading Room (and course file rows). This is a UI
 * convenience layer only; it never modifies Firestore data.
 *
 * Loaded as a <script> before app.js so the Reader can call ReaderDescription.*
 * The same module is loadable with require() in Node for unit tests.
 */
(function (root, factory) {
    'use strict';
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ReaderDescription = api;
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Return the description string to display, trimmed of surrounding
    // whitespace. Returns an empty string when the value is missing, is not a
    // string, or is empty/whitespace-only, so callers can hide the section.
    function getDisplayDescription(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim();
    }

    // True when a description section should be rendered.
    function hasDescription(value) {
        return getDisplayDescription(value) !== '';
    }

    return {
        getDisplayDescription: getDisplayDescription,
        hasDescription: hasDescription
    };
});
