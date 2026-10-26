// ===================================================
// Sledge Now Playing — YouTube Music Content Script
// music.youtube.com has a different DOM structure
// than regular YouTube; handled separately here.
// ===================================================
(function YTMusicContentScript() {
    'use strict';

    const SOURCE = 'youtube-music';
    let _lastPayload = null;
    let _pollTimer = null;
    let _reportedStopped = false;

    // ── Metadata extraction ────────────────────────────────
    // YTM player bar is at the bottom; selectors target it specifically.

    function getTitle() {
        // YTM player bar title
        const el = document.querySelector('.ytmusic-player-bar .title') ||
                   document.querySelector('yt-formatted-string.title.style-scope.ytmusic-player-bar') ||
                   document.querySelector('[class*="song-title"]') ||
                   document.querySelector('.content-info-wrapper .title');
        if (el && el.textContent.trim()) return el.textContent.trim();
        // Fallback: document title
        const dt = document.title
            .replace(/^\(\d+\)\s*/, '')
            .replace(/\s*-\s*YouTube Music\s*$/i, '')
            .trim();
        return dt || null;
    }

    function getArtist() {
        // YTM shows "Artist • Album" or just artist name
        const el = document.querySelector('.ytmusic-player-bar .byline') ||
                   document.querySelector('yt-formatted-string.byline.style-scope.ytmusic-player-bar') ||
                   document.querySelector('[class*="song-artist"]') ||
                   document.querySelector('.content-info-wrapper .byline');
        if (!el) return null;
        // The byline contains "Artist • Album • Year" — take just first segment
        const text = el.textContent.trim();
        return text.split('•')[0].trim() || text || null;
    }

    function getArtwork() {
        // Thumbnail from the player bar's img element
        const img = document.querySelector('.ytmusic-player-bar img.thumbnail') ||
                    document.querySelector('img.ytmusic-player-bar') ||
                    document.querySelector('.player-bar img') ||
                    document.querySelector('ytmusic-player-bar img');
        if (img && img.src && img.src.startsWith('http')) {
            // Attempt to get a larger size by replacing size suffix
            return img.src.replace(/=w\d+-h\d+/, '=w226-h226').replace(/\?.*$/, '') + '?w=226';
        }
        return null;
    }

    function getSongUrl() {
        // YTM watch URL
        const url = new URL(location.href);
        const v = url.searchParams.get('v');
        if (v) return `https://music.youtube.com/watch?v=${v}`;
        return location.href;
    }

    function isPlaying() {
        // Check play/pause button aria-label or paused state
        const playBtn = document.querySelector('.play-pause-button[aria-label]') ||
                        document.querySelector('tp-yt-paper-icon-button.play-pause-button') ||
                        document.querySelector('[aria-label="Pause"]') ||
                        document.querySelector('[data-testid="pause"]');
        if (playBtn) {
            const label = playBtn.getAttribute('aria-label') || '';
            if (label.toLowerCase().includes('pause')) return true;
        }
        // Fallback: check the underlying video element
        const video = document.querySelector('video');
        if (video) return !video.paused && !video.ended && video.readyState >= 2;
        return false;
    }

    function buildPayload() {
        const title = getTitle();
        if (!title) return null;
        return {
            type: 'NP_UPDATE',
            title,
            artist: getArtist(),
            artwork: getArtwork(),
            songUrl: getSongUrl(),
            source: SOURCE,
            isPlaying: isPlaying()
        };
    }

    function payloadsEqual(a, b) {
        if (!a || !b) return false;
        return a.title === b.title &&
               a.artist === b.artist &&
               a.isPlaying === b.isPlaying &&
               a.artwork === b.artwork;
    }

    // ── Reporting ─────────────────────────────────────────
    function report(payload) {
        if (payloadsEqual(payload, _lastPayload)) return;
        _lastPayload = payload;
        _reportedStopped = false;
        chrome.runtime.sendMessage(payload).catch(() => {});
    }

    function reportStopped() {
        if (_reportedStopped) return;
        _reportedStopped = true;
        _lastPayload = null;
        chrome.runtime.sendMessage({ type: 'NP_STOPPED' }).catch(() => {});
    }

    // ── Video element events ───────────────────────────────
    function attachVideoListeners() {
        const video = document.querySelector('video');
        if (!video || video._npAttached) return;
        video._npAttached = true;
        video.addEventListener('play',   tick);
        video.addEventListener('pause',  tick);
        video.addEventListener('ended',  tick);
    }

    function tick() {
        const payload = buildPayload();
        if (payload) {
            report(payload);
        } else {
            reportStopped();
        }
    }

    // ── MutationObserver — YTM is heavily dynamic ─────────
    // Watch the player bar for DOM changes (track changes, play/pause)
    const playerBarObs = new MutationObserver(() => tick());

    function attachObserver() {
        const bar = document.querySelector('ytmusic-player-bar') ||
                    document.querySelector('.ytmusic-player-bar');
        if (bar && !bar._npObserving) {
            bar._npObserving = true;
            playerBarObs.observe(bar, { subtree: true, childList: true, attributes: true, characterData: true });
        }
    }

    // ── Poll loop ──────────────────────────────────────────
    _pollTimer = setInterval(() => {
        attachVideoListeners();
        attachObserver();
        tick();
    }, 2000);

    // ── Initial ───────────────────────────────────────────
    setTimeout(() => {
        attachVideoListeners();
        attachObserver();
        tick();
    }, 2000);

    // ── Cleanup ───────────────────────────────────────────
    window.addEventListener('beforeunload', () => {
        clearInterval(_pollTimer);
        playerBarObs.disconnect();
        reportStopped();
    });

})();
