// ===================================================
// Sledge Now Playing — Background Service Worker
// Handles: Firebase auth, RTDB writes, tab coordination,
//          debouncing, credential storage
// ===================================================

// ── Firebase config (public — safe per Firebase design) ──
// These identify your project; real security is in RTDB Rules.
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyDlQYkbyc-bHScppvr2GyYXQScHlHMXr0g",
    authDomain:        "sledge-classroom.firebaseapp.com",
    projectId:         "sledge-classroom",
    databaseURL:       "https://sledge-classroom-default-rtdb.firebaseio.com",
    storageBucket:     "sledge-classroom.firebasestorage.app",
    messagingSenderId: "348238674656",
    appId:             "1:348238674656:web:7db9c9021774541f246e85"
};

// NOTE: Replace databaseURL above with your actual Realtime Database URL.
// Find it in Firebase Console → Realtime Database → copy the URL (ends in .firebaseio.com).

const RTDB_PATH = 'nowPlaying/current';
const DEBOUNCE_MS = 1500;   // Coalesce rapid metadata changes
const STALE_CLEAR_MS = 8000; // Clear after 8s of silence (stopped state)

// ── State ─────────────────────────────────────────────────
let _idToken = null;
let _tokenExpiry = 0;
let _enabled = true;
let _debounceTimer = null;
let _clearTimer = null;

// Tab state: Map<tabId, {title, artist, artwork, songUrl, source, isPlaying, updatedAt}>
const _tabState = new Map();

// ── Firebase REST helpers ─────────────────────────────────

async function getCredentials() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['np_email', 'np_password'], resolve);
    });
}

async function getIdToken() {
    // Return cached token if still valid (with 60s buffer)
    if (_idToken && Date.now() < _tokenExpiry - 60000) {
        return _idToken;
    }
    const { np_email, np_password } = await getCredentials();
    if (!np_email || !np_password) {
        throw new Error('No credentials stored. Open the extension popup to sign in.');
    }

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: np_email,
            password: np_password,
            returnSecureToken: true
        })
    });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error?.message || 'Authentication failed');
    }
    const data = await resp.json();
    _idToken = data.idToken;
    _tokenExpiry = Date.now() + parseInt(data.expiresIn, 10) * 1000;
    return _idToken;
}

async function getDatabaseURL() {
    const { np_database_url } = await chrome.storage.local.get(['np_database_url']);
    const raw = np_database_url || FIREBASE_CONFIG.databaseURL || `https://${FIREBASE_CONFIG.projectId}-default-rtdb.firebaseio.com`;
    return raw.replace(/\/+$/, '');
}

async function writeToRTDB(payload) {
    try {
        const token = await getIdToken();
        const baseUrl = await getDatabaseURL();
        const url = `${baseUrl}/${RTDB_PATH}.json?auth=${token}`;
        const resp = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            console.error('[NowPlaying BG] RTDB write error:', resp.status, err);
        }
    } catch (err) {
        console.error('[NowPlaying BG] Write failed:', err.message);
        // Notify popup if open
        chrome.runtime.sendMessage({ type: 'NP_ERROR', error: err.message }).catch(() => {});
    }
}

async function clearRTDB() {
    try {
        const token = await getIdToken();
        const baseUrl = await getDatabaseURL();
        const url = `${baseUrl}/${RTDB_PATH}.json?auth=${token}`;
        await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: null,
                artist: null,
                artwork: null,
                songUrl: null,
                source: null,
                isPlaying: false,
                updatedAt: Date.now()
            })
        });
    } catch (err) {
        console.warn('[NowPlaying BG] Clear failed:', err.message);
    }
}

// ── Tab Arbitration ────────────────────────────────────────
// Priority: actively playing tab wins; if multiple play, most-recently-updated wins.
// Paused tabs never overwrite a playing tab.

function selectActiveState() {
    let best = null;
    for (const [, state] of _tabState) {
        if (!state) continue;
        if (!best) { best = state; continue; }
        // Playing > paused
        if (state.isPlaying && !best.isPlaying) { best = state; continue; }
        if (!state.isPlaying && best.isPlaying) continue;
        // Both same playing state → most recent wins
        if (state.updatedAt > best.updatedAt) best = state;
    }
    return best;
}

// ── Debounced publish ──────────────────────────────────────
function schedulePublish() {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
        if (!_enabled) return;
        const state = selectActiveState();
        if (!state || (!state.isPlaying && !state.title)) return;
        writeToRTDB({
            title:     state.title || null,
            artist:    state.artist || null,
            artwork:   state.artwork || null,
            songUrl:   state.songUrl || null,
            source:    state.source || null,
            isPlaying: !!state.isPlaying,
            updatedAt: Date.now()
        });
    }, DEBOUNCE_MS);
}

function scheduleClear() {
    if (_clearTimer) clearTimeout(_clearTimer);
    _clearTimer = setTimeout(() => {
        // Only clear if nothing is actively playing
        const state = selectActiveState();
        if (!state || !state.isPlaying) {
            clearRTDB();
        }
    }, STALE_CLEAR_MS);
}

// ── Message handler (from content scripts) ────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === 'NP_UPDATE') {
        const tabId = sender.tab?.id;
        if (!tabId) return;

        _tabState.set(tabId, {
            title:     msg.title,
            artist:    msg.artist,
            artwork:   msg.artwork,
            songUrl:   msg.songUrl,
            source:    msg.source,
            isPlaying: msg.isPlaying,
            updatedAt: Date.now()
        });

        if (msg.isPlaying) {
            schedulePublish();
            if (_clearTimer) clearTimeout(_clearTimer);
        } else {
            // Tab paused or stopped
            schedulePublish(); // Update paused state
            scheduleClear();
        }
    }

    if (msg.type === 'NP_STOPPED') {
        const tabId = sender.tab?.id;
        if (tabId) _tabState.delete(tabId);
        // If nothing else playing, schedule a clear
        const state = selectActiveState();
        if (!state || !state.isPlaying) {
            scheduleClear();
        }
    }

    if (msg.type === 'NP_POPUP_SAVE_CREDS') {
        // Popup saved new credentials — reset token cache
        _idToken = null;
        _tokenExpiry = 0;
    }

    if (msg.type === 'NP_GET_STATUS') {
        const state = selectActiveState();
        return Promise.resolve({
            enabled: _enabled,
            state: state || null,
            tabCount: _tabState.size
        });
    }

    if (msg.type === 'NP_SET_ENABLED') {
        _enabled = msg.enabled;
        chrome.storage.local.set({ np_enabled: _enabled });
        if (!_enabled) {
            clearRTDB();
            _tabState.clear();
        }
    }
});

// ── Tab close cleanup ─────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
    if (_tabState.has(tabId)) {
        _tabState.delete(tabId);
        const state = selectActiveState();
        if (!state || !state.isPlaying) {
            scheduleClear();
        }
    }
});

// ── Restore enabled state on startup ──────────────────────
chrome.storage.local.get(['np_enabled'], (result) => {
    _enabled = result.np_enabled !== false; // default true
});

// ── Periodic keepalive alarm (MV3 service workers sleep) ──
chrome.alarms.create('np_keepalive', { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'np_keepalive') {
        // Recheck stale tabs
        const now = Date.now();
        for (const [tabId, state] of _tabState) {
            if (state && now - state.updatedAt > 120000) {
                _tabState.delete(tabId);
            }
        }
    }
});
