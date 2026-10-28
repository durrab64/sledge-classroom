/* ===================================================
   SLEDGE CLASSROOM — Now Playing Widget
   Self-contained JS module
   Reads from Firebase Realtime Database: nowPlaying/current
   Public read, authenticated write (via extension)
   Displays as a rotating CD disc on screen edge with slide-out sleeve
   =================================================== */

(function NowPlayingWidget() {
    'use strict';

    // ── Config ────────────────────────────────────────
    const DB_PATH = 'nowPlaying/current';
    // Treat the record as stale/offline if updatedAt is older than this
    const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const STALE_CHECK_INTERVAL_MS = 30 * 1000; // check every 30s
    const AUTO_PEEK_DURATION_MS = 4500; // auto-expand on track change for 4.5s

    // ── State ─────────────────────────────────────────
    let _widget = null;
    let _card = null;
    let _edgeDock = null;
    let _cdWrapper = null;
    let _cdGlow = null;
    let _cdDisc = null;
    let _artwork = null;
    let _artworkPlaceholder = null;
    let _cdBadge = null;
    let _sleeve = null;
    let _content = null;
    let _titleEl = null;
    let _artistEl = null;
    let _eqEl = null;
    let _statusTextEl = null;
    let _sourceBadgeEl = null;
    let _ytLinkEl = null;

    let _dismissedByUser = false;
    let _currentData = null;
    let _staleTimer = null;
    let _autoPeekTimer = null;
    let _rtdb = null;
    let _listener = null;
    let _lastClickTime = 0;

    // ── Helpers ───────────────────────────────────────
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

        // 1. Screen edge dock bracket
        _edgeDock = document.createElement('div');
        _edgeDock.className = 'np-edge-dock';
        _edgeDock.setAttribute('aria-hidden', 'true');
        _card.appendChild(_edgeDock);

        // 2. Circular CD Disc Wrapper
        _cdWrapper = document.createElement('div');
        _cdWrapper.className = 'np-cd-wrapper';
        _cdWrapper.setAttribute('role', 'button');
        _cdWrapper.setAttribute('tabindex', '0');
        _cdWrapper.setAttribute('aria-label', 'Now Playing CD disc. Click to view details.');
        _cdWrapper.setAttribute('title', 'Now Playing (Click to view track)');

        // Ambient neon glow ring when playing
        _cdGlow = document.createElement('div');
        _cdGlow.className = 'np-cd-glow';
        _cdGlow.setAttribute('aria-hidden', 'true');
        _cdWrapper.appendChild(_cdGlow);

        // Rotating CD Disc Body
        _cdDisc = document.createElement('div');
        _cdDisc.className = 'np-cd-disc';

        // Concentric vinyl grooves
        const grooves = document.createElement('div');
        grooves.className = 'np-cd-grooves';
        _cdDisc.appendChild(grooves);

        // Holographic rainbow diffraction sheen
        const sheen = document.createElement('div');
        sheen.className = 'np-cd-sheen';
        _cdDisc.appendChild(sheen);

        // Specular glass highlight
        const gloss = document.createElement('div');
        gloss.className = 'np-cd-gloss';
        _cdDisc.appendChild(gloss);

        // Center Album Artwork Label
        const cdLabel = document.createElement('div');
        cdLabel.className = 'np-cd-label';

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
        _artworkPlaceholder.innerHTML = '<i class="fab fa-youtube"></i>';

        cdLabel.appendChild(_artwork);
        cdLabel.appendChild(_artworkPlaceholder);
        _cdDisc.appendChild(cdLabel);

        // Center Spindle Hole
        const spindle = document.createElement('div');
        spindle.className = 'np-cd-spindle';
        const hole = document.createElement('div');
        hole.className = 'np-cd-center-hole';
        spindle.appendChild(hole);
        _cdDisc.appendChild(spindle);

        _cdWrapper.appendChild(_cdDisc);

        // Floating YouTube badge on disc edge
        _cdBadge = document.createElement('div');
        _cdBadge.className = 'np-cd-badge';
        _cdBadge.setAttribute('aria-hidden', 'true');
        _cdBadge.innerHTML = '<i class="fab fa-youtube"></i>';
        _cdWrapper.appendChild(_cdBadge);

        // Click / Key interactions on CD disc
        _cdWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            const now = Date.now();
            if (now - _lastClickTime < 350) {
                // Double click: open song link immediately
                if (_currentData && _currentData.songUrl) {
                    window.open(_currentData.songUrl, '_blank', 'noopener,noreferrer');
                }
            } else {
                // Single click: toggle expanded sleeve
                _card.classList.toggle('np-expanded');
                _card.classList.remove('np-auto-peek');
            }
            _lastClickTime = now;
        });

        _cdWrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                _card.classList.toggle('np-expanded');
            }
        });

        _card.appendChild(_cdWrapper);

        // 3. Slide-Out Info Sleeve
        _sleeve = document.createElement('div');
        _sleeve.className = 'np-info-sleeve';
        _sleeve.id = 'np-info-sleeve';

        // Dismiss Button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'np-close-btn';
        closeBtn.setAttribute('aria-label', 'Dismiss Now Playing widget');
        closeBtn.title = 'Dismiss widget';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            _dismissedByUser = true;
            _card.classList.remove('np-expanded', 'np-auto-peek');
            hide();
        });
        _sleeve.appendChild(closeBtn);

        // Content
        _content = document.createElement('div');
        _content.className = 'np-content';

        // Source & Status Row
        const sourceRow = document.createElement('div');
        sourceRow.className = 'np-source-row';

        _sourceBadgeEl = document.createElement('span');
        _sourceBadgeEl.className = 'np-source-badge';
        _sourceBadgeEl.setAttribute('aria-label', 'Music source');
        _sourceBadgeEl.innerHTML = '<i class="fab fa-youtube np-source-icon"></i><span>YouTube</span>';
        sourceRow.appendChild(_sourceBadgeEl);

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
        statusRow.appendChild(_eqEl);

        _statusTextEl = document.createElement('span');
        _statusTextEl.className = 'np-status-text np-text-offline';
        _statusTextEl.textContent = 'Offline';
        statusRow.appendChild(_statusTextEl);

        sourceRow.appendChild(statusRow);
        _content.appendChild(sourceRow);

        // Title (link to YouTube)
        _titleEl = document.createElement('a');
        _titleEl.className = 'np-title';
        _titleEl.setAttribute('target', '_blank');
        _titleEl.setAttribute('rel', 'noopener noreferrer');
        _titleEl.setAttribute('aria-label', 'Open currently playing track on YouTube');
        _titleEl.textContent = 'Loading…';
        _content.appendChild(_titleEl);

        // Artist
        _artistEl = document.createElement('div');
        _artistEl.className = 'np-artist';
        _artistEl.textContent = '';
        _content.appendChild(_artistEl);

        // Footer Row with direct YouTube link
        const footerRow = document.createElement('div');
        footerRow.className = 'np-footer-row';

        _ytLinkEl = document.createElement('a');
        _ytLinkEl.className = 'np-yt-link';
        _ytLinkEl.setAttribute('target', '_blank');
        _ytLinkEl.setAttribute('rel', 'noopener noreferrer');
        _ytLinkEl.innerHTML = '<span>Listen on YouTube</span> <i class="fas fa-arrow-up-right-from-square"></i>';
        footerRow.appendChild(_ytLinkEl);
        _content.appendChild(footerRow);

        _sleeve.appendChild(_content);
        _card.appendChild(_sleeve);

        // Prevent accidental closing on sleeve click
        _sleeve.addEventListener('click', (e) => {
            e.stopPropagation();
        });

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

    // ── Auto Peek on New Track ────────────────────────
    function triggerAutoPeek() {
        if (_autoPeekTimer) clearTimeout(_autoPeekTimer);
        _card.classList.add('np-auto-peek');
        _autoPeekTimer = setTimeout(() => {
            _card.classList.remove('np-auto-peek');
        }, AUTO_PEEK_DURATION_MS);
    }

    // ── Render ────────────────────────────────────────
    function render(data) {
        if (!_widget) return;

        const stale = isStale(data);
        const isPlaying = data && data.isPlaying && !stale;
        const hasMeta = data && data.title;

        // If no data at all or stale, render offline/hidden
        if (!hasMeta || stale) {
            renderOffline();
            return;
        }

        const isNewTrack = !(_currentData && _currentData.title === data.title);

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
            }, 180);
        }

        // Transition content inside sleeve
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
            _titleEl.title = title;

            if (data.songUrl) {
                _titleEl.href = data.songUrl;
                _titleEl.style.pointerEvents = 'auto';
                _ytLinkEl.href = data.songUrl;
                _ytLinkEl.style.display = 'inline-flex';
            } else {
                _titleEl.removeAttribute('href');
                _titleEl.style.pointerEvents = 'none';
                _ytLinkEl.style.display = 'none';
            }

            // Artist
            const artist = data.artist || '';
            _artistEl.textContent = artist;
            _artistEl.title = artist;

            // Update CD wrapper tooltip
            _cdWrapper.setAttribute(
                'title',
                `${title}${artist ? ' — ' + artist : ''} (Click to toggle details)`
            );

            // Status & Play state (triggers spinning CD disc)
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
            setTimeout(() => _content.classList.remove('np-fade-in'), 250);

            show();

            // Auto peek sleeve briefly if this is a newly started track
            if (isNewTrack && isPlaying) {
                triggerAutoPeek();
            }
        }, isNewTrack ? 180 : 0);

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
            _ytLinkEl.style.display = 'none';
            _sourceBadgeEl.className = 'np-source-badge';
            _sourceBadgeEl.innerHTML = '<i class="fab fa-youtube np-source-icon"></i><span>YouTube</span>';
            _statusTextEl.textContent = 'Offline';
            _statusTextEl.className = 'np-status-text np-text-offline';
            _card.classList.remove('np-playing', 'np-state-loading', 'np-auto-peek');
            _card.classList.add('np-state-offline');
            _cdWrapper.setAttribute('title', 'Not listening right now');

            _content.classList.remove('np-fade-out');
            _content.classList.add('np-fade-in');
            setTimeout(() => _content.classList.remove('np-fade-in'), 250);
        }, 180);

        // Only show offline if we previously had real data
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

    // ── Expose helper for testing / debugging ─────────
    window.__nowPlayingWidget = {
        render: (data) => render(data),
        show: () => { _dismissedByUser = false; show(); },
        hide: () => hide(),
        demo: (override) => {
            _dismissedByUser = false;
            render(Object.assign({
                title: 'Never Gonna Give You Up',
                artist: 'Rick Astley',
                source: 'youtube',
                songUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                isPlaying: true,
                artwork: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                updatedAt: Date.now()
            }, override || {}));
        }
    };

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
