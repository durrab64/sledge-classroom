# Firebase Hosting Preview Deployment Report

**Project:** Sledge Classroom 2.0 (React)
**Branch:** `modernization/react-foundation`
**Firebase project:** `sledge-classroom`
**Hosting configuration:** `firebase.modern.json`
**Preview channel:** `react-preview-20261112`
**Preview URL:** https://sledge-classroom--react-preview-20261112-fscmuiwe.web.app
**Expires:** 2026-11-19 16:21:35 (7 days)
**Date:** 2026-11-12
**Verdict:** **PREVIEW DEPLOYED WITH LIMITATIONS**

---

## 1. Git baseline and final status

**Baseline**

- Repository: `C:\LMS FOR my class lmao`
- Branch: `modernization/react-foundation`
- HEAD: `740a5d815c2009cbb5bd753f582af937c7d98d3b`
- HEAD subject: `docs: add owner auth and admin verification report`
- Recent commits:
  - `740a5d8` — `docs: add owner auth and admin verification report`
  - `d7a2ed8` — `feat(firebase): connect React classroom to existing backend`
  - `c6c15c9` — `release: finalize React classroom modernization`
- The owner-verification report `OWNER-AUTH-AND-ADMIN-VERIFICATION-REPORT.md` was present and reviewed.

**Preservation**

- No reset, rebase, amend, force-push, or history rewrite was performed.
- No GitHub push occurred.
- All pre-existing unrelated working-tree changes were preserved.
- `.env.local` exists at `modern/.env.local`, remains Git-ignored
  (`modern/.gitignore:17`), and its contents were never printed.
- `.firebase/hosting..cache` retained its byte hash before and after deployment:
  `732BDBCD76C1835D11BC4A3DD6136E92E5D4C6E50F53C19221631A75F557BBEA`
- The only new file from this milestone is this report.

## 2. Firebase project and Hosting configuration

- Firebase CLI authenticated as `mhdurrabrehan@gmail.com` (owner).
- Active project confirmed as exactly `sledge-classroom`.
- `.firebaserc` default project: `sledge-classroom`.
- Deployment used the dedicated modern configuration explicitly:
  `firebase.modern.json`.
- `firebase.modern.json`:
  - `public`: `modern/dist` — confirmed.
  - SPA rewrite: `**` → `/index.html` — confirmed.
  - Hashed asset caching, image caching, and app-shell `no-cache` — confirmed.
  - Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
    `Referrer-Policy`) — confirmed.
- The root `firebase.json` was **not changed** and still targets the legacy site
  (`public: "."`, legacy rewrites/headers).

## 3. Preview channel deployment

- Command used (equivalent to the required form):
  `firebase hosting:channel:deploy react-preview-20261112 --config firebase.modern.json --project sledge-classroom --expires 7d --no-authorized-domains`
- Channel: **react-preview-20261112**
- Preview URL: **https://sledge-classroom--react-preview-20261112-fscmuiwe.web.app**
- Expiration: **2026-11-19 16:21:35**
- Hosting version: `31997de074e2ed02`
- Uploaded files: 20 files found in `modern/dist`; upload and release completed.
- No production Hosting deploy command was run. `firebase deploy` was not used.
- `--no-authorized-domains` was used deliberately to avoid changing Firebase Auth
  configuration. Consequence: owner sign-in on the preview domain is not part of
  this preview verification and may require authorized-domain approval later.

## 4. Build, test, and typecheck results

| Gate | Result |
|---|---|
| `npx tsc -b` | **Passed (exit 0)** |
| Full Vitest suite | **276 tests / 26 files passed** |
| Production Vite build | **Passed (exit 0)**; only the existing >500 kB chunk warning |

**Build output inspection**

- `modern/dist` contains the React application:
  - `index.html` with hashed module entry `/assets/index-B0Z4y3XK.js`
  - 13 compiled asset files
  - React app static imagery/fonts
- No legacy `app.js` entry appears in the preview build.
- No `.env*`, service-account keys, private keys, source maps, or credential files
  were found in `modern/dist`.
- A content scan of `modern/dist` found no `service_account`, `private_key`,
  `BEGIN PRIVATE KEY`, or `VITE_FIREBASE_API_KEY` markers.

## 5. Route and responsive verification

Browser audit against the live preview:

- 11 routes × 5 widths (320, 390, 768, 1024, 1440) = **55 checks**
- No page-level horizontal overflow at any width.
- No uncaught page exceptions on fresh loads.
- Results:
  - Home: real content and Now Playing widget rendered.
  - Courses: 9 courses (6 theory, 3 lab).
  - Course detail (`#/courses/os`): 11 slides, 0 papers, 1 related, 1 event.
  - Reading Room: a real resource opened at
    `#/courses/os/lectures/52X4IBqkfVKyOkUq5fLX` with title, metadata, “View online”,
    “Open in Google Drive”, and “Download” actions; no errors.
  - Labs: rendered.
  - Calendar: November 2026 with 4 real events.
  - Login: rendered.
  - Admin while signed out: redirected to `#/login`; no Admin controls exposed.
  - Legacy hash compatibility (`#/courses/os?mode=lab`): rendered the lab section.
- Two transient `net::ERR_ABORTED` events appeared during the rapid sequential
  audit on `course-detail/320` and `admin/768`. Fresh isolated loads of both routes
  produced **no failed requests**, no overflow, and correct rendering — confirming
  in-flight navigation cancellation rather than application failure.
- Deep-link SPA fallback: request to `/courses/os` returned HTTP 200 with
  `text/html` and the app shell.

## 6. Firebase-backed public-read results

- Firestore public reads worked from the preview:
  - Courses: 9 real courses.
  - Course detail: 11 OS lecture resources, 1 related, 1 lab, 1 event.
  - Calendar: 4 real November 2026 events.
- Reading Room resource metadata and Drive links loaded from production Firestore.
- Now Playing read from production RTDB: the widget rendered with the
  `np-card np-playing` state on the preview home page.
- No writes were made to Firestore or RTDB during verification.

## 7. Security headers and cache policy results

**Response headers (preview root and app shell)**

| Header | Observed value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31556926; includeSubDomains; preload` |
| `X-Robots-Tag` | `noindex` (preview channel) |
| `Content-Security-Policy` | **Not configured / absent** |

**Cache policy**

| Resource | `Cache-Control` |
|---|---|
| `/` | `no-cache` |
| `/index.html` | `no-cache` |
| Hashed `/assets/*` JS/CSS | `public, max-age=31536000, immutable` |
| Images (`/favicon.svg` etc.) | `public, max-age=604800, stale-while-revalidate=86400` |

The app shell is not incorrectly cached, and hashed assets receive the intended
immutable policy.

## 8. Legacy production preservation

- Legacy production URL: **https://sledge-classroom.web.app** (checked, HTTP 200).
- Production still serves the legacy application:
  - `app.js?v=31` script present.
  - No React `/assets/index-*` entry in production HTML.
- Hosting channel list confirms the `live` channel’s last release is still
  **2026-11-11 13:39:01**, unchanged by this milestone.
- No production Hosting deployment, cutover, or legacy-site modification occurred.

## 9. Explicit scope confirmations

- **No production Firestore writes** occurred.
- **No production RTDB writes** occurred.
- **No Admin write workflows** were submitted on the preview.
- **No Firestore/RTDB rule, schema, or index changes** occurred.
- **No Firebase Auth account or credential changes** occurred.
- **No Firebase Auth authorized-domain change** occurred.
- **No production Hosting deployment** occurred.
- **No preview extension or second channel deployment** occurred.
- **No `firebase deploy`** was run.
- **No root `firebase.json` or active Hosting configuration change** occurred.
- **No billing or plan change** occurred.
- **No GitHub push** occurred.
- **No secrets or configuration values** were printed.

## 10. Limitations and blockers

1. **Owner auth on the preview domain is not verified.** Because
   `--no-authorized-domains` was used to avoid Auth configuration changes, signing
   in on the preview channel may be rejected until the preview domain is added to
   Firebase Auth authorized domains. Local owner-auth verification remains the
   authoritative authentication evidence for this milestone.
2. **No Content-Security-Policy is configured.** The modern Hosting config sets
   `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`, but no CSP.
   This was not added in this milestone to avoid changing the deployment config
   beyond the authorized preview.
3. **Admin write workflows remain unverified against real Firebase.** The emulator
   requires Java 21+ (local runtime is Java 8) and production writes are prohibited.
   As instructed, no writes were attempted on the preview.
4. The Reading Room index route (`#/reader`) resolves to the Courses page, which is
   the existing application behaviour; direct resource deep links work.
5. The preview expires automatically on **2026-11-19 16:21:35** unless separately
   approved for extension.

---

**Verdict: PREVIEW DEPLOYED WITH LIMITATIONS**

The React build is deployed to an isolated Firebase Hosting preview channel and
public read-only verification passed, including real Firestore/RTDB reads,
responsive layouts, SPA fallback, security headers, and cache policy. Legacy
production remains untouched. Owner sign-in on the preview domain, Admin writes,
and CSP coverage remain outside this milestone’s verified scope.

**STOP — no production deployment or cutover was performed.**
