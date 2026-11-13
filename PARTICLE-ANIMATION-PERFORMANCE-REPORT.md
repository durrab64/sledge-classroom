# Particle/Canvas Animation Scroll-Performance Report

Branch: `modernization/react-foundation`
Commit: `9eb11af2afbd90bf4d8f700ec3e81e3f644050dc` — `fix(particle): remove will-change from full-viewport canvases to stop scroll-jank compositor churn`
Status: **FIXED, VERIFIED, AND DEPLOYED TO PREVIEW CHANNEL**

## Preview Deployment

| Item | Value |
| --- | --- |
| Channel | `react-preview-20261112` (refreshed in place) |
| URL | https://sledge-classroom--react-preview-20261112-fscmuiwe.web.app |
| Hosting version | `91128869cb9ac73a` |
| Deployed source commit | `9eb11af` |
| Last release | 2026-11-13 06:39:55 |
| Expiry | 2026-11-20 06:39:33 |
| Deploy mode | `hosting:channel:deploy --no-authorized-domains` |

**Deployed assets match the local build:** All 20 files in `modern/dist` were fetched from the preview URL and SHA-256 compared against the local build of `9eb11af`: **20 checked, 0 mismatches**.

## Root Cause

The performance regression during scrolling was caused by `will-change: transform` on both full-viewport particle canvases (`.sakura-canvas` and `.cursor-trail-canvas`) in `modern/src/styles/cp9-global.css`.

The intent was to keep each canvas on its own compositor layer so page scrolling would not repaint the document underneath. In practice, on this build it forced the compositor to re-evaluate/re-rasterize a full-viewport (~1440×900, DPR-scaled) GPU layer every scroll frame while the particle loop continued animating, producing long compositor frames and visible jank.

This was confirmed experimentally, not guessed:

- **Before fix** (with `will-change: transform`), headed Chrome, real GPU (ANGLE/AMD Radeon), 4× CPU throttle, scrolling while sakura/nozarashi animate:
  - 1440 sakura-medium: fps ~48–58, p95 **33–100 ms**, max **116–566 ms**
  - 1440 nozarashi-intense: fps ~50–56, p95 **33–116 ms**, max **150–166 ms**
- **Without the hint** (`NOWILLCHANGE=1` runtime toggle on the same build) matched the pre-optimization parent baseline (`5d5edae`) at ~59.5–60 fps, p95 **16.7–17 ms**, max ≤50 ms.

Trace diagnostics showed main-thread cost was small (`LocalFrameView::UpdateStyleAndLayout` ~711 µs per frame), confirming the jank was compositor-layer churn from `will-change`, not expensive per-frame particle math.

The particle engine itself was already well-structured: a single `requestAnimationFrame` loop, one debounced (150 ms) resize listener that scales rather than rebuilds particles, one visibility-change listener, and full cleanup on unmount — no duplicate loops or leaks.

## Exact Change

One file, three lines deleted (CSS comment + property):

`modern/src/styles/cp9-global.css` — removed `will-change: transform;` from the `.sakura-canvas, .cursor-trail-canvas` rule:

```css
.sakura-canvas,
.cursor-trail-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 997;
    /* Keep the full-viewport canvas on its own compositor layer so page
       scrolling never repaints the document underneath it. */
    will-change: transform;   <-- REMOVED
}
```

No JavaScript was touched: `particleEngine.ts`, `GlobalEffects.tsx`, and `FloatingDock.tsx` are all unchanged. The dock's recently fixed mouse/keyboard behavior is completely untouched.

No other `will-change` uses were removed: `.mist-blob` (ambient mist animation), `#cursor-spotlight` (mouse-follow spotlight), and `.bee-wrap` remain, as they are unrelated to the particle canvases.

## Before/After Measurements (Deployed Preview)

Headed Chrome (real GPU), 4× CPU throttle, scroll 0→~70% of page with particles animating. `p95` = 95th-percentile frame time; 16.8 ms = 60 fps budget.

| Width | Mode/Intensity | fps | p95 (ms) | max (ms) | over33 | visible | overflowX | willChange |
| --- | --- | ---:| ---:| ---:| ---:| ---:| ---:| ---: |
| 320 | sakura / medium | 53.3 | 17.3 | 150 | 10 | true | false | auto |
| 320 | sakura / intense | 58.8 | 16.8 | 66.7 | 2 | true | false | auto |
| 320 | nozarashi / medium | 58.3 | 16.8 | 83.3 | 4 | true | false | auto |
| 320 | nozarashi / intense | 59.0 | 16.8 | 50 | 3 | true | false | auto |
| 390 | sakura / medium | 58.3 | 16.8 | 66.7 | 4 | true | false | auto |
| 390 | sakura / intense | 59.3 | 16.8 | 33.4 | 3 | true | false | auto |
| 390 | nozarashi / medium | 59.0 | 16.7 | 50.1 | 2 | true | false | auto |
| 390 | nozarashi / intense | 58.8 | 16.8 | 50.1 | 3 | true | false | auto |
| 768 | sakura / medium | 58.8 | 16.8 | 66.7 | 3 | true | false | auto |
| 768 | sakura / intense | 59.0 | 16.8 | 50 | 2 | true | false | auto |
| 768 | nozarashi / medium | 58.3 | 16.8 | 50 | 4 | true | false | auto |
| 768 | nozarashi / intense | 58.8 | 16.8 | 66.7 | 3 | true | false | auto |
| 1024 | sakura / medium | 58.8 | 16.8 | 50 | 3 | true | false | auto |
| 1024 | sakura / intense | 59.3 | 16.8 | 49.9 | 2 | true | false | auto |
| 1024 | nozarashi / medium | 59.0 | 16.8 | 50 | 2 | true | false | auto |
| 1024 | nozarashi / intense | 58.8 | 16.8 | 49.9 | 3 | true | false | auto |
| 1440 | sakura / medium | 58.5 | 16.8 | 50 | 4 | true | false | auto |
| 1440 | sakura / intense | 57.0 | 16.8 | 116.7 | 5 | true | false | auto |
| 1440 | nozarashi / medium | 58.0 | 16.8 | 66.7 | 5 | true | false | auto |
| 1440 | nozarashi / intense | 58.3 | 16.8 | 66.7 | 4 | true | false | auto |

Key result: **p95 is consistently 16.7–17.3 ms (60 fps budget) at every tested width**, for both sakura and nozarashi modes. The worst single frame dropped from 566 ms (before) to 150 ms (after). Canvas is visible and animating during scroll at all five required widths (320, 390, 768, 1024, 1440). `willChange: auto` confirms the fix is deployed. No horizontal overflow anywhere.

## Dock Verification (Deployed Preview)

**Hover mode (768, 1024, 1440 px):**
- Hover trigger opens dock ✓
- Cross gap into expanded bar keeps dock open ✓
- Click Theme opens popover ✓
- Move to Quiet/Music options keeps dock open ✓
- Leave region, at 350 ms: still open (within 400 ms grace) ✓
- Leave region, at 600 ms: **closed** (400 ms grace elapsed) ✓
- Re-entry before close cancels close ✓
- Keyboard: Enter opens, Tab keeps focus inside, Escape closes and restores focus to toggle ✓

**Touch mode (320, 390 px):**
- Tap opens dock, second tap closes ✓

**Basic grace-period test (open, leave immediately, no option clicks):**
- at 350 ms: still open ✓
- at 600 ms: closed ✓
- at 1200 ms: stays closed ✓
- re-entry cancels close ✓

## Quiet Mode and Reduced Motion (Deployed Preview, 1440 px)

| Preference | quietMode | canvasHidden | effectsPaused | h1Visible | overflowX |
| --- | ---:| ---:| ---:| ---:| ---:|
| Quiet Mode | true | true | — | true | false ✓ |
| Reduced Motion | — | true | true | true | false ✓ |

## Errors and Requests (Deployed Preview)

- Console errors: **0** ✓
- Failed requests: **0** ✓
- Public Firestore reads: all successful (verified in prior session)
- Write-like requests: **0** ✓

## Quality Gates (Commit `9eb11af`)

| Gate | Result |
| --- | --- |
| `npx vitest run` | **289 tests / 28 files passed** (exit 0) |
| `npx tsc -b` | exit 0 |
| `npm run build` | exit 0 (pre-existing `>500 kB` chunk warning only) |
| `npx oxlint` | exit 0 (pre-existing warnings only) |

## Production and Legacy Hosting

- Production `https://sledge-classroom.web.app/index.html` still serves legacy `app.js` (untouched) ✓
- `live` channel release date unchanged (2026-11-11 13:39:01) ✓
- Root `firebase.json` hash unchanged: `DF19650C…B10C` ✓
- `.firebase/hosting..cache` hash unchanged: `732BDBCD…BBEA` ✓
- No Firebase Auth domain changes, no Firestore/RTDB rules changes, no production deploy ✓
- No GitHub push ✓

## Files Changed

- `modern/src/styles/cp9-global.css` — removed `will-change: transform` from particle canvas rule (3 lines deleted)
- `PARTICLE-ANIMATION-PERFORMANCE-REPORT.md` — this report (new file)

Unrelated working-tree changes were preserved. No destructive Git operations were performed.

## Remaining Limitations

- Verification used headed Chrome with device emulation on a desktop GPU (real rendering path), not physical phones/tablets.
- A small number of outlier frames (>20 ms / >33 ms) remain after the fix; these are compositor/GC catch-up spikes, not per-frame particle cost, and are far less severe than the pre-fix 566 ms spikes.
- The production bundle still emits the pre-existing `>500 kB` chunk-size warning (unrelated to this task).
- No CSP is configured on the preview (pre-existing).
- The preview domain is not an authorized Auth domain, so owner sign-in on the preview remains unavailable (pre-existing).
