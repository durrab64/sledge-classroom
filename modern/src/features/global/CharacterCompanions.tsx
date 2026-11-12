// Anime character companions — port of legacy bleach-easter-egg.js.
// One character on screen at a time, alternating sides, cadence from the
// visitor preference, paused by Quiet Mode, reduced motion, animation off,
// hidden tabs, or the character pop-up toggle. All timers/listeners are
// removed when the component unmounts or preferences change.

import { useEffect, useRef } from 'react';
import { useGlobalExperience } from './GlobalExperienceContext';

interface CharacterDefinition {
  id: string;
  name: string;
  src: string;
  fallbackSrc: string;
  theme: { bg: string; border: string; text: string };
  dialogues: string[];
}

const CHARACTERS: CharacterDefinition[] = [
  {
    id: 'orihime',
    name: 'Orihime',
    src: '/orihime.webp',
    fallbackSrc: '/orihime.gif',
    theme: { bg: 'linear-gradient(135deg,#fff0f6 0%,#ffe4f0 100%)', border: '#f472b6', text: '#9d174d' },
    dialogues: ['KAWAIII~! \u2665', 'Hewwooo! \u2728', 'Ehehe~ \uD83D\uDC97', 'Haiii! \u2665', 'Ganbatte! \u2728'],
  },
  {
    id: 'ichigo',
    name: 'Ichigo',
    src: '/ichigo.gif',
    fallbackSrc: '/ichigo.gif',
    theme: { bg: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)', border: '#fb923c', text: '#7c2d12' },
    dialogues: ['Heh, studying? \uD83D\uDC4A', 'BANKAI!! \u26A1', 'Not bad! \uD83D\uDE01', 'Keep it up! \uD83D\uDD25', 'Oi, focus! \uD83D\uDC4B'],
  },
  {
    id: 'miku',
    name: 'Miku',
    src: '/miku.gif',
    fallbackSrc: '/miku.gif',
    theme: { bg: 'linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%)', border: '#2dd4bf', text: '#134e4a' },
    dialogues: ['Miku Miku~! \u2665', 'Let\u2019s study! \uD83C\uDFB5', 'Ganbare ne~! \u2728', 'Hatsune Miku desu! \uD83C\uDFB6', 'Yay yay~! \uD83D\uDC97'],
  },
];

const FREQUENCY = {
  rare: { delay: 65000, jitter: 26000, first: 6000 },
  normal: { delay: 26000, jitter: 14000, first: 1800 },
  frequent: { delay: 12000, jitter: 7000, first: 900 },
} as const;

const CONFIG = {
  charSize: 92,
  charSizeMobile: 68,
  stayDuration: 3600,
  zIndex: 1500,
};

export function CharacterCompanions() {
  const { settings, decorativeAllowed } = useGlobalExperience();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const enabled = settings.characterPopups && settings.characterFrequency !== 'off';

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const container: HTMLDivElement = node;

    const frequency = settings.characterFrequency;
    const preset = frequency === 'off' ? null : FREQUENCY[frequency];
    if (!enabled || !preset || !decorativeAllowed) return;

    let nextSide: 'left' | 'right' = 'left';
    let charIndex = 0;
    let isAnimating = false;
    let currentWrap: HTMLDivElement | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let removed = false;

    const getSize = () => (window.innerWidth <= 640 ? CONFIG.charSizeMobile : CONFIG.charSize);

    const clearTimers = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    function dismiss(character?: HTMLDivElement | null): void {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      const wrap = character ?? currentWrap;
      if (!wrap) return;
      const bubble = wrap.querySelector('.bee-bubble');
      bubble?.classList.remove('bee-show');
      wrap.classList.remove('bee-active');
      setTimeout(() => {
        wrap.remove();
        if (currentWrap === wrap) currentWrap = null;
        isAnimating = false;
      }, 420);
    }

    function showCharacter(): void {
      if (removed || isAnimating || document.hidden) return;
      const char = CHARACTERS[charIndex % CHARACTERS.length];
      charIndex += 1;
      isAnimating = true;

      const side = nextSide;
      nextSide = side === 'left' ? 'right' : 'left';

      const wrap = document.createElement('div');
      wrap.className = `bee-wrap ${side === 'left' ? 'bee-left' : 'bee-right'}`;
      wrap.title = `${char.name} says hello`;
      wrap.style.zIndex = String(CONFIG.zIndex);

      const size = getSize();
      const viewportHeight = window.innerHeight;
      const top = Math.round(viewportHeight * (0.36 + Math.random() * 0.22));
      const maxTop = Math.max(90, viewportHeight - size - 96);
      wrap.style.top = `${Math.max(96, Math.min(maxTop, top))}px`;

      const img = document.createElement('img');
      img.className = 'bee-img';
      img.src = char.src;
      img.alt = char.name;
      img.width = size;
      img.height = size;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.width = `${size}px`;
      img.style.height = `${size}px`;
      img.addEventListener('error', () => {
        if (char.fallbackSrc && img.src.indexOf(char.fallbackSrc) === -1) {
          img.src = char.fallbackSrc;
        }
      });

      const bubble = document.createElement('div');
      bubble.className = `bee-bubble ${side === 'left' ? 'bee-bubble-left' : 'bee-bubble-right'}`;
      bubble.style.background = char.theme.bg;
      bubble.style.borderColor = char.theme.border;
      bubble.style.color = char.theme.text;
      bubble.textContent = char.dialogues[Math.floor(Math.random() * char.dialogues.length)];

      wrap.appendChild(bubble);
      wrap.appendChild(img);
      container.appendChild(wrap);
      currentWrap = wrap;

      wrap.addEventListener('click', () => {
        bubble.textContent = char.dialogues[Math.floor(Math.random() * char.dialogues.length)];
        bubble.classList.add('bee-show');
        wrap.style.transform = side === 'left' ? 'translateX(14%)' : 'translateX(-14%)';
        setTimeout(() => {
          if (wrap.isConnected) wrap.style.transform = '';
        }, 220);
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => dismiss(wrap), 1400);
      });

      requestAnimationFrame(() => {
        wrap.classList.add('bee-active');
        setTimeout(() => {
          if (wrap.isConnected) bubble.classList.add('bee-show');
        }, 240);
      });

      hideTimer = setTimeout(() => dismiss(wrap), CONFIG.stayDuration);
    }

    function schedule(delay?: number): void {
      clearTimers();
      if (removed || !preset) return;
      const next = typeof delay === 'number' ? delay : preset.delay + Math.random() * preset.jitter;
      timer = setTimeout(() => {
        timer = null;
        showCharacter();
      }, next);
    }

    const onVisibility = () => {
      if (document.hidden) {
        clearTimers();
        dismiss();
      } else {
        schedule();
      }
    };

    const onResize = () => {
      if (!currentWrap) return;
      const size = getSize();
      const safe = Math.min(
        window.innerHeight - size - 90,
        Math.max(96, window.innerHeight * 0.42),
      );
      currentWrap.style.top = `${safe}px`;
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize, { passive: true });
    schedule(preset.first);

    return () => {
      removed = true;
      clearTimers();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      if (currentWrap) {
        currentWrap.remove();
        currentWrap = null;
      }
    };
  }, [enabled, settings.characterFrequency, decorativeAllowed]);

  return <div id="bee-container" ref={containerRef} aria-hidden="true" />;
}
