/*
 * Sledge Classroom — centralized owner authorization helper.
 *
 * This is a UI convenience layer only. The real security boundary is the
 * deployed Firestore rules. Never treat this file as access control.
 */
(function (root, factory) {
    'use strict';
    var api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.SledgeAdmin = api;
    }
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    // Confirmed owner. UIDs are immutable and server-issued.
    var OWNER_UID = 'dRHxakX2iAWM4w1IqtYPLpCZrwr2';

    function isOwnerUser(user) {
        return !!user && typeof user.uid === 'string' && user.uid === OWNER_UID;
    }

    // Fail closed: an unresolved, missing, or errored identity is never admin.
    function resolveAdminState(user, error) {
        if (error) return false;
        return isOwnerUser(user);
    }

    // Explicit alias for write-path guards.
    function canWrite(user, error) {
        return resolveAdminState(user, error);
    }

    return {
        OWNER_UID: OWNER_UID,
        isOwnerUser: isOwnerUser,
        resolveAdminState: resolveAdminState,
        canWrite: canWrite
    };
});
