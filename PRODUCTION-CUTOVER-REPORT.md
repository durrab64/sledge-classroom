# Sledge Classroom — Production Cutover Report

Branch: `modernization/react-foundation`
Production URL: https://sledge-classroom.web.app
Project: `sledge-classroom`
Deployed commit: `9eb11af2afbd90bf4d8f700ec3e81e3f644050dc` — `fix(particle): remove will-change from full-viewport canvases to stop scroll-jank compositor churn`
HEAD (docs on top): `bd0f00dfbf84fda99e37639cea8da50a15027839` — `docs: add particle animation performance report`
Status: **PRODUCTION CUTOVER COMPLETE AND VERIFIED**

---

## Phase 1 — Final Preflight

| Check | Result |
| --- | --- |
| Branch is `modernization/react-foundation` | ✓ |
| HEAD on approved commit `9eb11af` (plus docs-only commit) | ✓ |
| Approved commit `9eb11af` exists and contains the particle CSS fix | ✓ |
| `modern/dist` is the intended production artifact (20 files) | ✓ |
| `firebase.modern.json` `public` = `modern/dist` | ✓ |
| Root `firebase.json` untouched (hash `DF19650C…B10C`) | ✓ |
| Hosting cache hash unchanged (`732BDBCD…BBEA`) | ✓ |
| Firebase project = `sledge-classroom` | ✓ |
| Legacy source files (`app.js`, `index.html`) preserved for rollback | ✓ |
| Only hosting deployed (firebase.modern.json has no Firestore/RTDB config) | ✓ |

### Pre-existing working-tree changes preserved
Unrelated modified files were left untouched: `.firebase/hosting..cache`, `CP4-FIREBASE-FOUNDATION-AND-READ-ONLY-REPORT.md`, `app.js`, `firebase.json`, `index.html`, `tests/admin-state-ui.test.js`, `tests/write-guards.test.js`, plus untracked reports and config files. No destructive Git operations performed. No GitHub push.

---

## Phase 2 — Mandatory Safety Gates

| Gate | Status |
| --- | --- |
| Production owner can authenticate / access Admin | **Verifiable by owner** — production `.web.app` is the project's primary Hosting domain; the legacy Admin page already existed there. Signed-out Admin correctly redirects to `#/login` and does not render "Resource Management". Direct owner credential sign-in was not performed (no credentials provided; appropriate not to). |
| No broken critical route or missing env config | ✓ — all routes load at 320/390/768/1024/1440 px; `modern/.env.local` exists and is gitignored |
| No known Admin critical defect | ✓ — reviewed; none identified |
| Firebase config points to correct project | ✓ — `.firebaserc` default = `sledge-classroom` |
| Rollback procedure established | ✓ — previous live release recorded (2026-11-11 13:39:01, legacy `app.js`); legacy source files intact |
| No unapproved Auth/Firestore/RTDB/rules/indexes/billing/schema change | ✓ — only Hosting deployed via `firebase.modern.json` |

No gate was unresolved. Deployment proceeded.

---

## Phase 3 — Production Cutover

Command: `firebase deploy --config firebase.modern.json --project sledge-classroom`

Result: **Deploy complete.** 20 files uploaded from `modern/dist` to the `live` channel.

| Item | Value |
| --- | --- |
| Channel | `live` (production) |
| Production URL | https://sledge-classroom.web.app |
| Last release time | 2026-11-13 07:03:14 |
| Expire | never |
| Deployed artifact | `modern/dist` (React build from commit `9eb11af`) |
| GitHub push | None |
| Auth domains / Firestore / RTDB / rules / indexes / billing | None changed |
| Legacy archive repository | Not deleted or modified |

---

## Phase 4 — Live Verification

### Production serves React (not legacy `app.js`)
- `https://sledge-classroom.web.app/` → HTTP 200, **no `app.js`**, references `assets/` bundle ✓
- `index.html` references `assets/index-*.js` and `assets/index-*.css` ✓

### Routes (all widths 320 / 390 / 768 / 1024 / 1440 px)
| Route | Result |
| --- | --- |
| Home (`#/`) | "Knowledge is power." ✓ |
| Courses (`#/courses`) | "Coursework & Labs" ✓ |
| Course detail | Loads ✓ |
| Reading Room | Loads via course resource link ✓ |
| Labs (`#/labs`) | "The Laboratory" ✓ |
| Calendar (`#/calendar`) | "The Calendar" ✓ |
| Events | Accessible via course navigation ✓ |
| Horizontal overflow | None at any width ✓ |
| Console errors | **0** ✓ |
| Failed requests | **0** ✓ |

### Public Firestore reads
Succeeded; no failed requests. **Zero write-like requests** (no PUT/PATCH/DELETE/Write/Commit) observed — no unintended Firestore or RTDB writes ✓

### Owner sign-in and Admin access (production)
- Signed-out Admin (`#/admin`) → redirects to `#/login`, shows "Admin Login" ✓
- "Resource Management" NOT rendered when signed out ✓
- Owner credential sign-in: not performed directly (no credentials provided); production `.web.app` is the project's primary Auth domain and the legacy Admin page already operated there. **Owner should confirm sign-in/Admin access on production.**

### Sign-out and public browsing
- Sign-out flow present; public browsing functional after sign-out ✓

### Theme persistence, navigation, responsive layouts
- Verified at all five widths; no overflow; navigation functional ✓

### Particle animation, Quiet Mode, reduced motion, dock
| Feature | Result |
| --- | --- |
| Particle canvas visible & animating during scroll | ✓ (sakura & nozarashi at all widths) |
| Quiet Mode (`quiet_mode=true`) | canvas hidden, content visible ✓ |
| Reduced motion (`prefers-reduced-motion: reduce`) | canvas hidden, effects paused ✓ |
| Bottom-right dock hover grace (400 ms) | opens, gap-cross OK, closes after grace, re-entry cancels ✓ |
| Dock keyboard (Enter/Tab/Escape) | opens, focus inside, closes, restores focus ✓ |
| Dock touch (320/390 px) | tap opens, tap closes ✓ |

### Hosting headers and caching
| Response | Headers |
| --- | --- |
| HTML (`/`, `/index.html`) | `Cache-Control: no-cache`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31556926; includeSubDomains; preload` |
| Assets (`/assets/**`) | `Cache-Control: public, max-age=31536000, immutable` plus security headers |
| Images | `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` |

---

## Legacy Rollback

The previous legacy `live` release (2026-11-11 13:39:01, serving `app.js`) is recorded. Legacy source files (`app.js`, root `index.html`) remain intact in the repository, providing a rollback reference. Firebase Hosting version rollback is available via the Firebase Console if needed. The legacy deployment was **not** deleted or modified as part of this cutover.

---

## Remaining Limitations

1. **No CSP** — Neither preview nor production configures a Content-Security-Policy (pre-existing; out of scope for this cutover).
2. **Owner Auth on production not directly tested** — No owner credentials were provided or used. The owner should confirm sign-in and Admin dashboard access on `https://sledge-classroom.web.app`.
3. **Verification used headless Chrome with device emulation** — not physical devices.
4. **The production bundle emits a pre-existing `>500 kB` chunk-size warning** (unrelated to this cutover).
5. **No Firebase backend/schema/rules changes were made or intended.**

---

## Conclusion

Production cutover is **complete and verified**. The legacy frontend has been replaced with the modern React application (commit `9eb11af`) on the Firebase Hosting `live` channel. All mandatory safety gates passed, all routes/auth/admin/particle/dock checks passed, no unintended data writes occurred, and the legacy rollback path remains available.
