// Canvas particle engine ported from the legacy app.js decorative layer.
//
// One particle loop runs at a time. Every mode is mutually exclusive and the
// engine fully cleans up its rAF loop, resize listener and canvas state.

import type { AnimationLevel, EffectIntensity, ParticleMode } from '@/types';
import { animationScale } from './visualSettings';

interface Particle {
  x: number;
  y: number;
  length: number;
  width: number;
  speed: number;
  drift: number;
  alpha: number;
  bright: boolean;
  size: number;
  speedY: number;
  speedX: number;
  phase: number;
  twinkle: number;
  angle: number;
  angularSpeed: number;
  oscillation: number;
  oscillationSpeed: number;
  color: string;
  kind: 'spark' | 'flame' | 'ember';
  life: number;
  wobble: number;
  wobbleSpeed: number;
  heat: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
  isBladeShard: boolean;
}

const PARTICLE_COUNTS: Record<ParticleMode, Record<EffectIntensity, number>> = {
  rain: { subtle: 40, medium: 85, intense: 145 },
  gold: { subtle: 32, medium: 65, intense: 105 },
  sakura: { subtle: 26, medium: 46, intense: 72 },
  nozarashi: { subtle: 20, medium: 36, intense: 56 },
  reiatsu: { subtle: 20, medium: 36, intense: 56 },
  starfield: { subtle: 80, medium: 135, intense: 200 },
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function baseParticle(): Particle {
  return {
    x: 0,
    y: 0,
    length: 0,
    width: 0,
    speed: 0,
    drift: 0,
    alpha: 0,
    bright: false,
    size: 0,
    speedY: 0,
    speedX: 0,
    phase: 0,
    twinkle: 0,
    angle: 0,
    angularSpeed: 0,
    oscillation: 0,
    oscillationSpeed: 0,
    color: '',
    kind: 'ember',
    life: 0,
    wobble: 0,
    wobbleSpeed: 0,
    heat: 0,
    opacity: 0,
    pulse: 0,
    pulseSpeed: 0,
    isBladeShard: false,
  };
}

function spawnParticle(mode: ParticleMode, width: number, height: number, initial: boolean): Particle {
  const p = baseParticle();

  if (mode === 'rain') {
    return Object.assign(p, {
      x: Math.random() * width,
      y: initial ? randomBetween(-height * 0.6, height) : randomBetween(-height * 0.5, -20),
      length: randomBetween(10, 28),
      width: randomBetween(0.6, 1.8),
      speed: randomBetween(5, 13),
      drift: randomBetween(-1.8, -0.2),
      alpha: randomBetween(0.14, 0.5),
      bright: Math.random() < 0.12,
    });
  }

  if (mode === 'gold') {
    return Object.assign(p, {
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + randomBetween(0, 40),
      size: randomBetween(0.8, 3.2),
      speedY: -randomBetween(0.2, 1.0),
      drift: randomBetween(-0.5, 0.5),
      phase: Math.random() * Math.PI * 2,
      twinkle: randomBetween(0.02, 0.05),
      alpha: randomBetween(0.25, 0.75),
    });
  }

  if (mode === 'sakura') {
    return Object.assign(p, {
      x: Math.random() * width,
      y: initial ? Math.random() * height : randomBetween(-height * 0.25, -20),
      size: randomBetween(7, 16),
      speedY: randomBetween(1.1, 2.9),
      speedX: randomBetween(-0.8, 0.8),
      angle: Math.random() * Math.PI * 2,
      angularSpeed: randomBetween(-0.035, 0.035),
      oscillation: Math.random() * Math.PI * 2,
      oscillationSpeed: randomBetween(0.015, 0.04),
      color: ['rgba(244,114,182,0.85)', 'rgba(251,207,232,0.9)', 'rgba(236,72,153,0.8)', 'rgba(219,39,119,0.75)'][
        Math.floor(Math.random() * 4)
      ],
    });
  }

  if (mode === 'nozarashi') {
    if (Math.random() < 0.28) {
      return Object.assign(p, {
        kind: 'spark',
        x: Math.random() * width,
        y: initial ? Math.random() * height : height + randomBetween(0, 20),
        size: randomBetween(1, 3),
        speedY: randomBetween(2.5, 6.5),
        drift: randomBetween(-1.2, 1.2),
        life: initial ? Math.random() : 0,
      });
    }
    return Object.assign(p, {
      kind: 'flame',
      x: Math.random() * width,
      y: initial ? randomBetween(height * 0.45, height) : height + randomBetween(10, 40),
      size: randomBetween(16, 46),
      speedY: randomBetween(1.0, 2.8),
      drift: randomBetween(-0.5, 0.5),
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: randomBetween(0.02, 0.055),
      life: initial ? Math.random() * 0.7 : randomBetween(0.1, 0.25),
      heat: randomBetween(0.45, 1),
    });
  }

  if (mode === 'starfield') {
    return Object.assign(p, {
      x: Math.random() * width,
      y: Math.random() * height,
      size: randomBetween(0.5, 1.8),
      alpha: randomBetween(0.25, 0.9),
      phase: Math.random() * Math.PI * 2,
      twinkle: randomBetween(0.006, 0.022),
      drift: randomBetween(-0.08, 0.08),
      bright: Math.random() < 0.11,
    });
  }

  // reiatsu
  return Object.assign(p, {
    x: Math.random() * width,
    y: initial ? Math.random() * height : height + 10,
    size: randomBetween(2, 6.5),
    speedY: -randomBetween(0.9, 2.7),
    speedX: randomBetween(-0.6, 0.6),
    opacity: randomBetween(0.3, 0.95),
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: randomBetween(0.03, 0.07),
    isBladeShard: Math.random() > 0.75,
  });
}

const SAKURA_PETAL_PATH =
  typeof Path2D !== 'undefined'
    ? (() => {
        const path = new Path2D();
        path.moveTo(0, 0);
        path.bezierCurveTo(0.5, -0.5, 1, -0.25, 1, 0);
        path.bezierCurveTo(1, 0.25, 0.5, 0.5, 0, 0);
        return path;
      })()
    : null;

// Nozarashi draws a soft radial flame for every particle on every frame.
// Building that gradient (four colour stops) per particle was the single most
// expensive scroll path, so bake it into one reusable sprite instead. The
// sprite keeps the exact same colours; per-particle alpha comes from
// globalAlpha, which composites identically under 'lighter'.
const FLAME_SPRITE_SIZE = 128;
let flameSprite: HTMLCanvasElement | null = null;

function getFlameSprite(): HTMLCanvasElement | null {
  if (flameSprite) return flameSprite;
  if (typeof document === 'undefined') return null;
  const sprite = document.createElement('canvas');
  sprite.width = FLAME_SPRITE_SIZE;
  sprite.height = FLAME_SPRITE_SIZE;
  const spriteContext = sprite.getContext('2d');
  if (!spriteContext) return null;
  const center = FLAME_SPRITE_SIZE / 2;
  const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(254, 240, 138, 1)');
  gradient.addColorStop(0.35, 'rgba(250, 204, 21, 0.85)');
  gradient.addColorStop(0.7, 'rgba(234, 88, 12, 0.5)');
  gradient.addColorStop(1, 'rgba(120, 30, 0, 0)');
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, FLAME_SPRITE_SIZE, FLAME_SPRITE_SIZE);
  flameSprite = sprite;
  return sprite;
}

export interface ParticleEngineOptions {
  readonly canvas: HTMLCanvasElement;
  readonly mode: ParticleMode;
  readonly intensity: EffectIntensity;
  readonly animation: AnimationLevel;
  readonly accentRgb: string;
  readonly dark: boolean;
  readonly bloodMoon: boolean;
}

export function startParticleEngine(options: ParticleEngineOptions): () => void {
  const { canvas, mode, intensity, animation, accentRgb, dark, bloodMoon } = options;
  const context = canvas.getContext('2d');
  if (!context) return () => undefined;
  const ctx: CanvasRenderingContext2D = context;

  let width = 0;
  let height = 0;
  let particles: Particle[] = [];
  let rafId: number | null = null;
  let lastTime = 0;
  let disposed = false;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  const scale = animationScale(animation) || 1;

  function countFor(): number {
    const base = PARTICLE_COUNTS[mode][intensity];
    const mobile = window.innerWidth < 640;
    return Math.max(10, Math.round(base * (mobile ? 0.68 : 1) * scale));
  }

  function build(): Particle[] {
    const list: Particle[] = [];
    const count = countFor();
    for (let i = 0; i < count; i += 1) list.push(spawnParticle(mode, width, height, true));
    return list;
  }

  /**
   * Update the backing store without re-randomising the scene. Mobile browsers
   * fire `resize` continuously while the URL bar collapses during a scroll; a
   * full rebuild there teleported every particle and flashed the canvas. Keep
   * the existing particles and scale them into the new viewport instead.
   */
  function resize(rebuild = true): void {
    const nextWidth = Math.max(1, Math.floor(window.innerWidth));
    const nextHeight = Math.max(1, Math.floor(window.innerHeight));
    if (!rebuild && nextWidth === width && nextHeight === height) return;

    const previousWidth = width;
    const previousHeight = height;
    width = canvas.width = nextWidth;
    height = canvas.height = nextHeight;

    if (rebuild || particles.length === 0) {
      particles = build();
      return;
    }

    const scaleX = previousWidth > 0 ? nextWidth / previousWidth : 1;
    const scaleY = previousHeight > 0 ? nextHeight / previousHeight : 1;
    for (const particle of particles) {
      particle.x *= scaleX;
      particle.y *= scaleY;
    }
  }

  function onResize(): void {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    // Coalesce URL-bar/viewport churn into one resize.
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      if (disposed) return;
      resize(false);
    }, 150);
  }

  function drawRain(dt: number): void {
    ctx.lineCap = 'round';
    for (const p of particles) {
      p.y += p.speed * dt;
      p.x += p.drift * dt;
      if (p.y - p.length > height) {
        Object.assign(p, spawnParticle('rain', width, height, false));
        continue;
      }
      if (p.x < -40) p.x = width + 40;
      if (p.x > width + 40) p.x = -40;
      ctx.strokeStyle = p.bright ? 'rgb(255, 82, 92)' : 'rgb(176, 16, 34)';
      ctx.globalAlpha = p.bright ? Math.min(0.75, p.alpha * 1.6) : p.alpha;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.drift * 1.6, p.y + p.length);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawGold(dt: number): void {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgb(250, 204, 21)';
    for (const p of particles) {
      p.phase += p.twinkle * dt;
      p.y += p.speedY * dt;
      p.x += p.drift * dt + Math.sin(p.phase) * 0.25;
      if (p.y < -12) {
        Object.assign(p, spawnParticle('gold', width, height, false));
        continue;
      }
      if (p.x < -12) p.x = width + 12;
      if (p.x > width + 12) p.x = -12;
      const alpha = p.alpha * (0.65 + Math.sin(p.phase) * 0.35);
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSakura(dt: number): void {
    for (const p of particles) {
      p.oscillation += p.oscillationSpeed * dt;
      p.x += (p.speedX + Math.sin(p.oscillation) * 1.2) * dt;
      p.y += p.speedY * dt;
      p.angle += p.angularSpeed * dt;
      if (p.y > height + 20) {
        Object.assign(p, spawnParticle('sakura', width, height, false));
        continue;
      }
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      const cos = Math.cos(p.angle) * p.size;
      const sin = Math.sin(p.angle) * p.size;
      ctx.setTransform(cos, sin, -sin, cos, p.x, p.y);
      ctx.fillStyle = p.color;
      if (SAKURA_PETAL_PATH) {
        ctx.fill(SAKURA_PETAL_PATH);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0.5, -0.5, 1, -0.25, 1, 0);
        ctx.bezierCurveTo(1, 0.25, 0.5, 0.5, 0, 0);
        ctx.fill();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawFlames(dt: number): void {
    ctx.globalCompositeOperation = 'lighter';
    const sprite = getFlameSprite();
    for (const p of particles) {
      if (p.kind === 'spark') {
        p.life += 0.012 * dt;
        p.y -= p.speedY * dt;
        p.x += p.drift * dt + Math.sin(p.life * 12) * 0.6;
        if (p.life >= 1 || p.y < height * 0.18) {
          Object.assign(p, spawnParticle('nozarashi', width, height, false));
          continue;
        }
        ctx.fillStyle = 'rgb(253, 224, 71)';
        ctx.globalAlpha = (1 - p.life) * 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      p.life += (0.007 + p.heat * 0.006) * dt;
      p.wobble += p.wobbleSpeed * dt;
      p.y -= p.speedY * dt;
      p.x += (p.drift + Math.sin(p.wobble) * 0.9) * dt;
      if (p.life >= 1 || p.y < height * 0.18) {
        Object.assign(p, spawnParticle('nozarashi', width, height, false));
        continue;
      }
      const fade = Math.sin(p.life * Math.PI);
      const alpha = Math.max(0.08, fade * (dark ? 0.8 : 0.5));
      const radius = p.size * (0.5 + p.life * 0.9);
      if (sprite) {
        const widthScale = radius * 1.44;
        const heightScale = radius * 2.3;
        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprite,
          p.x - widthScale / 2,
          p.y - heightScale / 2,
          widthScale,
          heightScale,
        );
        continue;
      }
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      gradient.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
      gradient.addColorStop(0.35, `rgba(250, 204, 21, ${alpha * 0.85})`);
      gradient.addColorStop(0.7, `rgba(234, 88, 12, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(120, 30, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, radius * 0.72, radius * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawReiatsu(dt: number): void {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.pulse += p.pulseSpeed * dt;
      p.y += p.speedY * dt;
      p.x += (p.speedX + Math.sin(p.pulse) * 0.6) * dt;
      const alpha = Math.max(0.15, Math.min(1, p.opacity + Math.sin(p.pulse) * 0.25));
      if (p.y < -20) {
        Object.assign(p, spawnParticle('reiatsu', width, height, false));
        continue;
      }
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;

      if (p.isBladeShard) {
        const cos = 0.7071;
        const sin = -0.7071;
        ctx.setTransform(cos, sin, -sin, cos, p.x, p.y);
        ctx.fillStyle = bloodMoon ? 'rgb(255, 30, 45)' : `rgb(${accentRgb})`;
        ctx.globalAlpha = bloodMoon ? alpha * 0.35 : alpha * 0.3;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 2.5, p.size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bloodMoon ? 'rgb(255, 120, 130)' : 'rgb(255, 255, 255)';
        ctx.globalAlpha = bloodMoon ? alpha : alpha * 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = bloodMoon ? 'rgb(255, 30, 45)' : `rgb(${accentRgb})`;
        ctx.globalAlpha = bloodMoon ? alpha * 0.28 : alpha * 0.22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bloodMoon ? 'rgb(255, 220, 220)' : 'rgb(255, 255, 255)';
        ctx.globalAlpha = bloodMoon ? alpha * 0.95 : alpha * 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawStarfield(dt: number): void {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.phase += p.twinkle * dt;
      p.x += p.drift * dt;
      const twinkle = 0.58 + Math.sin(p.phase) * 0.42;
      const alpha = Math.max(0.12, p.alpha * twinkle);
      if (p.x < -4) p.x = width + 4;
      if (p.x > width + 4) p.x = -4;
      if (p.bright) {
        ctx.fillStyle = `rgb(${accentRgb})`;
        ctx.globalAlpha = alpha;
      } else {
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.globalAlpha = alpha * 0.8;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (p.bright) {
        ctx.fillStyle = `rgb(${accentRgb})`;
        ctx.globalAlpha = alpha * 0.22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function draw(dt: number): void {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (mode === 'rain') drawRain(dt);
    else if (mode === 'gold') drawGold(dt);
    else if (mode === 'sakura') drawSakura(dt);
    else if (mode === 'nozarashi') drawFlames(dt);
    else if (mode === 'reiatsu') drawReiatsu(dt);
    else drawStarfield(dt);
    ctx.globalCompositeOperation = 'source-over';
  }

  function animate(now: number): void {
    if (disposed) return;
    if (document.hidden) {
      rafId = null;
      return;
    }
    const elapsed = lastTime ? now - lastTime : 16.667;
    lastTime = now;
    const dt = Math.max(0.25, Math.min(3, elapsed / 16.667)) * scale;
    draw(dt);
    rafId = requestAnimationFrame(animate);
  }

  resize(true);
  canvas.classList.remove('hidden');
  document.body.classList.toggle('blood-rain-on', mode === 'rain');
  window.addEventListener('resize', onResize, { passive: true });

  const onVisibility = () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId && !disposed) {
      lastTime = 0;
      rafId = requestAnimationFrame(animate);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  rafId = requestAnimationFrame(animate);

  return () => {
    disposed = true;
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    document.body.classList.remove('blood-rain-on');
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.add('hidden');
  };
}

export interface CursorTrailOptions {
  readonly canvas: HTMLCanvasElement;
  readonly accent: string;
}

export function startCursorTrail({ canvas, accent }: CursorTrailOptions): () => void {
  const context = canvas.getContext('2d');
  if (!context) return () => undefined;
  const ctx: CanvasRenderingContext2D = context;

  const MAX_POINTS = 10;
  let points: { x: number; y: number; life: number }[] = [];
  let rafId: number | null = null;
  let lastTime = 0;
  let disposed = false;

  function size(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function animate(now: number): void {
    if (disposed) return;
    if (document.hidden) {
      rafId = null;
      return;
    }
    const elapsed = lastTime ? now - lastTime : 16.667;
    lastTime = now;
    const dt = Math.max(0.25, Math.min(3, elapsed / 16.667));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;

    let lifeSum = 0;
    for (const point of points) lifeSum += Math.max(0, point.life);
    const avgLife = points.length ? lifeSum / points.length : 0;

    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.globalAlpha = avgLife * 0.12;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.globalAlpha = avgLife * 0.55;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }

    if (points.length) {
      ctx.beginPath();
      for (const point of points) {
        const radius = Math.max(0.8, 2.6 * Math.max(0, point.life));
        ctx.moveTo(point.x + radius, point.y);
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      }
      ctx.globalAlpha = avgLife * 0.7;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    for (const point of points) point.life -= 0.055 * dt;
    points = points.filter((point) => point.life > 0);

    if (points.length > 0) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.add('hidden');
    }
  }

  function onMove(event: PointerEvent): void {
    if (document.hidden) return;
    if (event.pointerType === 'touch') return;
    size();
    canvas.classList.remove('hidden');
    points.push({ x: event.clientX, y: event.clientY, life: 1 });
    if (points.length > MAX_POINTS) points.shift();
    if (!rafId) {
      lastTime = 0;
      rafId = requestAnimationFrame(animate);
    }
  }

  size();
  document.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('resize', size);

  return () => {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    document.removeEventListener('pointermove', onMove);
    window.removeEventListener('resize', size);
    points = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.add('hidden');
  };
}
