# Firebase Preview Refresh Report

Channel: `react-preview-20261112`
URL: https://sledge-classroom--react-preview-20261112-fscmuiwe.web.app
Project: `sledge-classroom`
Hosting config: `firebase.modern.json`

Status: **PREVIEW REFRESHED AND VERIFIED — AWAITING OWNER REVIEW**

The existing preview channel was refreshed in place. No second channel was created, no
production release occurred, no authentication authorized-domain change was made, and no
Firebase data, rules, schema or index was modified.

## Git Baseline and Deployed Commits

| Item | Value |
| --- | --- |
| Branch | `modernization/react-foundation` |
| Expected refinement commit | `97f42e6c57d26062068c130e9515c1ecc47a7d97` |
| Deployed source commit | `850e242a4b524f8d63d0a6b7ca1aafe7ff918644` |
| Deployed source commit subject | `fix(global): close dock after mouse-click focus leaves` |
| Parent refinement commit | `97f42e6c57d26062068c130e9515c1ecc47a7d97` |

This report is committed on top as a docs-only change; it does not alter the built
bundle. The deployed assets correspond to source commit `850e242`.

The first refresh deployed `97f42e6` (version `c109285060cd1ae7`). Live verification
then exposed a real dock defect: a mouse click leaves focus on the clicked option, and
the previous focus check treated that as keyboard focus, so pointer-leave never closed
the dock. The check was narrowed to `:focus-visible`, a regression test was added, and
the same channel was refreshed again with `850e242` (version `2ee017f51cb0d980`). The
final channel serves `850e242`.

Root `firebase.json` was not modified:
`DF19650C96D4756414B288EEC06F42AA1B55C7F13A01F0F226022811F12DB10C` (unchanged before
and after this task). `.firebase/hosting..cache` retains
`732BDBCD76C1835D11BC4A3DD6136E92E5D4C6E50F53C19221631A75F557BBEA`.

`modern/.env.local` exists and remains Git-ignored; its contents were never read or
printed. Unrelated working-tree changes were preserved.

## Build and Quality Gates

Run in `modern/` on final commit `850e242`:

| Gate | Result |
| --- | --- |
| `npx vitest run` | **289 tests / 28 files passed** |
| `npx tsc -b` | exit 0 |
| `npm run build` | exit 0; only the pre-existing `>500 kB` chunk warning |
| `npx oxlint` | exit 0; only pre-existing warnings |

Test count moved from 288 to 289 because the dock fix added one regression test for
"mouse click focus does not hold the dock open". Focused effect/dock tests are 13/13.

Built entry: `assets/index-uwBbnG_Z.js` (1,101.56 kB, 333.31 kB gzip) and
`assets/index-BpmGty3K.css`.

`modern/dist` inspection: React application files only (HTML, JS, CSS, favicon and the
existing character images). No `.env` files, credentials, service-account keys, private
keys or source maps. No legacy root frontend files were included.

## Preview Channel

| Item | Value |
| --- | --- |
| Channel | `react-preview-20261112` (existing, refreshed in place) |
| URL | https://sledge-classroom--react-preview-20261112-fscmuiwe.web.app |
| Final hosting version | `2ee017f51cb0d980` |
| Last release | 2026-11-12 19:00:51 |
| Expiry | 2026-11-19 19:00:40 |
| Deploy mode | `hosting:channel:deploy` with `--no-authorized-domains` |

`hosting:channel:list` shows exactly the existing preview channel and the `live` channel.
The `live` release date is unchanged at 2026-11-11 13:39:01.

### Deployed assets match the local build

All **20 files** in `modern/dist` were fetched from the preview URL and SHA-256 compared
with the local build of `850e242`: **20 checked, 0 mismatches**. Remote and local
`index.html` both reference `assets/index-uwBbnG_Z.js` and
`assets/index-BpmGty3K.css`.

## Scroll Verification (live preview)

At 320, 390, 768, 1024 and 1440 px:

- Particle canvas is visible and keeps animating during and after scrolling.
- Scroll position reached 1400 px in every run.
- Scroll progress transform is non-zero and back-to-top becomes visible.
- No horizontal overflow and no uncaught page exceptions.

Mobile viewport continuity (320/390, three height changes 844 → 760 → 700 → 844):

- Four canvas samples per run all had non-zero coverage; no blank frame was observed.
- Canvas width stayed at the viewport width, height returned to 844.
- Scroll position remained 1400 px across the resizes.
- No page reload or route change occurred.

Reduced motion (1440): `prefers-reduced-motion: reduce` matched, decorative canvas
hidden, `body.effects-paused` set, content still visible.

Quiet Mode (1440): `body.quiet-mode` set, decorative canvas hidden, content still
visible.

These checks confirm the deployed behavior; the particle-preservation path is also
covered by the committed unit tests.

## Dock Verification (live preview)

At 768, 1024 and 1440 px, using real CDP pointer movement:

| Check | Result |
| --- | --- |
| Hover trigger opens dock | pass |
| Cross 10 px gap into expanded bar | stays open |
| Move onto Theme, open popover | popover opens, dock stays open |
| Move to Quiet option | stays open after 650 ms |
| Move to Music option | stays open after 650 ms |
| Leave entire region, at 350 ms | still open (within 400 ms grace) |
| Leave entire region, at 600 ms | **closed** |
| Leave, re-enter at 200 ms, wait 700 ms | stays open |
| Mouse-click an option then leave | closes on schedule (fix verified) |
| Tab focus inside dock | dock stays open |
| Escape | dock closes |
| Focus after Escape | restored to `#dock-toggle` |

At 320 and 390 px with touch emulation: tap opens the dock and a second tap closes it;
pointer-leave does not apply. No exceptions were recorded.

## Routes, Responsive Layout and Public Reads

Checked at 320, 390, 768, 1024 and 1440 px:

| Route | Result |
| --- | --- |
| Home (`#/`) | loads, no overflow |
| Courses (`#/courses`) | loads, no overflow |
| Course detail (`#/courses/automata`) | "Theory of Automata", no overflow |
| Reading Room (`#/courses/automata/lectures/vCUHTxXZBaYsYg0xbCL6`) | "Lecture 02 Regular Expressions", reader shell visible, no overflow |
| Labs (`#/labs`) | "The Laboratory", no overflow |
| Calendar (`#/calendar`) | "The Calendar", no overflow |
| Reader index (`#/reader`) | intentionally redirects to `/courses` |
| Admin while signed out (`#/admin`) | redirects to `#/login`, shows "Admin Login"; "Resource Management" never rendered |

Public Firebase reads: Firestore responses were all successful (HTTP 200) at every
width — 49, 36, 59, 25 and 24 responses respectively, with zero 4xx/5xx. No Realtime
Database request was required. **Zero write-like requests** (`Write`/`Commit` streams,
`PUT`, `PATCH`, `DELETE`) were observed. No sign-in was attempted and no production
Firestore or RTDB write was submitted.

## Security Headers and Cache

| Response | Headers observed |
| --- | --- |
| `/` and `/index.html` | `Cache-Control: no-cache`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` |
| `/assets/index-uwBbnG_Z.js` | `Cache-Control: public, max-age=31536000, immutable` plus the same security headers |
| `/favicon.svg` | `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` plus the same security headers |
| Rewrite paths such as `/courses` and `/admin` | `Cache-Control: max-age=3600` (Firebase default for rewritten HTML) plus the same security headers |

HSTS is present (`max-age=31556926; includeSubDomains; preload`). Security headers are
applied consistently. There is still **no Content-Security-Policy** on this preview,
matching the pre-existing limitation.

## Production and Legacy Hosting

- Only the preview channel was released. `firebase deploy` was not run.
- The `live` channel's last release remains 2026-11-11 13:39:01.
- Production `https://sledge-classroom.web.app/index.html` still references the legacy
  `app.js` entry, not the React bundle.
- Root `firebase.json` hash is unchanged.
- No Firebase Auth authorized domains were changed (`--no-authorized-domains`).
- `.firebase/hosting..cache` hash is unchanged.

## Remaining Limitations

- No CSP is configured on the preview (pre-existing).
- The preview domain is still not an authorized Auth domain, so owner sign-in on the
  preview remains unavailable (pre-existing). This refresh did not change Auth config.
- Verification used headless Chrome with device emulation, not physical phones/tablets.
- The `/reader` index redirects to `/courses` by design; Reading Room was verified
  through a real course resource URL.
- Rewrite fallbacks use Firebase's default `max-age=3600`; the explicitly configured
  assets, images, `/` and `/index.html` rules behave as intended.
- The production bundle still emits the existing `>500 kB` chunk warning.
- No production-readiness or cutover claim is made.

## Stop Point

Preview refreshed and verified. Production, legacy Hosting, Auth configuration, rules
and data remain untouched. Awaiting owner review.
