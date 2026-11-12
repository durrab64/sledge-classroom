// Global ambient layers, particle canvases, cursor spotlight/trail, scroll
// progress, back-to-top and click ripples. Every loop and listener is scoped
// to the effect that owns it and cleaned up on unmount or preference change.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGlobalExperience } from './GlobalExperienceContext';
import { startCursorTrail, startParticleEngine } from './particleEngine';

export function GlobalEffects() {
  const { settings, decorativeAllowed, finePointer, accent } = useGlobalExperience();
  const particleCanvas = useRef<HTMLCanvasElement | null>(null);
  const trailCanvas = useRef<HTMLCanvasElement | null>(null);
  const spotlight = useRef<HTMLDivElement | null>(null);

  // Particle layer: one mode at a time, fully torn down on change.
  useEffect(() => {
    const canvas = particleCanvas.current;
    if (!canvas) return;
    if (!settings.particle || !decorativeAllowed) return;
    return startParticleEngine({
      canvas,
      mode: settings.particle,
      intensity: settings.intensity,
      animation: settings.animation,
      accentRgb: accent.rgb,
      dark: settings.mode === 'dark',
      bloodMoon: settings.bloodMoon,
    });
  }, [
    settings.particle,
    settings.intensity,
    settings.animation,
    settings.mode,
    settings.bloodMoon,
    decorativeAllowed,
    accent.rgb,
  ]);

  // Cursor trail (fine pointers only).
  useEffect(() => {
    const canvas = trailCanvas.current;
    if (!canvas) return;
    if (!settings.cursorTrail || !decorativeAllowed || !finePointer) return;
    return startCursorTrail({ canvas, accent: accent.color });
  }, [settings.cursorTrail, decorativeAllowed, finePointer, accent.color]);

  // Mouse-follow spotlight.
  useEffect(() => {
    const element = spotlight.current;
    if (!element) return;
    if (!settings.spotlight || !decorativeAllowed || !finePointer) {
      element.classList.remove('active');
      return;
    }

    let rafId: number | null = null;
    let x = -9999;
    let y = -9999;

    const refresh = () => {
      rafId = null;
      element.style.transform = `translate3d(${Math.round(x - 210)}px, ${Math.round(y - 210)}px, 0)`;
      element.classList.add('active');
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(refresh);
    };

    const onLeave = () => element.classList.remove('active');
    const onVisibility = () => {
      if (document.hidden) element.classList.remove('active');
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      element.classList.remove('active');
    };
  }, [settings.spotlight, decorativeAllowed, finePointer]);

  return (
    <>
      <div id="blood-rain-aura" aria-hidden="true" />
      <div id="ambient-aurora" className="ambient-layer" aria-hidden="true">
        <span className="aurora-band aurora-band-1" />
        <span className="aurora-band aurora-band-2" />
        <span className="aurora-band aurora-band-3" />
      </div>
      <div id="ambient-mist" className="ambient-layer" aria-hidden="true">
        <span className="mist-blob mist-blob-1" />
        <span className="mist-blob mist-blob-2" />
        <span className="mist-blob mist-blob-3" />
      </div>
      <div id="cursor-spotlight" ref={spotlight} aria-hidden="true" />
      <canvas id="sakura-canvas" ref={particleCanvas} className="sakura-canvas hidden" aria-hidden="true" />
      <canvas
        id="cursor-trail-canvas"
        ref={trailCanvas}
        className="cursor-trail-canvas hidden"
        aria-hidden="true"
      />
    </>
  );
}

export function ScrollExperience() {
  const { decorativeAllowed } = useGlobalExperience();
  const bar = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const ticking = useRef(false);

  const update = useCallback(() => {
    ticking.current = false;
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / max));
    if (bar.current) bar.current.style.transform = `scaleX(${ratio})`;
    setVisible(window.scrollY > 480);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [update]);

  return (
    <>
      <div id="scroll-progress" aria-hidden="true">
        <span ref={bar} />
      </div>
      <button
        type="button"
        id="back-to-top"
        className={`back-to-top${visible ? ' visible' : ''}`}
        aria-label="Back to top"
        title="Back to top"
        onClick={() =>
          window.scrollTo({ top: 0, behavior: decorativeAllowed ? 'smooth' : 'auto' })
        }
      >
        <i className="fas fa-arrow-up" aria-hidden="true" />
      </button>
    </>
  );
}

const RIPPLE_SELECTOR =
  'button, .btn, .course-card, .dock-action, .dock-theme-item, .file-action-btn, .nav-link';

export function ClickRipple() {
  const { decorativeAllowed, finePointer } = useGlobalExperience();

  useEffect(() => {
    if (!decorativeAllowed || !finePointer) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = (event.target as Element | null)?.closest(RIPPLE_SELECTOR);
      if (!target) return;
      const ripple = document.createElement('span');
      ripple.className = 'click-ripple';
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);
      const timer = setTimeout(() => {
        ripple.remove();
        timers.delete(timer);
      }, 620);
      timers.add(timer);
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [decorativeAllowed, finePointer]);

  return null;
}
