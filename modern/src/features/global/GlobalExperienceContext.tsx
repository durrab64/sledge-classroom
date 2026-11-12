// Single global experience provider.
//
// Owns theme/font/customization preferences, Quiet Mode, effects
// preferences, dock popup state, the Now Playing subscription and toasts.
// Every global surface (navbar, dock, effects, characters, music widget)
// reads this one source of truth, so state never duplicates between routes.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type {
  AnimationLevel,
  AtmosphereMode,
  CardSetting,
  CharacterFrequency,
  ColorMode,
  CursorSetting,
  DockPopup,
  EffectIntensity,
  FontSetting,
  NowPlaying,
  ParticleMode,
  ZanpakutoTheme,
} from '@/types';
import { nowPlayingRepository } from '@/services/repositories';
import type { NowPlayingRepository } from '@/services/repositories';
import {
  applyPresetSettings,
  applyVisualSettings,
  clearPresetStorage,
  decorativeEffectsAllowed,
  isFinePointer,
  persistSettings,
  preferredReducedMotion,
  readVisualSettings,
  resolveAccent,
  THEME_SIGNATURE_EFFECTS,
  VISUAL_PRESETS,
  type PresetName,
  type VisualSettings,
} from './visualSettings';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  readonly id: number;
  readonly message: string;
  readonly kind: ToastKind;
}

export interface GlobalExperienceValue {
  readonly settings: VisualSettings;
  readonly systemReducedMotion: boolean;
  readonly decorativeAllowed: boolean;
  readonly finePointer: boolean;
  readonly accent: { color: string; rgb: string };
  readonly activePopup: DockPopup;
  readonly dockOpen: boolean;
  readonly nowPlaying: NowPlaying | null;
  readonly nowPlayingError: string | null;
  readonly musicExpanded: boolean;
  readonly musicDismissed: boolean;
  readonly toasts: readonly ToastMessage[];
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
  selectTheme: (theme: ZanpakutoTheme) => void;
  selectPreset: (name: PresetName) => void;
  setAccent: (accent: string | null) => void;
  setFont: (font: FontSetting) => void;
  setCursor: (cursor: CursorSetting) => void;
  setCards: (cards: CardSetting) => void;
  setAnimation: (animation: AnimationLevel) => void;
  setCharacterFrequency: (frequency: CharacterFrequency) => void;
  setCharacterPopups: (enabled: boolean) => void;
  setParticle: (particle: ParticleMode | null) => void;
  setAtmosphere: (atmosphere: AtmosphereMode | null) => void;
  setIntensity: (intensity: EffectIntensity) => void;
  setCursorTrail: (enabled: boolean) => void;
  setSpotlight: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setQuietMode: (enabled: boolean) => void;
  toggleQuietMode: () => void;
  toggleBloodMoon: () => void;
  clearEffects: () => void;
  setActivePopup: (popup: DockPopup) => void;
  setDockOpen: (open: boolean) => void;
  setMusicExpanded: (expanded: boolean) => void;
  toggleMusic: () => void;
  dismissMusic: () => void;
  pushToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
}

const GlobalExperienceContext = createContext<GlobalExperienceValue | null>(null);

export function useGlobalExperience(): GlobalExperienceValue {
  const context = useContext(GlobalExperienceContext);
  if (!context) {
    throw new Error('useGlobalExperience must be used within a GlobalExperienceProvider');
  }
  return context;
}

interface GlobalExperienceProviderProps {
  children: ReactNode;
  /** Test seam: supply a mocked repository without touching Firebase. */
  nowPlayingReader?: Pick<NowPlayingRepository, 'subscribeNowPlaying'>;
  /** Test seam: force the system reduced-motion preference. */
  systemReducedMotionOverride?: boolean;
  /** Test seam: initial preferences. */
  initialSettings?: VisualSettings;
}

export function GlobalExperienceProvider({
  children,
  nowPlayingReader = nowPlayingRepository,
  systemReducedMotionOverride,
  initialSettings,
}: GlobalExperienceProviderProps) {
  const [settings, setSettings] = useState<VisualSettings>(
    () => initialSettings ?? readVisualSettings(),
  );
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(
    () => systemReducedMotionOverride ?? preferredReducedMotion(),
  );
  const [finePointer, setFinePointer] = useState(() => isFinePointer());
  const [activePopup, setActivePopupState] = useState<DockPopup>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [nowPlayingError, setNowPlayingError] = useState<string | null>(null);
  const [musicExpanded, setMusicExpandedState] = useState(false);
  const [musicDismissed, setMusicDismissedState] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toastId = useRef(0);
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const update = useCallback((patch: Partial<VisualSettings>, persist = true) => {
    if (persist) persistSettings(patch);
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  // Apply preferences to the document on every change (and before paint).
  useLayoutEffect(() => {
    applyVisualSettings(settings, systemReducedMotion);
  }, [settings, systemReducedMotion]);

  // System reduced motion is a separate preference from Quiet Mode.
  useEffect(() => {
    if (systemReducedMotionOverride !== undefined) return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    setSystemReducedMotion(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, [systemReducedMotionOverride]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(pointer: fine)');
    const onChange = () => setFinePointer(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  // One RTDB subscription for the entire application; cleaned up on unmount.
  useEffect(() => {
    const unsubscribe = nowPlayingReader.subscribeNowPlaying(
      (data) => {
        setNowPlaying(data);
        setNowPlayingError(null);
      },
      (error) => {
        setNowPlaying(null);
        setNowPlayingError(error.message);
      },
    );
    return unsubscribe;
  }, [nowPlayingReader]);

  // Resume expired/rejected subscriptions without duplicating them.
  const pushToast = useCallback((message: string, kind: ToastKind = 'info') => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((current) => [...current, { id, message, kind }]);
    const timer = setTimeout(() => {
      toastTimers.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
    toastTimers.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const setActivePopup = useCallback((popup: DockPopup) => {
    setActivePopupState(popup);
    if (popup) setDockOpen(true);
  }, []);

  const setMode = useCallback(
    (mode: ColorMode) => update({ mode }),
    [update],
  );

  const toggleMode = useCallback(() => {
    setSettings((current) => {
      const mode: ColorMode = current.mode === 'light' ? 'dark' : 'light';
      persistSettings({ mode });
      return { ...current, mode };
    });
  }, []);

  const selectTheme = useCallback(
    (theme: ZanpakutoTheme) => {
      const patch: Partial<VisualSettings> = {
        theme,
        preset: null,
        look: null,
        bloodMoon: false,
        particle: THEME_SIGNATURE_EFFECTS[theme],
        // Hogyoku is a dark-first cinematic theme in the legacy app.
        ...(theme === 'hogyoku' ? { mode: 'dark' as const } : {}),
      };
      clearPresetStorage();
      update(patch);
      pushToast(
        theme === 'default'
          ? 'Zanpakuto spiritual pressure sealed (Default Theme).'
          : `Awakened: ${theme.replace(/-/g, ' ')}!`,
        theme === 'default' ? 'info' : 'success',
      );
    },
    [pushToast, update],
  );

  const selectPreset = useCallback(
    (name: PresetName) => {
      const patch = applyPresetSettings(name);
      update(patch);
      pushToast(`Preset applied: ${VISUAL_PRESETS[name].label}.`, 'success');
    },
    [pushToast, update],
  );

  const setAccent = useCallback(
    (accent: string | null) => {
      update({ accent });
      clearPresetStorage();
    },
    [update],
  );

  const setFont = useCallback((font: FontSetting) => update({ font }), [update]);
  const setCursor = useCallback((cursor: CursorSetting) => update({ cursor }), [update]);
  const setCards = useCallback((cards: CardSetting) => update({ cards }), [update]);
  const setAnimation = useCallback((animation: AnimationLevel) => update({ animation }), [update]);

  const setCharacterFrequency = useCallback(
    (characterFrequency: CharacterFrequency) =>
      update({ characterFrequency, characterPopups: characterFrequency !== 'off' }),
    [update],
  );

  const setCharacterPopups = useCallback(
    (enabled: boolean) =>
      update({
        characterPopups: enabled,
        characterFrequency: enabled ? 'normal' : 'off',
      }),
    [update],
  );

  const setParticle = useCallback((particle: ParticleMode | null) => update({ particle }), [update]);
  const setAtmosphere = useCallback(
    (atmosphere: AtmosphereMode | null) => update({ atmosphere }),
    [update],
  );
  const setIntensity = useCallback((intensity: EffectIntensity) => update({ intensity }), [update]);
  const setCursorTrail = useCallback(
    (cursorTrail: boolean) => update({ cursorTrail: cursorTrail && finePointer }),
    [finePointer, update],
  );
  const setSpotlight = useCallback(
    (spotlight: boolean) => update({ spotlight: spotlight && finePointer }),
    [finePointer, update],
  );
  const setReducedMotion = useCallback(
    (reducedMotion: boolean) => update({ reducedMotion }),
    [update],
  );
  const setQuietMode = useCallback((quietMode: boolean) => update({ quietMode }), [update]);
  const toggleQuietMode = useCallback(() => {
    setSettings((current) => {
      const quietMode = !current.quietMode;
      persistSettings({ quietMode });
      return { ...current, quietMode };
    });
  }, []);
  const toggleBloodMoon = useCallback(() => {
    setSettings((current) => {
      if (current.theme !== 'tensa-zangetsu') return current;
      return { ...current, bloodMoon: !current.bloodMoon };
    });
  }, []);

  const clearEffects = useCallback(() => {
    update({
      particle: null,
      cursorTrail: false,
      atmosphere: null,
      spotlight: false,
      characterPopups: false,
      characterFrequency: 'off',
      bloodMoon: false,
    });
    pushToast('All decorative effects cleared.', 'info');
  }, [pushToast, update]);

  const setMusicExpanded = useCallback((expanded: boolean) => {
    setMusicExpandedState(expanded);
    if (expanded) setMusicDismissedState(false);
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicExpandedState((expanded) => {
      if (expanded) {
        setMusicDismissedState(true);
        return false;
      }
      setMusicDismissedState(false);
      return true;
    });
  }, []);

  const dismissMusic = useCallback(() => {
    setMusicExpandedState(false);
    setMusicDismissedState(true);
  }, []);

  const decorativeAllowed = decorativeEffectsAllowed(settings, systemReducedMotion);
  const accent = resolveAccent(settings);

  const value = useMemo<GlobalExperienceValue>(
    () => ({
      settings,
      systemReducedMotion,
      decorativeAllowed,
      finePointer,
      accent,
      activePopup,
      dockOpen,
      nowPlaying,
      nowPlayingError,
      musicExpanded,
      musicDismissed,
      toasts,
      setMode,
      toggleMode,
      selectTheme,
      selectPreset,
      setAccent,
      setFont,
      setCursor,
      setCards,
      setAnimation,
      setCharacterFrequency,
      setCharacterPopups,
      setParticle,
      setAtmosphere,
      setIntensity,
      setCursorTrail,
      setSpotlight,
      setReducedMotion,
      setQuietMode,
      toggleQuietMode,
      toggleBloodMoon,
      clearEffects,
      setActivePopup,
      setDockOpen,
      setMusicExpanded,
      toggleMusic,
      dismissMusic,
      pushToast,
      dismissToast,
    }),
    [
      settings,
      systemReducedMotion,
      decorativeAllowed,
      finePointer,
      accent,
      activePopup,
      dockOpen,
      nowPlaying,
      nowPlayingError,
      musicExpanded,
      musicDismissed,
      toasts,
      setMode,
      toggleMode,
      selectTheme,
      selectPreset,
      setAccent,
      setFont,
      setCursor,
      setCards,
      setAnimation,
      setCharacterFrequency,
      setCharacterPopups,
      setParticle,
      setAtmosphere,
      setIntensity,
      setCursorTrail,
      setSpotlight,
      setReducedMotion,
      setQuietMode,
      toggleQuietMode,
      toggleBloodMoon,
      clearEffects,
      setActivePopup,
      setMusicExpanded,
      toggleMusic,
      dismissMusic,
      pushToast,
      dismissToast,
    ],
  );

  return (
    <GlobalExperienceContext.Provider value={value}>
      {children}
    </GlobalExperienceContext.Provider>
  );
}

export { GlobalExperienceContext };
