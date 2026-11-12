import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import type { NowPlaying } from '@/types';
import type { VisualSettings } from '@/features/global/visualSettings';
import {
  GlobalExperienceProvider,
  useGlobalExperience,
} from '@/features/global/GlobalExperienceContext';
import { FloatingDock } from '@/features/global/FloatingDock';
import { NowPlayingWidget } from '@/features/global/NowPlayingWidget';
import { CharacterCompanions } from '@/features/global/CharacterCompanions';

const subscribeNowPlaying = vi.fn();

vi.mock('@/services/repositories', () => ({
  nowPlayingRepository: {
    subscribeNowPlaying: (...args: unknown[]) => subscribeNowPlaying(...args),
  },
}));

type OnChange = (data: NowPlaying | null) => void;
type OnError = (error: Error) => void;

let emitChange: OnChange;
let emitError: OnError;
let unsubscribe = vi.fn();

const SETTINGS: VisualSettings = {
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

function installSubscription() {
  subscribeNowPlaying.mockImplementation((onChange: OnChange, onError?: OnError) => {
    emitChange = onChange;
    emitError = onError ?? (() => undefined);
    return unsubscribe;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-zanpakuto');
  document.body.className = '';
  unsubscribe = vi.fn();
  installSubscription();
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

function renderProvider(
  ui: React.ReactNode,
  settings: Partial<VisualSettings> = {},
  overrides: { systemReducedMotionOverride?: boolean } = {},
) {
  return render(
    <GlobalExperienceProvider
      initialSettings={{ ...SETTINGS, ...settings }}
      {...overrides}
    >
      {ui}
    </GlobalExperienceProvider>,
  );
}

function ModeProbe() {
  const { settings, toggleMode, decorativeAllowed, selectTheme, toggleQuietMode } =
    useGlobalExperience();
  return (
    <div>
      <span data-testid="mode">{settings.mode}</span>
      <span data-testid="theme">{settings.theme}</span>
      <span data-testid="decorative">{String(decorativeAllowed)}</span>
      <button type="button" onClick={toggleMode}>
        toggle mode
      </button>
      <button type="button" onClick={() => selectTheme('nozarashi')}>
        pick nozarashi
      </button>
      <button type="button" onClick={toggleQuietMode}>
        toggle quiet
      </button>
    </div>
  );
}

describe('GlobalExperienceProvider', () => {
  it('applies the selected mode and persists it', async () => {
    renderProvider(<ModeProbe />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await act(async () => {
      screen.getByRole('button', { name: 'toggle mode' }).click();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('applies a Zanpakuto theme, its signature particle and clears presets', async () => {
    localStorage.setItem('sledge_preset', 'classic');
    renderProvider(<ModeProbe />);

    await act(async () => {
      screen.getByRole('button', { name: 'pick nozarashi' }).click();
    });

    expect(document.documentElement.getAttribute('data-zanpakuto')).toBe('nozarashi');
    expect(localStorage.getItem('zanpakuto_theme')).toBe('nozarashi');
    expect(localStorage.getItem('effect_particle')).toBe('nozarashi');
    expect(localStorage.getItem('sledge_preset')).toBeNull();
    expect(screen.getByTestId('theme')).toHaveTextContent('nozarashi');
  });

  it('keeps Quiet Mode separate from reduced motion', async () => {
    renderProvider(<ModeProbe />);
    expect(screen.getByTestId('decorative')).toHaveTextContent('true');

    await act(async () => {
      screen.getByRole('button', { name: 'toggle quiet' }).click();
    });

    expect(document.body).toHaveClass('quiet-mode');
    expect(screen.getByTestId('decorative')).toHaveTextContent('false');
    expect(localStorage.getItem('quiet_mode')).toBe('true');
  });

  it('derives reduced motion from the system preference without mutating the setting', () => {
    renderProvider(<ModeProbe />, {}, { systemReducedMotionOverride: true });
    expect(screen.getByTestId('decorative')).toHaveTextContent('false');
    expect(localStorage.getItem('effects_reduced_motion')).toBeNull();
  });
});

describe('FloatingDock', () => {
  it('opens and closes, exposes active themes and restores focus on Escape', async () => {
    renderProvider(<FloatingDock />);

    const toggle = screen.getByRole('button', { name: 'Open quick controls' });
    await act(async () => {
      toggle.click();
    });
    expect(screen.getByRole('navigation', { name: 'Quick controls dock' })).toBeInTheDocument();

    const themes = screen.getByRole('button', { name: 'Change theme' });
    await act(async () => {
      themes.click();
    });
    const popup = screen.getByRole('dialog', { name: 'Choose theme' });
    expect(popup).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('button', { name: /Sledge Default/ })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.getElementById('dock-theme-popup')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(document.activeElement).toBe(toggle);
  });

  it('switches themes from the dock and keeps active state in sync', async () => {
    renderProvider(<FloatingDock />, { mode: 'dark' });

    await act(async () => {
      screen.getByRole('button', { name: 'Open quick controls' }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Change theme' }).click();
    });

    await act(async () => {
      screen.getByRole('button', { name: /Senbonzakura/ }).click();
    });

    expect(document.documentElement.getAttribute('data-zanpakuto')).toBe('senbonzakura');
    expect(localStorage.getItem('zanpakuto_theme')).toBe('senbonzakura');
    expect(localStorage.getItem('effect_particle')).toBe('sakura');
  });

  it('toggles Quiet Mode from the dock and pauses decorative toggles', async () => {
    renderProvider(<FloatingDock />);

    await act(async () => {
      screen.getByRole('button', { name: 'Open quick controls' }).click();
    });

    const quiet = screen.getByRole('button', { name: /Quiet mode/ });
    await act(async () => {
      quiet.click();
    });

    expect(quiet).toHaveAttribute('aria-pressed', 'true');
    expect(document.body).toHaveClass('quiet-mode');
    expect(screen.getByLabelText('Blood Rain')).toBeDisabled();
  });

  it('disables effect toggles when the system requests reduced motion', async () => {
    renderProvider(<FloatingDock />, {}, { systemReducedMotionOverride: true });

    await act(async () => {
      screen.getByRole('button', { name: 'Open quick controls' }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Visual effects' }).click();
    });

    expect(screen.getByLabelText('Blood Rain')).toBeDisabled();
    expect(screen.getByLabelText('Reduced motion')).toBeDisabled();
  });
});

describe('Now Playing widget', () => {
  it('subscribes once, renders track metadata and unsubscribes on unmount', async () => {
    const { unmount } = renderProvider(
      <>
        <NowPlayingWidget />
        <FloatingDock />
      </>,
    );

    expect(subscribeNowPlaying).toHaveBeenCalledTimes(1);

    await act(async () => {
      emitChange({
        title: 'Test Track',
        artist: 'Test Artist',
        artwork: 'https://example.com/a.jpg',
        songUrl: 'https://youtube.com/watch?v=1',
        source: 'youtube-music',
        isPlaying: true,
        updatedAt: Date.now(),
      });
    });

    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('YT Music')).toBeInTheDocument();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('falls back to the offline state when the subscription errors', async () => {
    renderProvider(<NowPlayingWidget />);

    await act(async () => {
      emitError(new Error('rtdb unavailable'));
    });

    expect(screen.getByText('Not listening right now')).toBeInTheDocument();
  });

  it('expands the sleeve from the dock and closes it from the widget', async () => {
    renderProvider(
      <>
        <NowPlayingWidget />
        <FloatingDock />
      </>,
    );

    await act(async () => {
      emitChange({
        title: 'Track Two',
        artist: 'Artist Two',
        isPlaying: false,
        updatedAt: Date.now(),
      });
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Open quick controls' }).click();
    });

    const music = screen.getByRole('button', { name: 'Show or hide music pop-up' });
    expect(music).toHaveAttribute('aria-pressed', 'false');
    await act(async () => {
      music.click();
    });
    expect(music).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() =>
      expect(document.getElementById('now-playing-widget')).not.toHaveClass('np-hidden'),
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Dismiss Now Playing widget' }).click();
    });
    expect(document.getElementById('now-playing-widget')).toHaveClass('np-hidden');
  });
});

describe('Character companions', () => {
  it('does not schedule pop-ups when characters are off', async () => {
    renderProvider(<CharacterCompanions />, {
      characterPopups: false,
      characterFrequency: 'off',
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(document.querySelector('.bee-wrap')).toBeNull();
  });
});

function RouteProbe() {
  const { settings, toggleMode } = useGlobalExperience();
  return (
    <div>
      <span data-testid="route-mode">{settings.mode}</span>
      <button type="button" onClick={toggleMode}>
        toggle route mode
      </button>
      <Link to="/courses">go courses</Link>
      <Link to="/">go home</Link>
    </div>
  );
}

describe('global experience across routes', () => {
  it('keeps one provider, one subscription and the persisted theme across navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalExperienceProvider initialSettings={SETTINGS}>
          <Routes>
            <Route path="/" element={<RouteProbe />} />
            <Route path="/courses" element={<RouteProbe />} />
          </Routes>
        </GlobalExperienceProvider>
      </MemoryRouter>,
    );
    expect(subscribeNowPlaying).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByRole('button', { name: 'toggle route mode' }).click();
      screen.getByRole('link', { name: 'go courses' }).click();
    });

    expect(await screen.findByTestId('route-mode')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(subscribeNowPlaying).toHaveBeenCalledTimes(1);
  });
});
