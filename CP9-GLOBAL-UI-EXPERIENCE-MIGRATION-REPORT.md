# CP9 â€” Global UI & Experience Migration Report

## Outcome

The remaining shared/global Sledge Classroom experience now lives in the React app
under `modern/`. The migration preserves the legacy visual identity, storage keys,
theme values, dock markup ids, character assets, Now Playing contract, Quiet Mode
semantics and reduced-motion behavior.

No legacy source, Firebase/RTDB rules, schemas, production data, Hosting config or
deployed environment was modified. All implementation changes are confined to
`modern/`; this report is the only root-level addition.

Baseline: `8e7fbda` (CP8). This checkpoint stops for review after a local commit.

## What was migrated

| Area | Implementation |
| --- | --- |
| Theme system | `visualSettings.ts` + `GlobalExperienceContext.tsx`: light/dark plus the seven legacy Zanpakuto themes (`default`, `getsuga-tensho`, `nozarashi`, `senbonzakura`, `kyoka-suigetsu`, `tensa-zangetsu`, `hogyoku`) |
| Appearance presets | All six legacy presets (`classic`, `anime`, `soul`, `golden`, `void`, `hogyoku`) with their original accent, font, card, animation and character values |
| Customization | Accent, font, cursor, cards, animation, character frequency, reset overrides |
| Floating dock | 52px toggle, hover/tap/keyboard expansion, anchored theme and effects popovers, preset grid, fine-tune panel, Music and Quiet actions |
| Theme effects | Signature particle on theme pick, Blood Moon mode, particle intensity, atmosphere layer, spotlight, cursor trail, clear-all |
| Character pop-ups | Orihime, Ichigo and Miku, alternating sides, cadence presets, dialogue bubbles, click dismissal, pause on hidden tab/Quiet Mode/reduced motion |
| Now Playing | Rotating CD, slide-out sleeve (â€œmusic pop-upâ€), staleness/offline handling, artwork fallback, YouTube/YT Music links, no playback |
| Quiet Mode | Hides decorative particles/canvas, characters, moon, ambient layers and popup effects; dock and controls remain usable |
| Global effects | Blood-rain aura, aurora, mist, spotlight, particle canvas, cursor-trail canvas, scroll progress, back-to-top, click ripple |
| Navigation chrome | PKT clock and light/dark toggle restored to the navbar |
| Shortcuts | `?`, `Alt+T`, `Alt+E`, `Alt+M`, `Alt+Q`, `Escape`, with focus restore and typing-field suppression |
| Toasts | Legacy toast container, tones, timing and dismissal |

## Architecture

- **One provider** (`GlobalExperienceProvider`) owns preferences, Quiet Mode,
  dock/pop-up state, music expansion, toasts and the single app-wide RTDB
  subscription. It is mounted once in `main.tsx`, above the router.
- **One global host** (`GlobalExperience`) is mounted once in the shared layout,
  so the dock, effects, characters, music widget and dialogs survive route changes
  without remounting or duplicating listeners.
- **Firebase stays in the service layer.** `NowPlayingRepository.subscribeNowPlaying`
  gained an optional error callback and optional `songUrl` / `source` /
  `isPlaying` mapping. No writes or Firebase calls were added to components.
- **Lifecycle cleanup** is explicit for the RTDB subscription, toast timers,
  character timers, pointer/scroll/resize/visibility listeners and every
  `requestAnimationFrame` loop.
- **Preference application** writes the exact legacy `data-*` attributes, CSS
  variables and body classes (`quiet-mode`, `characters-off`, `effects-paused`).
- **Reduced motion is separate from Quiet Mode.** System `prefers-reduced-motion`
  is tracked independently; either condition suppresses decorative loops without
  mutating the stored user setting.

## Preserved legacy contracts

Storage keys are unchanged: `theme`, `zanpakuto_theme`, `sledge_accent`,
`sledge_font`, `sledge_cursor`, `sledge_cards`, `sledge_animation`,
`sledge_character_freq`, `character_popups`, `effect_particle`,
`effect_atmosphere`, `effect_intensity`, `effect_cursor_trail`, `sledge_spotlight`,
`effects_reduced_motion`, `quiet_mode`, `sledge_preset`, plus the legacy
`effect_sakura` / `effect_nozarashi` / `effect_reiatsu` migration keys.

Dock ids are preserved: `#dock-shell`, `#sledge-dock`, `#dock-toggle`,
`#dock-theme-popup`, `#dock-effects-popup`, `#dock-themes`, `#dock-effects`,
`#dock-music`, `#dock-quiet`, `#tensa-moon`. Character assets are served from
`modern/public` at the same paths (`/orihime.webp`, `/orihime.gif`, `/ichigo.gif`,
`/miku.gif`).

Global CSS is a verbatim port of the legacy global layers into
`modern/src/styles/cp9-global.css` (Zanpakuto palettes, moon, dock, Quiet Mode,
ambient layers, spotlight, scroll/back-to-top, presets/customization, shortcuts,
small-phone dock rules, Now Playing styles, toasts and character styles).

## Tests added

- `modern/test/features/globalVisualSettings.test.ts` â€” defaults, legacy storage
  keys, persistence/clearing, attribute and body-class application, presets,
  accents, signature effects, reduced-motion/Quiet Mode suppression and the
  legacy particle migration keys.
- `modern/test/features/globalExperience.test.tsx` â€” mode selection and
  persistence, Zanpakuto theme application, Quiet Mode, dock open/close/active
  states/Escape focus, effect toggles, system reduced motion, Now Playing
  subscribe/render/error/cleanup, music pop-up toggle/dismiss and provider
  persistence across route changes with no duplicate subscription.

Firebase/RTDB is mocked through an injected `nowPlayingReader`; no SDK or network
is used in tests.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` (strict) | Clean |
| `vitest run` | 19 files / 180 tests passed |
| `npm run build` | Passed â€” 92 modules; CSS 175.03 kB; JS 1,138.04 kB |
| `oxlint` | 0 errors; 22 warnings (mostly pre-existing `set-state-in-effect` / fast-refresh advisories) |
| Browser widths | 320, 390, 768, 1024, 1440 px |
| Layout | No horizontal overflow on Home, Courses, Labs, Calendar or reader at the tested widths |
| Dock popovers | Fit above the dock at every width (`320px`: 284Ã—640; `390px`: 300Ã—640; `768px`+: 280â€“310Ã—540â€“640), scrollable, anchored, no viewport overflow |
| Theme persistence | Theme, dark mode and Quiet Mode survive reload and route changes |
| Reduced motion | Canvas hidden, effect toggles disabled, explanatory note shown, Quiet Mode still independently available |
| Keyboard/focus | Escape closes popover/dock, first dock action receives focus on open, shortcuts dialog focuses its close button, `Alt+T/E/Q` and `?` verified |
| Console | No console errors on Home, Courses, Labs, Calendar or reader routes |

Visual comparison against the legacy `index.html` at the same widths confirmed the
same dock placement, theme accents, compact phone dock layout, PKT clock visibility
rule (hidden below 1100px), character placements and global page chrome.

## Known limitations / notes

- No audio playback, admin resource management or Chota Don work was added.
- With Firebase unconfigured (local preview), migrated data-driven pages show
  their existing CP6â€“CP8 error/retry states. Global UI remains fully functional.
- The full test suite showed one intermittent failure in the pre-existing
  `readingRoom.test.tsx` under parallel load; that file passed 12/12 in isolation
  and the full suite passed 179/179 on rerun. CP9 tests were stable across runs.
- The orphaned Cloudflare `RateLimiterDO` namespace cleanup remains an unrelated
  open item.

## Files

Added:

- `modern/src/features/global/GlobalExperienceContext.tsx`
- `modern/src/features/global/GlobalExperience.tsx`
- `modern/src/features/global/GlobalEffects.tsx`
- `modern/src/features/global/FloatingDock.tsx`
- `modern/src/features/global/CharacterCompanions.tsx`
- `modern/src/features/global/NowPlayingWidget.tsx`
- `modern/src/features/global/particleEngine.ts`
- `modern/src/features/global/visualSettings.ts`
- `modern/src/styles/cp9-global.css`
- `modern/public/orihime.webp`, `orihime.gif`, `ichigo.gif`, `miku.gif`
- `modern/test/features/globalVisualSettings.test.ts`
- `modern/test/features/globalExperience.test.tsx`
- `CP9-GLOBAL-UI-EXPERIENCE-MIGRATION-REPORT.md`

Modified:

- `modern/src/main.tsx` â€” provider + CP9 stylesheet wiring
- `modern/src/layouts/default.tsx` â€” global host
- `modern/src/components/layout/Navbar.tsx` â€” PKT clock and theme toggle
- `modern/src/types/index.ts` â€” typed global visual model, Now Playing fields
- `modern/src/services/repositories/nowPlayingRepository.ts` â€” optional error
  callback and optional Now Playing fields
- `modern/index.html` â€” pre-paint theme flash prevention using the same keys
