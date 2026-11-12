import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startParticleEngine } from '@/features/global/particleEngine';

interface FakeContext {
  [key: string]: unknown;
}

function createContext(): FakeContext {
  const gradient = { addColorStop: vi.fn() };
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    setTransform: vi.fn(),
    ellipse: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
  };
}

function createCanvas(context: FakeContext) {
  return {
    width: 0,
    height: 0,
    classList: { add: vi.fn(), remove: vi.fn() },
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement;
}

const rafCallbacks = new Map<number, FrameRequestCallback>();
let rafId = 0;

beforeEach(() => {
  vi.useFakeTimers();
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
  Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
  document.body.className = '';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('particle engine resize handling', () => {
  it('coalesces mobile viewport resizes without rebuilding the particle scene', () => {
    const context = createContext();
    const canvas = createCanvas(context);
    const random = vi.spyOn(Math, 'random');

    const stop = startParticleEngine({
      canvas,
      mode: 'starfield',
      intensity: 'medium',
      animation: 'medium',
      accentRgb: '59, 130, 246',
      dark: false,
      bloodMoon: false,
    });

    expect(random).toHaveBeenCalled();
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(800);
    const initialRandomCalls = random.mock.calls.length;

    // URL-bar collapse / restore: height churn only.
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true, writable: true });
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));

    expect(canvas.height).toBe(800);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(150);

    expect(canvas.height).toBe(700);
    expect(random.mock.calls.length).toBe(initialRandomCalls);

    // Width change keeps the same population too.
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true, writable: true });
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(150);

    expect(canvas.width).toBe(1200);
    expect(random.mock.calls.length).toBe(initialRandomCalls);

    stop();
    random.mockRestore();
    expect(rafCallbacks.size).toBe(0);
  });

  it('removes its resize listener and cancels the pending resize on teardown', () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const stop = startParticleEngine({
      canvas: createCanvas(createContext()),
      mode: 'rain',
      intensity: 'subtle',
      animation: 'low',
      accentRgb: '59, 130, 246',
      dark: true,
      bloodMoon: false,
    });

    window.dispatchEvent(new Event('resize'));
    stop();

    expect(
      removeListener.mock.calls.filter(([event]) => event === 'resize'),
    ).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(document.body.classList.contains('blood-rain-on')).toBe(false);
  });
});
