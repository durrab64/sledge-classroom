// Floating quick-controls dock â€” faithful port of the legacy dock markup and
// interactions: hover/tap/keyboard expansion, anchored theme and effects
// popovers, presets, fine-tuning, Quiet Mode and the music pop-up toggle.

import { useCallback, useEffect, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type {
  AnimationLevel,
  AtmosphereMode,
  CardSetting,
  CharacterFrequency,
  CursorSetting,
  EffectIntensity,
  FontSetting,
  ParticleMode,
  ZanpakutoTheme,
} from '@/types';
import { useGlobalExperience } from './GlobalExperienceContext';
import { PRESET_NAMES, ZANPAKUTO_THEMES } from './visualSettings';

// Keyboard focus should hold the dock open, but a mouse click also focuses the
// clicked button. Only visible (keyboard-originated) focus keeps it open, so
// moving the pointer away after a click still closes the dock on schedule.
function keyboardFocusInside(shell: HTMLElement | null): boolean {
  const active = document.activeElement;
  if (!shell || !(active instanceof HTMLElement) || !shell.contains(active)) return false;
  try {
    return active.matches(':focus-visible');
  } catch {
    // Older engines without :focus-visible keep the conservative behavior.
    return true;
  }
}

const THEME_LABELS: Record<ZanpakutoTheme, string> = {
  default: 'Sledge Default',
  'getsuga-tensho': 'Getsuga Tensho',
  nozarashi: 'Nozarashi',
  senbonzakura: 'Senbonzakura',
  'kyoka-suigetsu': 'Kyoka Suigetsu',
  'tensa-zangetsu': 'Tensa Zangetsu',
  hogyoku: 'Hogyoku',
} as Record<ZanpakutoTheme, string>;

const SWATCH: Record<ZanpakutoTheme, string> = {
  default: 'swatch-default',
  'getsuga-tensho': 'swatch-getsuga',
  nozarashi: 'swatch-nozarashi',
  senbonzakura: 'swatch-senbonzakura',
  'kyoka-suigetsu': 'swatch-kyoka',
  'tensa-zangetsu': 'swatch-tensa',
  hogyoku: 'swatch-hogyoku',
} as Record<ZanpakutoTheme, string>;

const PRESET_LABELS: Record<(typeof PRESET_NAMES)[number], { name: string; hint: string }> = {
  classic: { name: 'Classic Sledge', hint: 'Black & gold' },
  anime: { name: 'Anime Dream', hint: 'Sakura & pink' },
  soul: { name: 'Soul Society', hint: 'Crimson rain' },
  golden: { name: 'Golden Hour', hint: 'Warm glow' },
  void: { name: 'Void Mode', hint: 'AMOLED dark' },
  hogyoku: { name: 'Hogyoku', hint: 'Awakened crystal' },
} as Record<(typeof PRESET_NAMES)[number], { name: string; hint: string }>;

const PARTICLE_ROWS: { mode: ParticleMode; label: string; icon: string }[] = [
  { mode: 'rain', label: 'Blood Rain', icon: 'fa-cloud-rain' },
  { mode: 'gold', label: 'Gold Dust', icon: 'fa-wand-magic-sparkles' },
  { mode: 'sakura', label: 'Sakura Petals', icon: 'fa-fan' },
  { mode: 'nozarashi', label: 'Nozarashi Flames', icon: 'fa-fire' },
  { mode: 'reiatsu', label: 'Reiatsu Embers', icon: 'fa-bolt' },
  { mode: 'starfield', label: 'Starfield', icon: 'fa-star' },
];

const ATMOSPHERE_ROWS: { mode: AtmosphereMode; label: string; icon: string }[] = [
  { mode: 'aurora', label: 'Aurora', icon: 'fa-wind' },
  { mode: 'mist', label: 'Ambient Mist', icon: 'fa-cloud' },
];

const INTENSITIES: EffectIntensity[] = ['subtle', 'medium', 'intense'];

function Toggle({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="dock-toggle">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="dock-toggle-slider" />
    </label>
  );
}

export function FloatingDock() {
  const {
    settings,
    systemReducedMotion,
    finePointer,
    activePopup,
    dockOpen,
    musicExpanded,
    setActivePopup,
    setDockOpen,
    selectTheme,
    selectPreset,
    setAccent,
    setFont,
    setCursor,
    setCards,
    setAnimation,
    setCharacterFrequency,
    setParticle,
    setAtmosphere,
    setIntensity,
    setCursorTrail,
    setSpotlight,
    setReducedMotion,
    toggleQuietMode,
    toggleBloodMoon,
    clearEffects,
    toggleMusic,
  } = useGlobalExperience();

  const shellRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const themePopupRef = useRef<HTMLDivElement | null>(null);
  const effectsPopupRef = useRef<HTMLDivElement | null>(null);
  const themeButtonRef = useRef<HTMLButtonElement | null>(null);
  const effectsButtonRef = useRef<HTMLButtonElement | null>(null);

  const locked = settings.quietMode || systemReducedMotion || settings.reducedMotion;
  const hoverRef = useRef(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
      : false,
  );

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerInsideRef = useRef(false);

  const setInert = (element: HTMLElement | null, inert: boolean) => {
    if (!element) return;
    (element as HTMLElement & { inert: boolean }).inert = inert;
  };

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // One timer owns the close grace period. Re-entering the trigger, the
  // expanded bar or a popover cancels it, so crossing the 10px gap between
  // them can never close the dock mid-move.
  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (pointerInsideRef.current) return;
      if (keyboardFocusInside(shellRef.current)) return;
      setActivePopup(null);
      setDockOpen(false);
    }, 400);
  }, [cancelScheduledClose, setActivePopup, setDockOpen]);

  useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose]);

  useEffect(() => {
    if (!dockOpen) cancelScheduledClose();
  }, [dockOpen, cancelScheduledClose]);

  useEffect(() => {
    setInert(dockRef.current, !dockOpen);
  }, [dockOpen]);

  useEffect(() => {
    setInert(themePopupRef.current, activePopup !== 'themes');
    setInert(effectsPopupRef.current, activePopup !== 'effects');
  }, [activePopup]);

  useEffect(() => {
    if (!activePopup) return;
    const popup = activePopup === 'themes' ? themePopupRef.current : effectsPopupRef.current;
    if (!popup) return;
    popup.scrollTop = 0;
    popup.focus({ preventScroll: true });
  }, [activePopup]);

  const closeAll = useCallback(
    (returnFocus = false) => {
      cancelScheduledClose();
      setActivePopup(null);
      setDockOpen(false);
      if (returnFocus) document.getElementById('dock-toggle')?.focus({ preventScroll: true });
    },
    [cancelScheduledClose, setActivePopup, setDockOpen],
  );

  useEffect(() => {
    if (!dockOpen) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (shellRef.current?.contains(event.target as Node)) return;
      closeAll();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeAll(true);
    };

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dockOpen, closeAll]);

  const openPopup = (popup: 'themes' | 'effects') => {
    const isOpen = activePopup === popup;
    setActivePopup(isOpen ? null : popup);
    setDockOpen(true);
    if (isOpen) {
      (popup === 'themes' ? themeButtonRef.current : effectsButtonRef.current)?.focus({
        preventScroll: true,
      });
    }
  };

  const onShellPointerEnter = () => {
    if (!hoverRef.current) return;
    pointerInsideRef.current = true;
    cancelScheduledClose();
    if (!dockOpen) setDockOpen(true);
  };

  const onShellPointerLeave = () => {
    if (!hoverRef.current) return;
    pointerInsideRef.current = false;
    if (!dockOpen) return;
    // Keyboard focus keeps the dock open regardless of pointer position.
    if (keyboardFocusInside(shellRef.current)) return;
    scheduleClose();
  };

  const onShellFocusCapture = () => {
    cancelScheduledClose();
  };

  const toggleDock = () => {
    if (dockOpen) {
      closeAll(true);
    } else {
      setDockOpen(true);
      requestAnimationFrame(() => {
        dockRef.current?.querySelector<HTMLButtonElement>('.dock-btn')?.focus({ preventScroll: true });
      });
    }
  };

  const onThemePopupKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(
      themePopupRef.current?.querySelectorAll<HTMLButtonElement>('.dock-theme-item') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    const next =
      event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next].focus();
  };

  const onIntensityKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const current = INTENSITIES.indexOf(settings.intensity);
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = (current + direction + INTENSITIES.length) % INTENSITIES.length;
    event.preventDefault();
    setIntensity(INTENSITIES[next]);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-intensity]');
    buttons[next]?.focus();
  };

  const onPreset = (name: (typeof PRESET_NAMES)[number]) => {
    selectPreset(name);
  };

  const anyEffectEnabled =
    !!settings.particle ||
    settings.cursorTrail ||
    settings.bloodMoon ||
    settings.characterPopups ||
    !!settings.atmosphere ||
    settings.spotlight;

  const effectsNote = systemReducedMotion
    ? 'Reduced motion is on in your system settings - particle effects are paused.'
    : settings.reducedMotion
      ? 'Reduced motion is on - particle effects are paused.'
      : settings.quietMode
        ? 'Quiet mode is on - effects are paused until you turn it off.'
        : settings.particle
          ? 'One particle layer runs at a time. Switching effects stops the previous one.'
          : '';

  const characterSelectValue: CharacterFrequency = settings.characterPopups
    ? settings.characterFrequency
    : 'off';

  return (
    <div
      id="dock-shell"
      ref={shellRef}
      className={dockOpen ? 'dock-open' : undefined}
      onPointerEnter={onShellPointerEnter}
      onPointerLeave={onShellPointerLeave}
      onFocusCapture={onShellFocusCapture}
    >
      <button
        className="dock-toggle-btn"
        type="button"
        id="dock-toggle"
        aria-label={dockOpen ? 'Close quick controls' : 'Open quick controls'}
        aria-expanded={dockOpen}
        aria-controls="sledge-dock"
        title={dockOpen ? 'Close quick controls' : 'Open quick controls'}
        onClick={toggleDock}
      >
        <i className={dockOpen ? 'fas fa-xmark' : 'fas fa-bolt'} aria-hidden="true" />
        <span className="dock-toggle-pulse" aria-hidden="true" />
      </button>

      <nav
        id="sledge-dock"
        ref={dockRef}
        aria-label="Quick controls dock"
        aria-hidden={!dockOpen}
      >
        <div
          id="dock-theme-popup"
          ref={themePopupRef}
          role="dialog"
          aria-label="Choose theme"
          aria-hidden={activePopup !== 'themes'}
          tabIndex={-1}
          className={activePopup === 'themes' ? 'open' : undefined}
          onKeyDown={onThemePopupKeyDown}
        >
          <h4>
            <i className="fas fa-palette" />Choose Theme
          </h4>

          <div className="dock-presets" id="dock-presets" role="group" aria-label="Appearance presets">
            <span className="dock-effect-heading">Presets</span>
            <div className="dock-preset-grid">
              {PRESET_NAMES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="dock-preset-btn"
                  data-preset={preset}
                  aria-pressed={settings.preset === preset}
                  onClick={() => onPreset(preset)}
                >
                  <span>{PRESET_LABELS[preset].name}</span>
                  <small>{PRESET_LABELS[preset].hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="dock-theme-list" role="group" aria-label="Available themes">
            {ZANPAKUTO_THEMES.map((theme) => (
              <button
                key={theme}
                className={`dock-theme-item${settings.theme === theme ? ' active-theme' : ''}`}
                type="button"
                data-dock-theme={theme}
                id={`dock-t-${theme}`}
                aria-current={settings.theme === theme ? 'true' : undefined}
                onClick={() => {
                  selectTheme(theme);
                  setActivePopup(null);
                  themeButtonRef.current?.focus({ preventScroll: true });
                }}
              >
                <span className={`dock-theme-swatch ${SWATCH[theme]}`} aria-hidden="true" />
                <span>{THEME_LABELS[theme]}</span>
                <i className="fas fa-check dock-check" aria-hidden="true" />
              </button>
            ))}
          </div>

          <details className="dock-customize" id="dock-customize">
            <summary>
              <i className="fas fa-sliders" aria-hidden="true" /> Fine-tune appearance
            </summary>
            <div className="dock-customize-body">
              <div className="dock-custom-row">
                <label htmlFor="custom-accent">Accent</label>
                <div className="dock-accent-picker">
                  <input
                    type="color"
                    id="custom-accent"
                    value={settings.accent ?? '#6366f1'}
                    aria-label="Custom accent color"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setAccent(event.target.value)}
                  />
                  <button
                    type="button"
                    id="reset-accent"
                    className="dock-mini-btn"
                    onClick={() => setAccent(null)}
                  >
                    Theme
                  </button>
                </div>
              </div>

              <div className="dock-custom-row">
                <label htmlFor="custom-font">Font</label>
                <select
                  id="custom-font"
                  value={settings.font}
                  onChange={(event) => setFont(event.target.value as FontSetting)}
                >
                  <option value="site">Site default (Inter)</option>
                  <option value="inter">Inter</option>
                  <option value="poppins">Poppins</option>
                  <option value="outfit">Outfit</option>
                </select>
              </div>

              <div className="dock-custom-row">
                <label htmlFor="custom-cursor">Cursor</label>
                <select
                  id="custom-cursor"
                  value={settings.cursor}
                  onChange={(event) => setCursor(event.target.value as CursorSetting)}
                >
                  <option value="theme">Zanpakuto cursor</option>
                  <option value="system">System cursor</option>
                </select>
              </div>

              <div className="dock-custom-row">
                <label htmlFor="custom-animation">Animation</label>
                <select
                  id="custom-animation"
                  value={settings.animation}
                  onChange={(event) => setAnimation(event.target.value as AnimationLevel)}
                >
                  <option value="off">Off</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="dock-custom-row">
                <label htmlFor="custom-cards">Cards</label>
                <select
                  id="custom-cards"
                  value={settings.cards}
                  onChange={(event) => setCards(event.target.value as CardSetting)}
                >
                  <option value="original">Original</option>
                  <option value="glass">Glass</option>
                  <option value="glow">Subtle glow</option>
                </select>
              </div>

              <div className="dock-custom-row">
                <label htmlFor="character-frequency">Characters</label>
                <select
                  id="character-frequency"
                  value={characterSelectValue}
                  onChange={(event) => setCharacterFrequency(event.target.value as CharacterFrequency)}
                >
                  <option value="off">Off</option>
                  <option value="rare">Rare</option>
                  <option value="normal">Normal</option>
                  <option value="frequent">Frequent</option>
                </select>
              </div>

              <p className="dock-custom-hint">
                Optional overrides. Your theme stays in charge of the base look.
              </p>
              <button
                type="button"
                id="reset-customization"
                className="dock-clear-btn dock-reset-btn"
                onClick={() => {
                  setAccent(null);
                  setFont('site');
                  setCursor('theme');
                  setCards('original');
                  setAnimation('medium');
                  setCharacterFrequency('normal');
                  setSpotlight(true);
                }}
              >
                <i className="fas fa-rotate-left" aria-hidden="true" /> Reset overrides
              </button>
            </div>
          </details>
        </div>

        <div
          id="dock-effects-popup"
          ref={effectsPopupRef}
          role="dialog"
          aria-label="Visual effects"
          aria-hidden={activePopup !== 'effects'}
          tabIndex={-1}
          className={activePopup === 'effects' ? 'open' : undefined}
        >
          <h4>
            <i className="fas fa-wand-magic-sparkles" />Visual Effects
          </h4>
          <div id="dock-effects-list">
            <div className="dock-effects-note" id="dock-effects-note" hidden={!effectsNote}>
              {effectsNote}
            </div>

            <div className="dock-effect-section">
              <span className="dock-effect-heading">
                Particles <em>one at a time</em>
              </span>
              {PARTICLE_ROWS.map((row) => (
                <div className="dock-effect-row" key={row.mode}>
                  <label className="dock-effect-label" htmlFor={`toggle-${row.mode}`}>
                    <i className={`fas ${row.icon}`} aria-hidden="true" />
                    {row.label}
                  </label>
                  <Toggle
                    id={`toggle-${row.mode}`}
                    checked={settings.particle === row.mode}
                    disabled={locked}
                    onChange={(checked) => setParticle(checked ? row.mode : null)}
                  />
                </div>
              ))}
            </div>

            <div className="dock-effect-section">
              <span className="dock-effect-heading">
                Atmosphere <em>one at a time</em>
              </span>
              {ATMOSPHERE_ROWS.map((row) => (
                <div className="dock-effect-row" key={row.mode}>
                  <label className="dock-effect-label" htmlFor={`toggle-${row.mode}`}>
                    <i className={`fas ${row.icon}`} aria-hidden="true" />
                    {row.label}
                  </label>
                  <Toggle
                    id={`toggle-${row.mode}`}
                    checked={settings.atmosphere === row.mode}
                    disabled={locked}
                    onChange={(checked) => setAtmosphere(checked ? row.mode : null)}
                  />
                </div>
              ))}
            </div>

            <div className="dock-effect-section">
              <span className="dock-effect-heading">Comfort</span>
              <div className="dock-effect-row" id="effect-row-spotlight" hidden={!finePointer}>
                <label className="dock-effect-label" htmlFor="toggle-spotlight">
                  <i className="fas fa-circle-dot" aria-hidden="true" /> Cursor Spotlight
                </label>
                <Toggle
                  id="toggle-spotlight"
                  checked={settings.spotlight}
                  disabled={locked || !finePointer}
                  onChange={setSpotlight}
                />
              </div>
              <div className="dock-effect-row" id="effect-row-cursor" hidden={!finePointer}>
                <label className="dock-effect-label" htmlFor="toggle-cursor-trail">
                  <i className="fas fa-arrow-pointer" aria-hidden="true" /> Cursor Trail
                </label>
                <Toggle
                  id="toggle-cursor-trail"
                  checked={settings.cursorTrail}
                  disabled={locked || !finePointer}
                  onChange={setCursorTrail}
                />
              </div>
              <div className="dock-effect-row">
                <label className="dock-effect-label" htmlFor="toggle-reduced">
                  <i className="fas fa-circle-pause" aria-hidden="true" /> Reduced motion
                </label>
                <Toggle
                  id="toggle-reduced"
                  checked={settings.reducedMotion || systemReducedMotion}
                  disabled={systemReducedMotion}
                  onChange={setReducedMotion}
                />
              </div>
            </div>

            <div className="dock-effect-section">
              <span className="dock-effect-heading">Theme extras</span>
              <div
                className="dock-effect-row"
                id="effect-row-bloodmoon"
                hidden={settings.theme !== 'tensa-zangetsu'}
              >
                <label className="dock-effect-label" htmlFor="toggle-bloodmoon">
                  <i className="fas fa-moon" aria-hidden="true" /> Blood Moon Mode
                </label>
                <Toggle
                  id="toggle-bloodmoon"
                  checked={settings.bloodMoon}
                  disabled={settings.theme !== 'tensa-zangetsu' || locked}
                  onChange={toggleBloodMoon}
                />
              </div>
              <div className="dock-effect-row" id="effect-row-chars">
                <label className="dock-effect-label" htmlFor="toggle-chars">
                  <i className="fas fa-ghost" aria-hidden="true" /> Character Pop-ups
                </label>
                <Toggle
                  id="toggle-chars"
                  checked={settings.characterPopups}
                  disabled={locked || settings.characterFrequency === 'off'}
                  onChange={(checked) => setCharacterFrequency(checked ? 'normal' : 'off')}
                />
              </div>
            </div>

            <div className="dock-intensity-block">
              <span className="dock-effect-heading" id="dock-intensity-label">
                Particle intensity
              </span>
              <div
                className="dock-intensity"
                role="radiogroup"
                aria-labelledby="dock-intensity-label"
                onKeyDown={onIntensityKeyDown}
              >
                {INTENSITIES.map((intensity) => (
                  <button
                    key={intensity}
                    type="button"
                    role="radio"
                    aria-checked={settings.intensity === intensity}
                    data-intensity={intensity}
                    onClick={() => setIntensity(intensity)}
                  >
                    {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              id="dock-clear-effects"
              className="dock-clear-btn"
              disabled={!anyEffectEnabled}
              onClick={clearEffects}
            >
              <i className="fas fa-broom" aria-hidden="true" /> Clear all effects
            </button>
          </div>
        </div>

        <div className="dock-actions">
          <button
            className="dock-btn"
            type="button"
            id="dock-themes"
            ref={themeButtonRef}
            aria-label="Change theme"
            aria-haspopup="dialog"
            aria-controls="dock-theme-popup"
            aria-expanded={activePopup === 'themes'}
            title="Change theme"
            onClick={() => openPopup('themes')}
          >
            <i className="fas fa-palette" aria-hidden="true" />
            <span className="dock-label">Themes</span>
          </button>

          <button
            className="dock-btn"
            type="button"
            id="dock-effects"
            ref={effectsButtonRef}
            aria-label="Visual effects"
            aria-haspopup="dialog"
            aria-controls="dock-effects-popup"
            aria-expanded={activePopup === 'effects'}
            title="Visual effects"
            onClick={() => openPopup('effects')}
          >
            <i className="fas fa-wand-magic-sparkles" aria-hidden="true" />
            <span className="dock-label">Effects</span>
          </button>

          <button
            className={`dock-btn${musicExpanded ? ' dock-active' : ''}`}
            type="button"
            id="dock-music"
            aria-label="Show or hide music pop-up"
            aria-haspopup="dialog"
            aria-controls="now-playing-widget"
            aria-pressed={musicExpanded}
            title="Show or hide music pop-up"
            onClick={() => {
              setActivePopup(null);
              toggleMusic();
            }}
          >
            <i className="fas fa-music" aria-hidden="true" />
            <span className="dock-label">Music</span>
          </button>

          <button
            className={`dock-btn${settings.quietMode ? ' dock-active' : ''}`}
            type="button"
            id="dock-quiet"
            aria-label={
              settings.quietMode
                ? 'Quiet mode is on - click to restore decorative effects'
                : 'Quiet mode: hide decorative pop-ups and effects'
            }
            aria-pressed={settings.quietMode}
            title={
              settings.quietMode
                ? 'Quiet mode is on - click to restore decorative effects'
                : 'Quiet mode: hide decorative pop-ups and effects'
            }
            onClick={toggleQuietMode}
          >
            <i className={settings.quietMode ? 'fas fa-eye' : 'fas fa-eye-slash'} aria-hidden="true" />
            <span className="dock-label">Quiet</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
