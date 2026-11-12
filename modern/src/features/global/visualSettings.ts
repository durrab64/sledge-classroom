// Global visual settings model.
//
// Mirrors the legacy visitor preferences exactly (localStorage keys and
// attribute values). The legacy implementation is the source of truth; this
// module contains no new themes, presets, characters, or visual language.

import type {
  AnimationLevel,
  AtmosphereMode,
  CardSetting,
  CharacterFrequency,
  ColorMode,
  CursorSetting,
  EffectIntensity,
  FontSetting,
  LookMode,
  ParticleMode,
  ZanpakutoTheme,
} from '@/types';

export const STORAGE_KEYS = {
  mode: 'theme',
  zanpakuto: 'zanpakuto_theme',
  accent: 'sledge_accent',
  font: 'sledge_font',
  cursor: 'sledge_cursor',
  cards: 'sledge_cards',
  animation: 'sledge_animation',
  characterFrequency: 'sledge_character_freq',
  characterPopups: 'character_popups',
  particle: 'effect_particle',
  legacySakura: 'effect_sakura',
  legacyNozarashi: 'effect_nozarashi',
  legacyReiatsu: 'effect_reiatsu',
  atmosphere: 'effect_atmosphere',
  intensity: 'effect_intensity',
  cursorTrail: 'effect_cursor_trail',
  spotlight: 'sledge_spotlight',
  reducedMotion: 'effects_reduced_motion',
  quietMode: 'quiet_mode',
  preset: 'sledge_preset',
} as const;

export const COLOR_MODES: readonly ColorMode[] = ['light', 'dark'];

export const ZANPAKUTO_THEMES: readonly ZanpakutoTheme[] = [
  'default',
  'getsuga-tensho',
  'nozarashi',
  'senbonzakura',
  'kyoka-suigetsu',
  'tensa-zangetsu',
  'hogyoku',
];

export const PARTICLE_MODES: readonly ParticleMode[] = [
  'rain',
  'gold',
  'sakura',
  'nozarashi',
  'reiatsu',
  'starfield',
];

export const ATMOSPHERE_MODES: readonly AtmosphereMode[] = ['aurora', 'mist'];
export const EFFECT_INTENSITIES: readonly EffectIntensity[] = ['subtle', 'medium', 'intense'];
export const ANIMATION_LEVELS: readonly AnimationLevel[] = ['off', 'low', 'medium', 'high'];
export const CHARACTER_FREQUENCIES: readonly CharacterFrequency[] = [
  'off',
  'rare',
  'normal',
  'frequent',
];
export const FONT_SETTINGS: readonly FontSetting[] = ['site', 'inter', 'poppins', 'outfit'];
export const CARD_SETTINGS: readonly CardSetting[] = ['original', 'glass', 'glow'];
export const CURSOR_SETTINGS: readonly CursorSetting[] = ['theme', 'system'];
export const PRESET_NAMES = ['classic', 'anime', 'soul', 'golden', 'void', 'hogyoku'] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

export interface VisualSettings {
  readonly mode: ColorMode;
  readonly theme: ZanpakutoTheme;
  readonly accent: string | null;
  readonly font: FontSetting;
  readonly cursor: CursorSetting;
  readonly cards: CardSetting;
  readonly animation: AnimationLevel;
  readonly particle: ParticleMode | null;
  readonly atmosphere: AtmosphereMode | null;
  readonly intensity: EffectIntensity;
  readonly characterFrequency: CharacterFrequency;
  readonly characterPopups: boolean;
  readonly cursorTrail: boolean;
  readonly spotlight: boolean;
  readonly reducedMotion: boolean;
  readonly quietMode: boolean;
  readonly bloodMoon: boolean;
  readonly preset: PresetName | null;
  readonly look: LookMode | null;
}

export interface VisualPreset {
  readonly label: string;
  readonly theme: ZanpakutoTheme;
  readonly mode: ColorMode;
  readonly look: LookMode | null;
  readonly particle: ParticleMode | null;
  readonly atmosphere: AtmosphereMode | null;
  readonly intensity: EffectIntensity;
  readonly accent: string | null;
  readonly font: FontSetting;
  readonly cursor: CursorSetting;
  readonly animation: AnimationLevel;
  readonly cards: CardSetting;
  readonly characters: CharacterFrequency;
}

// Verbatim legacy appearance presets (app.js VISUAL_PRESETS).
export const VISUAL_PRESETS: Record<PresetName, VisualPreset> = {
  classic: {
    label: 'Classic Sledge',
    theme: 'default',
    mode: 'dark',
    look: null,
    particle: 'gold',
    atmosphere: null,
    intensity: 'subtle',
    accent: '#eab308',
    font: 'site',
    cursor: 'theme',
    animation: 'low',
    cards: 'original',
    characters: 'rare',
  },
  anime: {
    label: 'Anime Dream',
    theme: 'senbonzakura',
    mode: 'light',
    look: null,
    particle: 'sakura',
    atmosphere: null,
    intensity: 'medium',
    accent: '#ec4899',
    font: 'poppins',
    cursor: 'theme',
    animation: 'medium',
    cards: 'glass',
    characters: 'normal',
  },
  soul: {
    label: 'Soul Society',
    theme: 'tensa-zangetsu',
    mode: 'dark',
    look: null,
    particle: 'rain',
    atmosphere: 'mist',
    intensity: 'medium',
    accent: '#ef4444',
    font: 'site',
    cursor: 'theme',
    animation: 'medium',
    cards: 'original',
    characters: 'rare',
  },
  golden: {
    label: 'Golden Hour',
    theme: 'nozarashi',
    mode: 'dark',
    look: null,
    particle: 'gold',
    atmosphere: 'aurora',
    intensity: 'medium',
    accent: '#f59e0b',
    font: 'outfit',
    cursor: 'theme',
    animation: 'medium',
    cards: 'glow',
    characters: 'normal',
  },
  void: {
    label: 'Void Mode',
    theme: 'default',
    mode: 'dark',
    look: 'void',
    particle: 'starfield',
    atmosphere: null,
    intensity: 'subtle',
    accent: '#a3a3a3',
    font: 'outfit',
    cursor: 'theme',
    animation: 'low',
    cards: 'original',
    characters: 'rare',
  },
  hogyoku: {
    label: 'Hogyoku Awakening',
    theme: 'hogyoku',
    mode: 'dark',
    look: null,
    particle: null,
    atmosphere: null,
    intensity: 'subtle',
    accent: '#c084fc',
    font: 'outfit',
    cursor: 'theme',
    animation: 'low',
    cards: 'original',
    characters: 'rare',
  },
};

// Clicking a Zanpakuto theme in the dock awakens its signature effect.
export const THEME_SIGNATURE_EFFECTS: Record<ZanpakutoTheme, ParticleMode | null> = {
  default: null,
  'getsuga-tensho': 'gold',
  nozarashi: 'nozarashi',
  senbonzakura: 'sakura',
  'kyoka-suigetsu': 'reiatsu',
  'tensa-zangetsu': 'rain',
  hogyoku: null,
};

export const FONT_STACKS: Record<FontSetting, string> = {
  site: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  poppins: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  outfit: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// Accent values match the legacy dock accent for each Zanpakuto theme.
export const THEME_ACCENTS: Record<ZanpakutoTheme, { color: string; rgb: string }> = {
  default: { color: '#3b82f6', rgb: '59, 130, 246' },
  'getsuga-tensho': { color: '#f8fafc', rgb: '248, 250, 252' },
  nozarashi: { color: '#eab308', rgb: '234, 179, 8' },
  senbonzakura: { color: '#ec4899', rgb: '236, 72, 153' },
  'kyoka-suigetsu': { color: '#a855f7', rgb: '168, 85, 247' },
  'tensa-zangetsu': { color: '#ef4444', rgb: '239, 68, 68' },
  hogyoku: { color: '#c084fc', rgb: '192, 132, 252' },
};

export const BLOOD_MOON_ACCENT = { color: '#ff1e27', rgb: '255, 30, 39' };

const AMBIENT_OPACITY: Record<EffectIntensity, string> = {
  subtle: '0.28',
  medium: '0.46',
  intense: '0.64',
};

export function animationScale(level: AnimationLevel): number {
  if (level === 'off') return 0;
  if (level === 'low') return 0.68;
  if (level === 'high') return 1.22;
  return 1;
}

export function isZanpakutoTheme(value: unknown): value is ZanpakutoTheme {
  return typeof value === 'string' && (ZANPAKUTO_THEMES as readonly string[]).includes(value);
}

export function isParticleMode(value: unknown): value is ParticleMode {
  return typeof value === 'string' && (PARTICLE_MODES as readonly string[]).includes(value);
}

export function isAtmosphereMode(value: unknown): value is AtmosphereMode {
  return typeof value === 'string' && (ATMOSPHERE_MODES as readonly string[]).includes(value);
}

export function isPresetName(value: unknown): value is PresetName {
  return typeof value === 'string' && (PRESET_NAMES as readonly string[]).includes(value);
}

export function normalizeHex(value: unknown): string | null {
  const hex = typeof value === 'string' ? value.trim() : '';
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
}

export function hexToRgbString(hex: string): string {
  const normalized = normalizeHex(hex);
  if (!normalized) return '59, 130, 246';
  const numeric = Number.parseInt(normalized.slice(1), 16);
  return `${(numeric >> 16) & 255}, ${(numeric >> 8) & 255}, ${numeric & 255}`;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    const store = storage();
    if (!store) return;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    /* storage can be unavailable in private mode; preferences stay in memory */
  }
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function readVisualSettings(): VisualSettings {
  const mode = oneOf(read(STORAGE_KEYS.mode), COLOR_MODES, 'light');
  const storedTheme = read(STORAGE_KEYS.zanpakuto);
  const theme = isZanpakutoTheme(storedTheme) && storedTheme !== 'default' ? storedTheme : 'default';

  const storedParticle = read(STORAGE_KEYS.particle);
  let particle: ParticleMode | null = null;
  if (storedParticle !== null) {
    particle = isParticleMode(storedParticle) ? storedParticle : null;
  } else if (theme === 'senbonzakura' && read(STORAGE_KEYS.legacySakura) !== 'false') {
    // Legacy migration path from the pre-dock effect keys.
    particle = 'sakura';
  } else if (theme === 'nozarashi' && read(STORAGE_KEYS.legacyNozarashi) !== 'false') {
    particle = 'nozarashi';
  } else if (theme === 'tensa-zangetsu' && read(STORAGE_KEYS.legacyReiatsu) !== 'false') {
    particle = 'reiatsu';
  }

  const storedAtmosphere = read(STORAGE_KEYS.atmosphere);
  const storedPreset = read(STORAGE_KEYS.preset);
  const preset = isPresetName(storedPreset) ? storedPreset : null;
  const characterPopups = read(STORAGE_KEYS.characterPopups) !== 'false';

  return {
    mode,
    theme,
    accent: normalizeHex(read(STORAGE_KEYS.accent)),
    font: oneOf(read(STORAGE_KEYS.font), FONT_SETTINGS, 'site'),
    cursor: oneOf(read(STORAGE_KEYS.cursor), CURSOR_SETTINGS, 'theme'),
    cards: oneOf(read(STORAGE_KEYS.cards), CARD_SETTINGS, 'original'),
    animation: oneOf(read(STORAGE_KEYS.animation), ANIMATION_LEVELS, 'medium'),
    particle,
    atmosphere: isAtmosphereMode(storedAtmosphere) ? storedAtmosphere : null,
    intensity: oneOf(read(STORAGE_KEYS.intensity), EFFECT_INTENSITIES, 'medium'),
    characterFrequency: oneOf(read(STORAGE_KEYS.characterFrequency), CHARACTER_FREQUENCIES, 'normal'),
    characterPopups,
    cursorTrail: read(STORAGE_KEYS.cursorTrail) === 'true',
    spotlight: read(STORAGE_KEYS.spotlight) === 'true',
    reducedMotion: read(STORAGE_KEYS.reducedMotion) === 'true',
    quietMode: read(STORAGE_KEYS.quietMode) === 'true',
    bloodMoon: false,
    preset,
    look: preset === 'void' ? 'void' : null,
  };
}

function persist(key: string, value: string | null): void {
  write(key, value);
}

/** Persist a single settings patch using the exact legacy storage keys. */
export function persistSettings(patch: Partial<VisualSettings>): void {
  if ('mode' in patch && patch.mode) persist(STORAGE_KEYS.mode, patch.mode);
  if ('theme' in patch) {
    persist(STORAGE_KEYS.zanpakuto, patch.theme && patch.theme !== 'default' ? patch.theme : null);
  }
  if ('accent' in patch) persist(STORAGE_KEYS.accent, patch.accent ?? null);
  if ('font' in patch) persist(STORAGE_KEYS.font, patch.font === 'site' ? null : patch.font ?? null);
  if ('cursor' in patch) persist(STORAGE_KEYS.cursor, patch.cursor === 'theme' ? null : patch.cursor ?? null);
  if ('cards' in patch) persist(STORAGE_KEYS.cards, patch.cards === 'original' ? null : patch.cards ?? null);
  if ('animation' in patch) {
    persist(STORAGE_KEYS.animation, patch.animation === 'medium' ? null : patch.animation ?? null);
  }
  if ('characterFrequency' in patch && patch.characterFrequency) {
    persist(STORAGE_KEYS.characterFrequency, patch.characterFrequency);
  }
  if ('characterPopups' in patch && patch.characterPopups !== undefined) {
    persist(STORAGE_KEYS.characterPopups, String(patch.characterPopups));
  }
  if ('particle' in patch) persist(STORAGE_KEYS.particle, patch.particle ?? 'none');
  if ('atmosphere' in patch) persist(STORAGE_KEYS.atmosphere, patch.atmosphere ?? 'none');
  if ('intensity' in patch && patch.intensity) persist(STORAGE_KEYS.intensity, patch.intensity);
  if ('cursorTrail' in patch && patch.cursorTrail !== undefined) {
    persist(STORAGE_KEYS.cursorTrail, String(patch.cursorTrail));
  }
  if ('spotlight' in patch && patch.spotlight !== undefined) {
    persist(STORAGE_KEYS.spotlight, String(patch.spotlight));
  }
  if ('reducedMotion' in patch && patch.reducedMotion !== undefined) {
    persist(STORAGE_KEYS.reducedMotion, String(patch.reducedMotion));
  }
  if ('quietMode' in patch && patch.quietMode !== undefined) {
    persist(STORAGE_KEYS.quietMode, String(patch.quietMode));
  }
  if ('preset' in patch) persist(STORAGE_KEYS.preset, patch.preset ?? null);
}

/** Remove the saved preset when the visitor customizes the theme directly. */
export function clearPresetStorage(): void {
  persist(STORAGE_KEYS.preset, null);
}

export function resolveAccent(settings: Pick<VisualSettings, 'accent' | 'theme' | 'bloodMoon'>): {
  color: string;
  rgb: string;
} {
  if (settings.accent) {
    return { color: settings.accent, rgb: hexToRgbString(settings.accent) };
  }
  if (settings.theme === 'tensa-zangetsu' && settings.bloodMoon) {
    return BLOOD_MOON_ACCENT;
  }
  return THEME_ACCENTS[settings.theme];
}

/**
 * Apply the global settings to the document exactly as the legacy app did:
 * `data-*` attributes on <html>, CSS variables, and body comfort classes.
 */
export function applyVisualSettings(
  settings: VisualSettings,
  systemReducedMotion = false,
): void {
  const root = document.documentElement;

  root.setAttribute('data-theme', settings.mode);

  if (settings.theme === 'default') root.removeAttribute('data-zanpakuto');
  else root.setAttribute('data-zanpakuto', settings.theme);

  if (settings.theme === 'tensa-zangetsu' && settings.bloodMoon) {
    root.setAttribute('data-blood-moon', 'true');
  } else {
    root.removeAttribute('data-blood-moon');
  }

  if (settings.accent) {
    root.setAttribute('data-custom-accent', 'true');
    root.style.setProperty('--custom-accent', settings.accent);
    root.style.setProperty('--custom-accent-rgb', hexToRgbString(settings.accent));
  } else {
    root.removeAttribute('data-custom-accent');
    root.style.removeProperty('--custom-accent');
    root.style.removeProperty('--custom-accent-rgb');
  }

  if (settings.cursor === 'system') root.setAttribute('data-cursor', 'system');
  else root.removeAttribute('data-cursor');

  if (settings.cards === 'original') root.removeAttribute('data-cards');
  else root.setAttribute('data-cards', settings.cards);

  root.setAttribute('data-animation', settings.animation);
  root.setAttribute('data-atmosphere', settings.atmosphere ?? 'none');

  if (settings.look === 'void') root.setAttribute('data-look', 'void');
  else root.removeAttribute('data-look');

  root.style.setProperty('--ui-font', FONT_STACKS[settings.font]);

  const accent = resolveAccent(settings);
  root.style.setProperty('--accent-color', accent.color);
  root.style.setProperty('--accent-rgb', accent.rgb);
  root.style.setProperty('--ambient-opacity', AMBIENT_OPACITY[settings.intensity]);

  document.body.classList.toggle('quiet-mode', settings.quietMode);
  document.body.classList.toggle(
    'characters-off',
    !settings.characterPopups || settings.characterFrequency === 'off',
  );
  document.body.classList.toggle(
    'effects-paused',
    systemReducedMotion ||
      settings.reducedMotion ||
      settings.animation === 'off' ||
      settings.quietMode,
  );
}

/** True when ambient/decorative loops are allowed to run. */
export function decorativeEffectsAllowed(
  settings: VisualSettings,
  systemReducedMotion: boolean,
): boolean {
  return (
    !settings.quietMode &&
    !systemReducedMotion &&
    !settings.reducedMotion &&
    settings.animation !== 'off'
  );
}

export function preferredReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isFinePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(pointer: fine)').matches;
}

export function applyPresetSettings(name: PresetName): Partial<VisualSettings> {
  const preset = VISUAL_PRESETS[name];
  return {
    mode: preset.mode,
    theme: preset.theme,
    accent: preset.accent,
    font: preset.font,
    cursor: preset.cursor,
    cards: preset.cards,
    animation: preset.animation,
    particle: preset.particle,
    atmosphere: preset.atmosphere,
    intensity: preset.intensity,
    characterFrequency: preset.characters,
    characterPopups: preset.characters !== 'off',
    bloodMoon: false,
    preset: name,
    look: preset.look,
  };
}
