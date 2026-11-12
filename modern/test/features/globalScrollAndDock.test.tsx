import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import type { NowPlaying } from '@/types';
import type { VisualSettings } from '@/features/global/visualSettings';
import { GlobalExperienceProvider } from '@/features/global/GlobalExperienceContext';
import { GlobalEffects, ScrollExperience } from '@/features/global/GlobalEffects';
import { FloatingDock } from '@/features/global/FloatingDock';

const subscribeNowPlaying = vi.fn();
const startParticleEngine = vi.fn();
const startCursorTrail = vi.fn();
let particleCleanup = vi.fn();
let trailCleanup = vi.fn();

vi.mock('@/services/repositories', () => ({
  nowPlayingRepository: {
    subscribeNowPlaying: (...args: unknown[]) => subscribeNowPlaying(...args),
  },
}));

vi.mock('@/features/global/particleEngine', () => ({
  startParticleEngine: (...args: unknown[]) => startParticleEngine(...args),
  startCursorTrail: (...args: unknown[]) => startCursorTrail(...args),
}));

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

let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

function flushRaf() {
  const callbacks = [...rafCallbacks.values()];
  rafCallbacks.clear();
  callbacks.forEach((callback) => callback(performance.now()));
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
}

function setHoverCapable(hover: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: hover && query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.body.className = '';
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-zanpakuto');
  setScrollY(0);
  setHoverCapable(true);
  particleCleanup = vi.fn();
  trailCleanup = vi.fn();
  startParticleEngine.mockReturnValue(particleCleanup);
  startCursorTrail.mockReturnValue(trailCleanup);
  subscribeNowPlaying.mockImplementation(
    (_onChange: (data: NowPlaying | null) => void, _onError?: (error: Error) => void) =>
      vi.fn(),
  );
  rafCallbacks.clear();
  rafId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    rafId += 1;
    rafCallbacks.set(rafId, callback);
    return rafId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderProvider(
  ui: React.ReactNode,
  settings: Partial<VisualSettings> = {},
  overrides: { systemReducedMotionOverride?: boolean } = {},
) {
  return render(
    <GlobalExperienceProvider
      initialSettings={{ ...SETTINGS, ...settings }}
      systemReducedMotionOverride={overrides.systemReducedMotionOverride}
    >
      {ui}
    </GlobalExperienceProvider>,
  );
}

describe('scroll effects', () => {
  it('runs one particle loop while scrolling and tears it down on unmount', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderProvider(
      <>
        <GlobalEffects />
        <ScrollExperience />
      </>,
      { particle: 'sakura' },
    );

    expect(startParticleEngine).toHaveBeenCalledTimes(1);
    const scrollRegistrations = addListener.mock.calls.filter(([event]) => event === 'scroll');
    expect(scrollRegistrations).toHaveLength(1);

    setScrollY(1200);
    act(() => {
      fireEvent.scroll(window);
      flushRaf();
    });

    expect(startParticleEngine).toHaveBeenCalledTimes(1);
    expect(document.getElementById('scroll-progress')?.firstElementChild).toHaveStyle({
      transform: 'scaleX(1)',
    });
    expect(document.getElementById('back-to-top')).toHaveClass('visible');

    unmount();
    expect(particleCleanup).toHaveBeenCalledTimes(1);
    const scrollRemovals = removeListener.mock.calls.filter(([event]) => event === 'scroll');
    expect(scrollRemovals).toHaveLength(1);
  });

  it('does not start a particle loop when effects are disabled or Quiet Mode is on', () => {
    const { unmount } = renderProvider(
      <>
        <GlobalEffects />
        <ScrollExperience />
      </>,
      { particle: null },
    );
    expect(startParticleEngine).not.toHaveBeenCalled();
    unmount();

    renderProvider(
      <>
        <GlobalEffects />
        <ScrollExperience />
      </>,
      { particle: 'sakura', quietMode: true },
    );
    expect(startParticleEngine).not.toHaveBeenCalled();
  });

  it('does not start decorative loops under system reduced motion', () => {
    renderProvider(
      <>
        <GlobalEffects />
        <ScrollExperience />
      </>,
      { particle: 'starfield', cursorTrail: true, spotlight: true },
      { systemReducedMotionOverride: true },
    );

    expect(startParticleEngine).not.toHaveBeenCalled();
    expect(startCursorTrail).not.toHaveBeenCalled();
  });

  it('keeps a single loop and a single scroll listener across route changes', () => {
    const addListener = vi.spyOn(window, 'addEventListener');

    render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalExperienceProvider initialSettings={{ ...SETTINGS, particle: 'starfield' }}>
          <GlobalEffects />
          <ScrollExperience />
          <Routes>
            <Route path="/" element={<Link to="/courses">go courses</Link>} />
            <Route path="/courses" element={<Link to="/">go home</Link>} />
          </Routes>
        </GlobalExperienceProvider>
      </MemoryRouter>,
    );

    expect(startParticleEngine).toHaveBeenCalledTimes(1);
    act(() => {
      screen.getByRole('link', { name: 'go courses' }).click();
    });
    expect(startParticleEngine).toHaveBeenCalledTimes(1);
    const scrollRegistrations = addListener.mock.calls.filter(([event]) => event === 'scroll');
    expect(scrollRegistrations).toHaveLength(1);
  });
});

describe('floating dock hover grace period', () => {
  const shell = () => document.getElementById('dock-shell') as HTMLElement;
  const dock = () => document.getElementById('sledge-dock') as HTMLElement;
  const leaveShell = () => {
    fireEvent.pointerOut(shell(), { relatedTarget: document.body });
    fireEvent.pointerLeave(shell());
  };
  const setFocusVisible = (element: HTMLElement, visible: boolean) => {
    const original = element.matches.bind(element);
    Object.defineProperty(element, 'matches', {
      configurable: true,
      value: (selector: string) => (selector === ':focus-visible' ? visible : original(selector)),
    });
    return () => {
      delete (element as HTMLElement & { matches?: unknown }).matches;
    };
  };

  it('keeps the dock open when the pointer crosses from the trigger into the options within 400ms', () => {
    vi.useFakeTimers();
    renderProvider(<FloatingDock />);

    act(() => {
      fireEvent.pointerOver(shell(), { relatedTarget: document.body });
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'false');

    act(() => {
      leaveShell();
      vi.advanceTimersByTime(200);
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'false');

    // Entering the expanded bar (a child of the shell) cancels the pending close.
    act(() => {
      fireEvent.pointerOver(screen.getByRole('button', { name: 'Change theme' }));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'false');
  });

  it('closes after the grace period once the whole interaction region is left', () => {
    vi.useFakeTimers();
    renderProvider(<FloatingDock />);

    act(() => {
      fireEvent.pointerOver(shell(), { relatedTarget: document.body });
    });
    act(() => {
      leaveShell();
    });
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'false');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'true');
  });

  it('cancels a pending close when the pointer re-enters', () => {
    vi.useFakeTimers();
    renderProvider(<FloatingDock />);

    act(() => {
      fireEvent.pointerOver(shell(), { relatedTarget: document.body });
    });
    act(() => {
      leaveShell();
      vi.advanceTimersByTime(250);
      fireEvent.pointerOver(shell(), { relatedTarget: document.body });
      vi.advanceTimersByTime(1000);
    });

    expect(dock()).toHaveAttribute('aria-hidden', 'false');
  });

  it('stays open while keyboard focus remains inside the dock', () => {
    vi.useFakeTimers();
    renderProvider(<FloatingDock />);

    act(() => {
      fireEvent.pointerOver(shell(), { relatedTarget: document.body });
    });
    const button = screen.getByRole('button', { name: 'Change theme' });
    const restore = setFocusVisible(button, true);

    act(() => {
      button.focus();
    });
    act(() => {
      leaveShell();
      vi.advanceTimersByTime(1000);
    });

    expect(dock()).toHaveAttribute('aria-hidden', 'false');
    restore();
  });

  it('closes after a mouse click leaves focus inside without keyboard focus visibility', () => {
    vi.useFakeTimers();
    renderProvider(<FloatingDock />);

    act(() => {
      fireEvent.pointerOver(shell(), { relatedTarget: document.body });
    });
    const button = screen.getByRole('button', { name: 'Change theme' });
    const restore = setFocusVisible(button, false);

    act(() => {
      button.focus();
    });
    act(() => {
      leaveShell();
      vi.advanceTimersByTime(399);
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'false');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'true');
    restore();
  });

  it('closes on Escape, restores focus and clears the pending timer on unmount', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = renderProvider(<FloatingDock />);

    act(() => {
      fireEvent.pointerOver(shell(), { relatedTarget: document.body });
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(dock()).toHaveAttribute('aria-hidden', 'true');
    expect(document.activeElement).toBe(document.getElementById('dock-toggle'));

    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      fireEvent.pointerOver(shell(), { relatedTarget: document.body });
    });
    act(() => {
      leaveShell();
    });
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('uses tap interaction and ignores pointer-leave on touch-capable devices', () => {
    vi.useFakeTimers();
    setHoverCapable(false);
    renderProvider(<FloatingDock />);

    act(() => {
      screen.getByRole('button', { name: 'Open quick controls' }).click();
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'false');

    act(() => {
      leaveShell();
      vi.advanceTimersByTime(1000);
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'false');

    act(() => {
      screen.getByRole('button', { name: 'Close quick controls' }).click();
    });
    expect(dock()).toHaveAttribute('aria-hidden', 'true');
  });
});
