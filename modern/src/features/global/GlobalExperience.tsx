// Global experience host. Mounted once inside the shared layout so the dock,
// effects, characters, Now Playing widget, shortcuts dialog and toasts
// survive route changes without remounting or duplicate subscriptions.

import { useEffect, useRef, useState } from 'react';
import { useGlobalExperience } from './GlobalExperienceContext';
import { ClickRipple, GlobalEffects, ScrollExperience } from './GlobalEffects';
import { FloatingDock } from './FloatingDock';
import { CharacterCompanions } from './CharacterCompanions';
import { NowPlayingWidget } from './NowPlayingWidget';

function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const lastFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      lastFocused.current = document.activeElement;
      closeRef.current?.focus();
    } else if (lastFocused.current instanceof HTMLElement) {
      lastFocused.current.focus();
      lastFocused.current = null;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="shortcuts-overlay"
      id="shortcuts-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="shortcuts-card">
        <div className="shortcuts-head">
          <h3 id="shortcuts-title">
            <i className="fas fa-keyboard" aria-hidden="true" /> Keyboard shortcuts
          </h3>
          <button
            type="button"
            className="shortcuts-close"
            id="shortcuts-close"
            aria-label="Close shortcuts"
            ref={closeRef}
            onClick={onClose}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>
        <dl className="shortcuts-list">
          <div>
            <dt>
              <kbd>?</kbd>
            </dt>
            <dd>Open this shortcut list</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt</kbd> + <kbd>T</kbd>
            </dt>
            <dd>Open themes</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt</kbd> + <kbd>E</kbd>
            </dt>
            <dd>Open effects</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt</kbd> + <kbd>M</kbd>
            </dt>
            <dd>Toggle music pop-up</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt</kbd> + <kbd>Q</kbd>
            </dt>
            <dd>Toggle Quiet Mode</dd>
          </div>
          <div>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>Close the dock or this dialog</dd>
          </div>
        </dl>
        <p className="shortcuts-note">Shortcuts are ignored while typing in a form field.</p>
      </div>
    </div>
  );
}

function TensaMoon() {
  const { settings, toggleBloodMoon, pushToast } = useGlobalExperience();

  const activate = () => {
    if (settings.theme !== 'tensa-zangetsu') return;
    toggleBloodMoon();
    pushToast(
      settings.bloodMoon ? 'Blood Moon sealed.' : 'BANKAI! Tensa Zangetsu - Blood Moon Awakened!',
      settings.bloodMoon ? 'info' : 'success',
    );
  };

  return (
    <div
      id="tensa-moon"
      role="button"
      tabIndex={0}
      aria-label={
        settings.bloodMoon
          ? 'Blood Moon active - click to deactivate'
          : 'Tensa Zangetsu Moon - click to activate Blood Moon'
      }
      title={
        settings.bloodMoon
          ? 'Tensa Zangetsu - Blood Moon Active! Click to seal.'
          : 'Tensa Zangetsu - Click to awaken Blood Moon'
      }
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
    >
      <div className="moon-crescent" />
    </div>
  );
}

function ToastViewport() {
  const { toasts, dismissToast } = useGlobalExperience();

  return (
    <div className="toast-container" id="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.kind}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          onClick={() => dismissToast(toast.id)}
        >
          <i
            className={`fas toast-icon ${
              toast.kind === 'success'
                ? 'fa-check-circle'
                : toast.kind === 'error'
                  ? 'fa-exclamation-circle'
                  : 'fa-info-circle'
            }`}
            aria-hidden="true"
          />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

export function GlobalExperience() {
  const {
    activePopup,
    dockOpen,
    setActivePopup,
    setDockOpen,
    toggleMusic,
    toggleQuietMode,
  } = useGlobalExperience();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName || ''));

      if (event.key === 'Escape') {
        if (shortcutsOpen) {
          event.preventDefault();
          setShortcutsOpen(false);
          return;
        }
        if (activePopup) {
          setActivePopup(null);
          return;
        }
        if (dockOpen) setDockOpen(false);
        return;
      }

      if (typing || event.ctrlKey || event.metaKey) return;

      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }

      if (!event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 't') {
        event.preventDefault();
        setActivePopup(activePopup === 'themes' ? null : 'themes');
      } else if (key === 'e') {
        event.preventDefault();
        setActivePopup(activePopup === 'effects' ? null : 'effects');
      } else if (key === 'm') {
        event.preventDefault();
        toggleMusic();
      } else if (key === 'q') {
        event.preventDefault();
        toggleQuietMode();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    activePopup,
    dockOpen,
    shortcutsOpen,
    setActivePopup,
    setDockOpen,
    toggleMusic,
    toggleQuietMode,
  ]);

  return (
    <>
      <GlobalEffects />
      <TensaMoon />
      <ScrollExperience />
      <ClickRipple />
      <FloatingDock />
      <CharacterCompanions />
      <NowPlayingWidget />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastViewport />
    </>
  );
}
