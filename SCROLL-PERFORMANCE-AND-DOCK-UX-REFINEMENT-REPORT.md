# Scroll Performance and Dock UX Refinement Report

Branch: `modernization/react-foundation`
Baseline commit: `5d5edae58f7d59e1e68745ed1c7182094d5737e2`
Status: **LOCAL REFINEMENT COMPLETE — AWAITING OWNER REVIEW**

This checkpoint refines scrolling performance and floating-dock hover behavior in the
React 2.0 preview without redesigning the app, changing themes, or altering any deployed
environment. It stops after a local commit so the owner can review before any redeploy.

## Outcome

| Area | Result |
| --- | --- |
| Scroll main-thread work | Reduced in every measured mode; layout work during scroll dropped to near zero |
| Nozarashi flames | Per-frame radial-gradient allocation replaced with one cached sprite |
| Particle resize churn | Mobile URL-bar resizes are coalesced and no longer rebuild/re-randomize the scene |
| Scroll progress / back-to-top | No longer forces `scrollHeight` layout reads or a React render every scroll frame |
| Dock hover | 400 ms grace period; crossing the trigger-to-options gap keeps the dock open |
| Accessibility | Escape, focus restore, keyboard focus containment, touch/tap and reduced motion preserved |
| Tests | 12 new focused tests; full suite 288 tests / 28 files passing |
| Gates | `tsc -b`, production build and oxlint all pass (only pre-existing warnings) |

No production deployment, preview redeploy, Hosting change, rules/schema/index change,
billing change, Chrome extension change, Chota Don work, or Firebase write was performed.
`.firebase/hosting..cache` is byte-for-byte unchanged
(SHA-256 `732BDBCD76C1835D11BC4A3DD6136E92E5D4C6E50F53C19221631A75F557BBEA`).

## Root Causes Found

### Scrolling

1. **Full-viewport canvas redraw every frame.** Every particle mode clears and redraws
   the entire fixed canvas continuously. The cost is mostly unavoidable if the effect is
   visible, but per-frame allocations made it worse than necessary.
2. **Nozarashi allocated a radial gradient per flame per frame.** Each particle built a
   four-stop gradient and four rgba strings on every frame, then discarded them.
3. **Particle drawing allocated colour/style strings per particle.** Rain, gold, reiatsu
   and starfield built fresh `rgba(...)` strings inside their per-particle loops, creating
   garbage collection pressure while scrolling.
4. **`ScrollExperience` read `document.documentElement.scrollHeight` on every scroll
   frame.** That forces a synchronous layout read mid-scroll and triggered a React state
   update for the back-to-top button.
5. **Mobile viewport resize rebuilt the whole particle scene.** Collapsing/restoring the
   URL bar fires `resize`; the old handler re-randomised every particle, which read as a
   visible flash and repeated full rebuilds during a scroll.

### Dock

The expanded bar and its popovers are absolutely positioned outside the 52 px trigger
box, across a 10 px gap (`right: calc(100% + 10px)`). The old `pointerleave` closed the
dock immediately unless a popover was already open, so moving from the trigger toward the
options could close the dock mid-move.

## Changes

| File | Change |
| --- | --- |
| `modern/src/features/global/particleEngine.ts` | 150 ms debounced, passive resize handling; preserve and scale existing particles on viewport change; cached Nozarashi flame sprite drawn with `drawImage`; `globalAlpha` + static `fillStyle`/`strokeStyle` instead of per-particle rgba strings; gradient fallback retained; resize timer and listener cleanup |
| `modern/src/features/global/GlobalEffects.tsx` | Cached max-scroll value refreshed by `ResizeObserver`; rAF-coalesced scroll handling; direct class toggle for back-to-top instead of React state; no per-frame `scrollHeight` read; listener and rAF cleanup |
| `modern/src/features/global/FloatingDock.tsx` | Single 400 ms close timer; cancel on pointer entry, focus capture and re-entry; pointer-inside tracking; focus-inside check; timer cleared on dock close and unmount |
| `modern/src/styles/cp9-global.css` | `will-change: transform` on the effect and cursor-trail canvases so page scrolling does not repaint the document beneath them |
| `modern/test/features/globalScrollAndDock.test.tsx` | New: one particle loop and one scroll listener, teardown, Quiet Mode, reduced motion, route stability, dock grace/cancel/re-entry/focus/Escape/touch |
| `modern/test/features/particleEngine.test.ts` | New: resize coalescing without scene rebuild, width/height scaling, listener and timer cleanup |

### Effect fidelity

No effect was removed to improve benchmarks. Theme layers, anime effects, legacy effect
keys (`effect_sakura`, `effect_nozarashi`, `effect_reiatsu`), Quiet Mode, reduced motion
and particle fallback are unchanged. The flame sprite is baked from the same four colour
stops; alpha is applied with `globalAlpha`, which composites identically under `lighter`.
If a sprite cannot be created, the original per-particle gradient path still runs.

## Before / After

Production builds only (`vite build` + `vite preview`), headless Chrome, 390×844,
CPU throttling 4×, 3 repetitions per mode with rotated scenario order, medians shown.
The same harness ran against a stashed baseline build and the optimized build.

| Mode | Task ms | Script ms | Layout ms | Frames >33 ms | Avg frame ms |
| --- | --- | --- | --- | --- | --- |
| Effects off | 2153 → **1045** | 202 → 179 | 195 → **0.8** | 0 → 0 | 16.67 → 16.67 |
| Starfield intense | 3216 → **2641** | 703 → **421** | 205 → **0.6** | 6 → **3** | 17.24 → 16.95 |
| Sakura medium | 2362 → **1855** | 227 → 253 | 177 → **0.8** | 1 → 4 | 16.76 → 17.34 |
| Rain intense | 3032 → **2050** | 472 → **256** | 224 → **0.8** | 5 → **1** | 17.14 → 16.95 |
| Nozarashi intense | 3513 → **2918** | 388 → 356 | 164 → **1.0** | 31 → **20** | 20.38 → **18.74** |

Notes:

- The largest, most consistent win is removing the per-frame layout read: layout time
  during scroll fell from roughly 160–225 ms to about 1 ms in every mode.
- Nozarashi also completed more frames in the same wall-clock window (148 → 161) while
  producing 11 fewer frames over 33 ms.
- Sakura's frame outliers moved from 1 to 4 in this run; task time still fell by 507 ms
  and its median frame stayed at 16.7 ms. This is run-to-run noise rather than a
  regression, and the change did not touch Sakura drawing beyond static style strings.
- Headless, CPU-throttled numbers are directional. They are not a substitute for
  mid-range Android or iOS hardware.

## Dock Behavior

The dock now behaves as a single interaction region:

- Pointer leaves the trigger → a **400 ms** close timer starts.
- Pointer enters the expanded bar, a popover or an option before it fires → timer is
  cancelled and the dock stays open.
- Moving between options keeps it open; no timer is created while the pointer is inside.
- Leaving the whole region → closes after the same 400 ms delay.
- Re-entering during the delay cancels closure, so re-entry does not flicker.
- Only one timer exists at a time; it is cleared on dock close, Escape and unmount.
- Keyboard focus inside the dock holds it open regardless of pointer position.
- Escape still closes the active popup/dock and restores focus to the trigger.
- Touch/tap toggling is unchanged and does not use the hover timer.
- Reduced motion has no dependence on the timer or animation.

## Verification

### Automated gates

| Gate | Result |
| --- | --- |
| `npx vitest run test/features/globalScrollAndDock.test.tsx test/features/particleEngine.test.ts` | 12 / 12 passed |
| `npx vitest run` | **288 tests / 28 files passed** |
| `npx tsc -b` | exit 0 |
| `npm run build` | exit 0; only the pre-existing `>500 kB` chunk warning |
| `npx oxlint` | exit 0; only pre-existing warnings |
| Targeted oxlint on all changed source/test files | exit 0, no warnings |

### Browser checks (production preview build)

Real pointer movement via CDP, effect visible and scrolling, popover fit, tap behavior.

| Width | Horizontal overflow | Canvas during scroll | Progress / back-to-top | Popover fits | Tap open/close | Hover grace |
| --- | --- | --- | --- | --- | --- | --- |
| 320 | none | yes | yes | yes | yes / yes | n/a (touch) |
| 390 | none | yes | yes | yes | yes / yes | n/a (touch) |
| 768 | none | yes | yes | yes | n/a | n/a |
| 1024 | none | yes | yes | yes | n/a | n/a |
| 1440 | none | yes | yes | yes | n/a | opened across gap, closed after leaving whole region |

Also verified at 1440: `prefers-reduced-motion: reduce` pauses decorative effects
(`body.effects-paused`, canvas hidden), and Quiet Mode hides the canvas and applies
`quiet-mode`. No page exceptions were recorded at any width.

## Limitations

- Verification used headless Chrome with CPU throttling, not physical phones or tablets.
- Baseline and optimized builds were measured on the same machine and browser session
  characteristics, but absolute timings vary between runs; treat the table as relative.
- The existing preview deployment `react-preview-20261112` was **not** updated, so it
  still serves the older build. Its prior limitations also remain: no CSP and the preview
  Auth domain is not authorized. Owner sign-in on that preview is still unavailable.
- The pre-existing emulator write-verification blocker (Java 8 vs Firebase CLI requiring
  Java 21) is unrelated to this change and remains.
- No production-readiness or cutover claim is made here.

## Confirmations

- No reset, rebase, amend or history rewrite.
- No GitHub push.
- No Firebase Hosting deploy, preview redeploy or production deploy.
- No production data write; no rules, schema or index change.
- No billing, Chrome extension, Chota Don or AI change.
- Unrelated working-tree changes were preserved.
- `.firebase/hosting..cache` unchanged.
- `.env.local` and credentials were never printed.
- Commit contains only the four changed source/CSS files, the two new test files and this
  report.

## Stop Point

Local commit created. No redeploy performed. Awaiting owner review before any preview
refresh or production cutover.
