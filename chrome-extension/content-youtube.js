// ===================================================
// Sledge Now Playing — YouTube Content Script
// Extracts title, artist/channel, artwork, URL, play state
// Works with regular youtube.com watch pages and playlists
// ===================================================
(function YouTubeContentScript() {
    'use strict';

    const SOURCE = 'youtube';
    let _lastPayload = null;
    let _pollTimer = null;
    let _reportedStopped = false;

    // ── Metadata extraction ────────────────────────────────
    function getTitle() {
        // Primary: <h1 class="title">
        const h1 = document.querySelector('h1.ytd-watch-metadata .style-scope.ytd-watch-metadata') ||
                   document.querySelector('h1.ytd-video-primary-info-renderer') ||
                   document.querySelector('#title h1') ||
                   document.querySelector('ytd-watch-metadata h1');
        if (h1 && h1.textContent.trim()) return h1.textContent.trim();
        // Fallback: document title strip notification prefix "(1)" and " - YouTube"
        const dtitle = document.title
            .replace(/^\(\d+\)\s*/, '')
            .replace(/\s*-\s*YouTube\s*$/i, '')
            .trim();
        return dtitle || null;
    }

    function getChannel() {
        // Channel name from the owner element
        const ch = document.querySelector('#owner-name a') ||
                   document.querySelector('ytd-channel-name#channel-name a') ||
                   document.querySelector('#channel-name a') ||
                   document.querySelector('.ytd-channel-name a');
        return ch ? ch.textContent.trim() : null;
    }

    function getThumbnail(videoId) {
        if (!videoId) return null;
        // maxresdefault might 404 on older videos, use hqdefault as reliable fallback
        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    function getVideoId() {
        const url = new URL(location.href);
        return url.searchParams.get('v') || null;
    }

    function isPlaying() {
        const video = document.querySelector('video.html5-main-video') ||
                      document.querySelector('video');
        if (!video) return false;
        return !video.paused && !video.ended && video.readyState >= 2;
    }

    function isOnWatchPage() {
        return location.pathname === '/watch';
    }

    function buildPayload() {
        if (!isOnWatchPage()) return null;
        const videoId = getVideoId();
        if (!videoId) return null;
        return {
            type: 'NP_UPDATE',
            title: getTitle(),
            artist: getChannel(),
            artwork: getThumbnail(videoId),
            songUrl: `https://www.youtube.com/watch?v=${videoId}`,
            source: SOURCE,
            isPlaying: isPlaying()
        };
    }

    function payloadsEqual(a, b) {
        if (!a || !b) return false;
        return a.title === b.title &&
               a.artist === b.artist &&
               a.songUrl === b.songUrl &&
               a.isPlaying === b.isPlaying;
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

    // ── Poll loop (lightweight: 2s) ────────────────────────
    // YouTube's SPA navigation doesn't fire full page reloads,
    // so we poll rather than relying purely on events.
    // 2s interval is fine — we debounce on the background side.
    function tick() {
        if (!isOnWatchPage()) {
            reportStopped();
            return;
        }
        const payload = buildPayload();
        if (payload) {
            report(payload);
        } else {
            reportStopped();
        }
    }

    // ── Video element event listeners ──────────────────────
    function attachVideoListeners() {
        const video = document.querySelector('video');
        if (!video || video._npAttached) return;
        video._npAttached = true;
        video.addEventListener('play',   tick);
        video.addEventListener('pause',  tick);
        video.addEventListener('ended',  tick);
        video.addEventListener('seeked', tick);
    }

    // ── SPA navigation detection via yt-navigate-finish ───
    document.addEventListener('yt-navigate-finish', () => {
        _lastPayload = null;
        _reportedStopped = false;
        // Wait for metadata to render
        setTimeout(() => {
            attachVideoListeners();
            tick();
        }, 1200);
    });

    // ── MutationObserver for title changes ────────────────
    const titleObs = new MutationObserver(() => tick());
    titleObs.observe(document.querySelector('title') || document.head, {
        subtree: true,
        characterData: true,
        childList: true
    });

    // ── Periodic poll ─────────────────────────────────────
    _pollTimer = setInterval(() => {
        attachVideoListeners();
        tick();
    }, 2000);

    // ── Initial tick ──────────────────────────────────────
    setTimeout(() => {
        attachVideoListeners();
        tick();
    }, 1500);

    // ── Cleanup on page unload ────────────────────────────
    window.addEventListener('beforeunload', () => {
        clearInterval(_pollTimer);
        reportStopped();
    });

})();
