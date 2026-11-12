import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyPresetSettings,
  applyVisualSettings,
  clearPresetStorage,
  decorativeEffectsAllowed,
  persistSettings,
  readVisualSettings,
  resolveAccent,
  STORAGE_KEYS,
  THEME_ACCENTS,
  THEME_SIGNATURE_EFFECTS,
  VISUAL_PRESETS,
  type VisualSettings,
} from '@/features/global/visualSettings';

const BASE: VisualSettings = {
  mode: 'light',
  theme: 'default',
  accent: null,
  font: 'site',
  cursor: 'theme',
  cards: 'original',
  animation: 'medium',
  particle: null,
  atmosphere: null,
  intensity: 'medium',
  characterFrequency: 'normal',
  characterPopups: true,
  cursorTrail: false,
  spotlight: false,
  reducedMotion: false,
  quietMode: false,
  bloodMoon: false,
  preset: null,
  look: null,
};

beforeEach(() => {
  localStorage.clear();
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  root.removeAttribute('data-zanpakuto');
  root.removeAttribute('data-blood-moon');
  root.removeAttribute('data-custom-accent');
  root.removeAttribute('data-cursor');
  root.removeAttribute('data-cards');
  root.removeAttribute('data-animation');
  root.removeAttribute('data-atmosphere');
  root.removeAttribute('data-look');
  root.style.cssText = '';
  document.body.className = '';
});

describe('visual settings storage', () => {
  it('defaults exactly like the legacy app', () => {
    const settings = readVisualSettings();
    expect(settings).toMatchObject({
      mode: 'light',
      theme: 'default',
      accent: null,
      font: 'site',
      cursor: 'theme',
      cards: 'original',
      animation: 'medium',
      particle: null,
      atmosphere: null,
      intensity: 'medium',
      characterFrequency: 'normal',
      characterPopups: true,
      cursorTrail: false,
      spotlight: false,
      reducedMotion: false,
      quietMode: false,
      preset: null,
    });
  });

  it('reads the exact legacy localStorage keys', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('zanpakuto_theme', 'senbonzakura');
    localStorage.setItem('sledge_accent', '#123456');
    localStorage.setItem('sledge_font', 'poppins');
    localStorage.setItem('sledge_cards', 'glass');
    localStorage.setItem('effect_particle', 'sakura');
    localStorage.setItem('effect_atmosphere', 'mist');
    localStorage.setItem('effect_intensity', 'intense');
    localStorage.setItem('quiet_mode', 'true');
    localStorage.setItem('effects_reduced_motion', 'true');
    localStorage.setItem('sledge_preset', 'anime');

    const settings = readVisualSettings();
    expect(settings.mode).toBe('dark');
    expect(settings.theme).toBe('senbonzakura');
    expect(settings.accent).toBe('#123456');
    expect(settings.font).toBe('poppins');
    expect(settings.cards).toBe('glass');
    expect(settings.particle).toBe('sakura');
    expect(settings.atmosphere).toBe('mist');
    expect(settings.intensity).toBe('intense');
    expect(settings.quietMode).toBe(true);
    expect(settings.reducedMotion).toBe(true);
    expect(settings.preset).toBe('anime');
  });

  it('migrates the legacy per-theme particle keys only when unset', () => {
    localStorage.setItem('zanpakuto_theme', 'senbonzakura');
    expect(readVisualSettings().particle).toBe('sakura');
    localStorage.setItem('effect_sakura', 'false');
    expect(readVisualSettings().particle).toBeNull();

    localStorage.clear();
    localStorage.setItem('zanpakuto_theme', 'tensa-zangetsu');
    localStorage.setItem('effect_reiatsu', 'false');
    expect(readVisualSettings().particle).toBeNull();
  });

  it('persists using the same keys and clears defaults', () => {
    persistSettings({
      mode: 'dark',
      theme: 'hogyoku',
      accent: '#abcdef',
      font: 'outfit',
      cards: 'glow',
      animation: 'high',
      particle: 'starfield',
      atmosphere: 'aurora',
      quietMode: true,
    });

    expect(localStorage.getItem(STORAGE_KEYS.mode)).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEYS.zanpakuto)).toBe('hogyoku');
    expect(localStorage.getItem(STORAGE_KEYS.accent)).toBe('#abcdef');
    expect(localStorage.getItem(STORAGE_KEYS.font)).toBe('outfit');
    expect(localStorage.getItem(STORAGE_KEYS.cards)).toBe('glow');
    expect(localStorage.getItem(STORAGE_KEYS.animation)).toBe('high');
    expect(localStorage.getItem(STORAGE_KEYS.particle)).toBe('starfield');
    expect(localStorage.getItem(STORAGE_KEYS.atmosphere)).toBe('aurora');
    expect(localStorage.getItem(STORAGE_KEYS.quietMode)).toBe('true');

    persistSettings({
      theme: 'default',
      font: 'site',
      cards: 'original',
      cursor: 'theme',
      animation: 'medium',
    });
    expect(localStorage.getItem(STORAGE_KEYS.zanpakuto)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.font)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.cards)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.animation)).toBeNull();
  });

  it('removes a saved preset when customization starts', () => {
    localStorage.setItem(STORAGE_KEYS.preset, 'classic');
    clearPresetStorage();
    expect(localStorage.getItem(STORAGE_KEYS.preset)).toBeNull();
  });
});

describe('visual settings application', () => {
  it('writes the legacy html attributes, variables and body classes', () => {
    applyVisualSettings({
      ...BASE,
      mode: 'dark',
      theme: 'tensa-zangetsu',
      bloodMoon: true,
      accent: '#123456',
      cursor: 'system',
      cards: 'glass',
      animation: 'low',
      atmosphere: 'aurora',
      intensity: 'intense',
      quietMode: true,
      reducedMotion: true,
      characterPopups: false,
      font: 'outfit',
    });

    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.getAttribute('data-zanpakuto')).toBe('tensa-zangetsu');
    expect(root.getAttribute('data-blood-moon')).toBe('true');
    expect(root.getAttribute('data-custom-accent')).toBe('true');
    expect(root.getAttribute('data-cursor')).toBe('system');
    expect(root.getAttribute('data-cards')).toBe('glass');
    expect(root.getAttribute('data-animation')).toBe('low');
    expect(root.getAttribute('data-atmosphere')).toBe('aurora');
    expect(root.style.getPropertyValue('--accent-color')).toBe('#123456');
    expect(root.style.getPropertyValue('--ambient-opacity')).toBe('0.64');
    expect(document.body).toHaveClass('quiet-mode');
    expect(document.body).toHaveClass('characters-off');
    expect(document.body).toHaveClass('effects-paused');
  });

  it('pauses decorative CSS when the system requests reduced motion', () => {
    applyVisualSettings(BASE, true);
    expect(document.body).toHaveClass('effects-paused');
    expect(document.body).not.toHaveClass('quiet-mode');
  });

  it('clears optional attributes for the default theme', () => {
    applyVisualSettings({ ...BASE, theme: 'default', cursor: 'theme', cards: 'original' });
    const root = document.documentElement;
    expect(root.hasAttribute('data-zanpakuto')).toBe(false);
    expect(root.hasAttribute('data-custom-accent')).toBe(false);
    expect(root.hasAttribute('data-cursor')).toBe(false);
    expect(root.hasAttribute('data-cards')).toBe(false);
    expect(root.getAttribute('data-theme')).toBe('light');
  });
});

describe('global visual decisions', () => {
  it('uses the legacy accent per Zanpakuto theme', () => {
    expect(THEME_ACCENTS.default.color).toBe('#3b82f6');
    expect(THEME_ACCENTS['getsuga-tensho'].color).toBe('#f8fafc');
    expect(THEME_ACCENTS.nozarashi.color).toBe('#eab308');
    expect(THEME_ACCENTS.senbonzakura.color).toBe('#ec4899');
    expect(THEME_ACCENTS['kyoka-suigetsu'].color).toBe('#a855f7');
    expect(THEME_ACCENTS['tensa-zangetsu'].color).toBe('#ef4444');
    expect(THEME_ACCENTS.hogyoku.color).toBe('#c084fc');
  });

  it('lets a custom accent win, then Blood Moon, then the theme accent', () => {
    expect(resolveAccent({ accent: '#010203', theme: 'default', bloodMoon: false }).color).toBe(
      '#010203',
    );
    expect(
      resolveAccent({ accent: null, theme: 'tensa-zangetsu', bloodMoon: true }).color,
    ).toBe('#ff1e27');
    expect(resolveAccent({ accent: null, theme: 'nozarashi', bloodMoon: false }).color).toBe(
      '#eab308',
    );
  });

  it('maps each theme to its legacy signature particle effect', () => {
    expect(THEME_SIGNATURE_EFFECTS).toMatchObject({
      default: null,
      'getsuga-tensho': 'gold',
      nozarashi: 'nozarashi',
      senbonzakura: 'sakura',
      'kyoka-suigetsu': 'reiatsu',
      'tensa-zangetsu': 'rain',
      hogyoku: null,
    });
  });

  it('applies the six legacy appearance presets', () => {
    expect(Object.keys(VISUAL_PRESETS)).toEqual([
      'classic',
      'anime',
      'soul',
      'golden',
      'void',
      'hogyoku',
    ]);
    expect(applyPresetSettings('anime')).toMatchObject({
      mode: 'light',
      theme: 'senbonzakura',
      particle: 'sakura',
      accent: '#ec4899',
      font: 'poppins',
      cards: 'glass',
      preset: 'anime',
    });
    expect(applyPresetSettings('void')).toMatchObject({
      mode: 'dark',
      look: 'void',
      particle: 'starfield',
      preset: 'void',
    });
  });

  it('suppresses decorative effects for Quiet Mode, reduced motion and animation off', () => {
    expect(decorativeEffectsAllowed(BASE, false)).toBe(true);
    expect(decorativeEffectsAllowed({ ...BASE, quietMode: true }, false)).toBe(false);
    expect(decorativeEffectsAllowed({ ...BASE, reducedMotion: true }, false)).toBe(false);
    expect(decorativeEffectsAllowed({ ...BASE, animation: 'off' }, false)).toBe(false);
    expect(decorativeEffectsAllowed(BASE, true)).toBe(false);
  });
});
