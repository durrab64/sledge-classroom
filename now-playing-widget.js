/* ===================================================
   SLEDGE CLASSROOM — Now Playing Widget
   Self-contained JS module
   Reads from Firebase Realtime Database: nowPlaying/current
   Public read, authenticated write (via extension)
   =================================================== */

(function NowPlayingWidget() {
    'use strict';

    // ── Config ────────────────────────────────────────
    const DB_PATH = 'nowPlaying/current';
    // Treat the record as stale/offline if updatedAt is older than this
    const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const STALE_CHECK_INTERVAL_MS = 30 * 1000; // check every 30s

    // ── State ─────────────────────────────────────────
    let _widget = null;
    let _card = null;
    let _content = null;
    let _artworkWrapper = null;
    let _artwork = null;
    let _artworkPlaceholder = null;
    let _titleEl = null;
    let _artistEl = null;
    let _eqEl = null;
    let _statusTextEl = null;
    let _sourceBadgeEl = null;
    let _dismissedByUser = false;
    let _currentData = null;
    let _staleTimer = null;
    let _rtdb = null;
    let _listener = null;

    // ── Helpers ───────────────────────────────────────
    function sanitize(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function isStale(data) {
        if (!data || !data.updatedAt) return true;
        return (Date.now() - data.updatedAt) > STALE_TIMEOUT_MS;
    }

    // ── Build DOM ─────────────────────────────────────
    function buildWidget() {
        _widget = document.createElement('div');
        _widget.id = 'now-playing-widget';
        _widget.setAttribute('role', 'complementary');
        _widget.setAttribute('aria-label', 'Now Playing music widget');
        _widget.classList.add('np-hidden');

        _card = document.createElement('div');
        _card.className = 'np-card np-state-loading';

        // Dismiss button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'np-close-btn';
        closeBtn.setAttribute('aria-label', 'Dismiss Now Playing widget');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            _dismissedByUser = true;
            hide();
        });
        _card.appendChild(closeBtn);

        // Artwork wrapper
        _artworkWrapper = document.createElement('div');
        _artworkWrapper.className = 'np-artwork-wrapper';

        _artwork = document.createElement('img');
        _artwork.className = 'np-artwork';
        _artwork.alt = 'Album art';
        _artwork.style.display = 'none';
        _artwork.addEventListener('error', () => {
            _artwork.style.display = 'none';
            _artworkPlaceholder.style.display = 'flex';
        });

        _artworkPlaceholder = document.createElement('div');
        _artworkPlaceholder.className = 'np-artwork-placeholder';
        _artworkPlaceholder.innerHTML = '<i class="fas fa-music"></i>';

        _artworkWrapper.appendChild(_artwork);
        _artworkWrapper.appendChild(_artworkPlaceholder);
        _card.appendChild(_artworkWrapper);

        // Content
        _content = document.createElement('div');
        _content.className = 'np-content';

        // Source row
        const sourceRow = document.createElement('div');
        sourceRow.className = 'np-source-row';

        _sourceBadgeEl = document.createElement('span');
        _sourceBadgeEl.className = 'np-source-badge';
        _sourceBadgeEl.setAttribute('aria-label', 'Music source');
        _sourceBadgeEl.innerHTML = '<i class="fab fa-youtube np-source-icon"></i><span>YouTube</span>';
        sourceRow.appendChild(_sourceBadgeEl);
        _content.appendChild(sourceRow);

        // Title (clickable link)
        _titleEl = document.createElement('a');
        _titleEl.className = 'np-title';
        _titleEl.setAttribute('target', '_blank');
        _titleEl.setAttribute('rel', 'noopener noreferrer');
        _titleEl.setAttribute('aria-label', 'Open currently playing track');
        _titleEl.textContent = 'Loading…';
        _content.appendChild(_titleEl);

        // Artist
        _artistEl = document.createElement('div');
        _artistEl.className = 'np-artist';
        _artistEl.textContent = '';
        _content.appendChild(_artistEl);

        // Status row
        const statusRow = document.createElement('div');
        statusRow.className = 'np-status-row';

        _eqEl = document.createElement('div');
        _eqEl.className = 'np-equalizer';
        _eqEl.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 4; i++) {
            const bar = document.createElement('div');
            bar.className = 'np-eq-bar';
            _eqEl.appendChild(bar);
        }

        _statusTextEl = document.createElement('span');
        _statusTextEl.className = 'np-status-text np-text-offline';
        _statusTextEl.textContent = 'Offline';

        statusRow.appendChild(_eqEl);
        statusRow.appendChild(_statusTextEl);
        _content.appendChild(statusRow);

        _card.appendChild(_content);
        _widget.appendChild(_card);
        document.body.appendChild(_widget);
    }

    // ── Show / Hide ───────────────────────────────────
    function show() {
        if (_dismissedByUser) return;
        _widget.classList.remove('np-hidden');
    }

    function hide() {
        _widget.classList.add('np-hidden');
    }

    // ── Render ────────────────────────────────────────
    function render(data) {
        if (!_widget) return;

        const stale = isStale(data);
        const isPlaying = data && data.isPlaying && !stale;
        const hasMeta = data && data.title;

        // If no data at all, keep hidden
        if (!hasMeta || stale) {
            renderOffline();
            return;
        }

        // Transition artwork
        const newArt = data.artwork || '';
        const oldArt = _artwork.src;
        if (newArt !== oldArt) {
            _artwork.classList.add('np-art-fade-out');
            setTimeout(() => {
                if (newArt) {
                    _artwork.src = newArt;
                    _artwork.style.display = 'block';
                    _artworkPlaceholder.style.display = 'none';
                } else {
                    _artwork.style.display = 'none';
                    _artworkPlaceholder.style.display = 'flex';
                }
                _artwork.classList.remove('np-art-fade-out');
                _artwork.classList.add('np-art-fade-in');
                setTimeout(() => _artwork.classList.remove('np-art-fade-in'), 300);
            }, 200);
        }

        // Transition content
        _content.classList.add('np-fade-out');
        setTimeout(() => {
            // Source badge
            const isYTM = data.source === 'youtube-music';
            _sourceBadgeEl.className = 'np-source-badge ' + (isYTM ? 'np-source-ytm' : 'np-source-yt');
            _sourceBadgeEl.innerHTML = isYTM
                ? '<i class="fab fa-youtube np-source-icon"></i><span>YT Music</span>'
                : '<i class="fab fa-youtube np-source-icon"></i><span>YouTube</span>';

            // Title link
            const title = data.title || 'Unknown track';
            _titleEl.textContent = title;
            _titleEl.setAttribute('aria-label', 'Open: ' + title);
            if (data.songUrl) {
                _titleEl.href = data.songUrl;
                _titleEl.style.pointerEvents = 'auto';
            } else {
                _titleEl.removeAttribute('href');
                _titleEl.style.pointerEvents = 'none';
            }

            // Artist
            _artistEl.textContent = data.artist || '';

            // Status
            if (isPlaying) {
                _statusTextEl.textContent = 'Now Playing';
                _statusTextEl.className = 'np-status-text np-text-playing';
                _card.classList.add('np-playing');
                _card.classList.remove('np-state-offline', 'np-state-loading');
            } else {
                _statusTextEl.textContent = 'Paused';
                _statusTextEl.className = 'np-status-text np-text-paused';
                _card.classList.remove('np-playing', 'np-state-offline', 'np-state-loading');
            }

            _content.classList.remove('np-fade-out');
            _content.classList.add('np-fade-in');
            setTimeout(() => _content.classList.remove('np-fade-in'), 300);

            show();
        }, data.title !== (_currentData && _currentData.title) ? 200 : 0);

        _currentData = data;
    }

    function renderOffline() {
        _content.classList.add('np-fade-out');
        setTimeout(() => {
            _artwork.style.display = 'none';
            _artworkPlaceholder.style.display = 'flex';
            _titleEl.textContent = 'Not listening right now';
            _titleEl.removeAttribute('href');
            _titleEl.style.pointerEvents = 'none';
            _artistEl.textContent = '';
            _sourceBadgeEl.className = 'np-source-badge';
            _sourceBadgeEl.innerHTML = '<i class="fab fa-youtube np-source-icon"></i><span>Music</span>';
            _statusTextEl.textContent = 'Offline';
            _statusTextEl.className = 'np-status-text np-text-offline';
            _card.classList.remove('np-playing', 'np-state-loading');
            _card.classList.add('np-state-offline');

            _content.classList.remove('np-fade-out');
            _content.classList.add('np-fade-in');
            setTimeout(() => _content.classList.remove('np-fade-in'), 300);
        }, 200);

        // Only show the offline state if we previously had real data
        // (don't show widget cold if admin never published anything)
        if (_currentData) {
            show();
        }
        _currentData = null;
    }

    // ── Stale-check timer ────────────────────────────
    function resetStaleTimer() {
        if (_staleTimer) clearInterval(_staleTimer);
        _staleTimer = setInterval(() => {
            if (_currentData && isStale(_currentData)) {
                renderOffline();
            }
        }, STALE_CHECK_INTERVAL_MS);
    }

    // ── Firebase Realtime Database listener ───────────
    function startListener() {
        if (!window.firebaseRTDB) {
            // SDK not loaded yet, retry
            setTimeout(startListener, 500);
            return;
        }
        _rtdb = window.firebaseRTDB;
        const ref = _rtdb.ref(DB_PATH);

        _listener = ref.on('value', (snapshot) => {
            const data = snapshot.val();
            render(data);
            resetStaleTimer();
        }, (err) => {
            console.warn('[NowPlaying] Firebase read error:', err.message);
            renderOffline();
        });
    }

    // ── Init ──────────────────────────────────────────
    function init() {
        buildWidget();
        startListener();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

})();
