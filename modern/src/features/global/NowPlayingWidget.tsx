// Now Playing widget — port of legacy now-playing-widget.js.
//
// The RTDB subscription lives in the global provider (one subscription for
// the whole app). This component owns only presentation: the rotating CD,
// the slide-out "music pop-up" sleeve, stale/offline handling, artwork
// fallback and YouTube links. No playback is introduced.

import { useEffect, useRef, useState } from 'react';
import type { NowPlaying } from '@/types';
import { useGlobalExperience } from './GlobalExperienceContext';

const STALE_TIMEOUT_MS = 5 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS = 30 * 1000;
const AUTO_PEEK_DURATION_MS = 4500;

function isStale(data: NowPlaying | null, now: number): boolean {
  if (!data || !data.updatedAt) return true;
  return now - data.updatedAt > STALE_TIMEOUT_MS;
}

function songHref(data: NowPlaying | null): string | undefined {
  return data?.songUrl ?? data?.ytLink;
}

export function NowPlayingWidget() {
  const {
    nowPlaying,
    nowPlayingError,
    musicExpanded,
    musicDismissed,
    setMusicExpanded,
    dismissMusic,
  } = useGlobalExperience();

  const [visible, setVisible] = useState(false);
  const [autoPeek, setAutoPeek] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [artworkFailed, setArtworkFailed] = useState(false);

  const hadData = useRef(false);
  const previousTitle = useRef<string | null>(null);
  const lastClick = useRef(0);
  const autoPeekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stale = isStale(nowPlaying, now) || !!nowPlayingError;
  const hasMeta = !!nowPlaying?.title && !stale;
  const isPlaying = hasMeta && !!nowPlaying?.isPlaying;
  const artwork = hasMeta ? nowPlaying?.artwork : undefined;
  const href = songHref(nowPlaying);

  // Evaluate staleness on the legacy 30s cadence.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Show the widget when a real track is available. A user-dismissed widget
  // stays hidden until the dock explicitly opens it again.
  useEffect(() => {
    if (hasMeta) {
      hadData.current = true;
      if (!musicDismissed) setVisible(true);

      const title = nowPlaying?.title ?? null;
      if (previousTitle.current !== null && previousTitle.current !== title && isPlaying) {
        if (autoPeekTimer.current) clearTimeout(autoPeekTimer.current);
        setAutoPeek(true);
        autoPeekTimer.current = setTimeout(() => {
          setAutoPeek(false);
          autoPeekTimer.current = null;
        }, AUTO_PEEK_DURATION_MS);
      }
      previousTitle.current = title;
    } else if (hadData.current && !musicDismissed) {
      // Legacy only shows the offline state if real data had been seen.
      setVisible(true);
    }
  }, [hasMeta, isPlaying, nowPlaying?.title, musicDismissed]);

  useEffect(() => {
    if (musicDismissed) {
      setVisible(false);
      setAutoPeek(false);
    } else if (musicExpanded) {
      setVisible(true);
    }
  }, [musicDismissed, musicExpanded]);

  useEffect(() => {
    setArtworkFailed(false);
  }, [artwork]);

  useEffect(
    () => () => {
      if (autoPeekTimer.current) clearTimeout(autoPeekTimer.current);
    },
    [],
  );

  const close = () => {
    dismissMusic();
    setAutoPeek(false);
  };

  const toggleExpanded = () => {
    if (musicExpanded) {
      setMusicExpanded(false);
      setAutoPeek(false);
    } else {
      setMusicExpanded(true);
      setAutoPeek(false);
    }
  };

  const onDiscClick = () => {
    const time = Date.now();
    if (time - lastClick.current < 350) {
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      toggleExpanded();
    }
    lastClick.current = time;
  };

  const onDiscKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  const offline = !hasMeta;
  const title = offline ? 'Not listening right now' : nowPlaying?.title ?? '';
  const artist = offline ? '' : nowPlaying?.artist ?? '';
  const isYoutubeMusic = nowPlaying?.source === 'youtube-music';
  const statusLabel = offline ? 'Offline' : isPlaying ? 'Now Playing' : 'Paused';
  const statusClass = offline
    ? 'np-text-offline'
    : isPlaying
      ? 'np-text-playing'
      : 'np-text-paused';

  return (
    <div
      id="now-playing-widget"
      role="complementary"
      aria-label="Now Playing music widget"
      className={`${visible ? '' : 'np-hidden'}${musicExpanded ? ' np-visible-expanded' : ''}`}
    >
      <div
        className={[
          'np-card',
          isPlaying ? 'np-playing' : '',
          offline ? 'np-state-offline' : '',
          musicExpanded ? 'np-expanded' : '',
          autoPeek ? 'np-auto-peek' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="np-edge-dock" aria-hidden="true" />

        <div
          className="np-cd-wrapper"
          role="button"
          tabIndex={0}
          aria-label="Now Playing CD disc. Click to view details."
          title={
            offline
              ? 'Not listening right now'
              : `${title}${artist ? ` — ${artist}` : ''} (Click to toggle details)`
          }
          onClick={onDiscClick}
          onKeyDown={onDiscKeyDown}
        >
          <div className="np-cd-glow" aria-hidden="true" />
          <div className="np-cd-disc">
            <div className="np-cd-grooves" />
            <div className="np-cd-sheen" />
            <div className="np-cd-gloss" />
            <div className="np-cd-label">
              {artwork && !artworkFailed ? (
                <img
                  className="np-artwork"
                  src={artwork}
                  alt="Album art"
                  onError={() => setArtworkFailed(true)}
                />
              ) : (
                <div className="np-artwork-placeholder">
                  <i className="fab fa-youtube" />
                </div>
              )}
            </div>
            <div className="np-cd-spindle">
              <div className="np-cd-center-hole" />
            </div>
          </div>
          <div className="np-cd-badge" aria-hidden="true">
            <i className="fab fa-youtube" />
          </div>
        </div>

        <div className="np-info-sleeve" id="np-info-sleeve">
          <button
            type="button"
            className="np-close-btn"
            aria-label="Dismiss Now Playing widget"
            title="Dismiss widget"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
          >
            <i className="fas fa-times" />
          </button>

          <div className="np-content">
            <div className="np-source-row">
              <span
                className={`np-source-badge${isYoutubeMusic ? ' np-source-ytm' : ''}`}
                aria-label="Music source"
              >
                <i className="fab fa-youtube np-source-icon" />
                <span>{isYoutubeMusic ? 'YT Music' : 'YouTube'}</span>
              </span>
              <div className="np-status-row">
                <div className="np-equalizer" aria-hidden="true">
                  <div className="np-eq-bar" />
                  <div className="np-eq-bar" />
                  <div className="np-eq-bar" />
                  <div className="np-eq-bar" />
                </div>
                <span className={`np-status-text ${statusClass}`}>{statusLabel}</span>
              </div>
            </div>

            <a
              className="np-title"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={offline ? 'Now Playing unavailable' : `Open: ${title}`}
              title={title}
              href={!offline && href ? href : undefined}
              style={{ pointerEvents: !offline && href ? 'auto' : 'none' }}
            >
              {title}
            </a>

            <div className="np-artist" title={artist}>
              {artist}
            </div>

            <div className="np-footer-row">
              <a
                className="np-yt-link"
                target="_blank"
                rel="noopener noreferrer"
                href={!offline && href ? href : undefined}
                style={{ display: !offline && href ? 'inline-flex' : 'none' }}
              >
                <span>Listen on YouTube</span> <i className="fas fa-arrow-up-right-from-square" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
