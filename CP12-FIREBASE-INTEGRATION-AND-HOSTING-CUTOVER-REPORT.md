# CP12 — Firebase Integration and Hosting Cutover Preparation Report

**Repository:** `C:\LMS FOR my class lmao`  
**Branch:** `modernization/react-foundation` (local only; not pushed)  
**Mode:** Controlled integration readiness, non-production verification and Hosting cutover preparation  
**Verdict:** **READY WITH LIMITATIONS** — preparation is sound, but real Firebase credentials/authorization and owner-side cutover approval remain outstanding

---

## 1. Baseline and Git status

- Baseline HEAD: `49a4df5a14a7c27806742ddc99385fc8f5bf4028` — `chore(release): harden integration and verify release readiness`
- Parent: `9550feb5eed753edfcf8a449740cacb8b8e228f3` — `feat(admin): migrate owner resource management`
- Branch: `modernization/react-foundation`; no push, tag, reset, rebase, amend or force operation was performed.
- CP11 report and the architecture/Firebase reports were read before changes.
- Pre-existing unrelated working-tree changes were preserved exactly:
  - Modified: `.firebase/hosting..cache`, `CP4-FIREBASE-FOUNDATION-AND-READ-ONLY-REPOSITORIES-REPORT.md`, `app.js`, `firebase.json`, `index.html`, `tests/admin-state-ui.test.js`, `tests/write-guards.test.js`
  - Deleted: `CP13-…`, `CP14-…`, `CP15-…`, `CP16-…` reports
  - Untracked: `CHOTA_DON_REMOVAL_FINAL_REPORT.md`, `CP2-…`, `CP4.1-…`, `CP4.2-…`, `CP5-…` through `CP10-…`, root `node_modules/`, root `package*.json`, `tests/cp29-existing-resource-metadata.test.js`, `verify.ps1`
- `.firebase/hosting..cache` SHA-256 before and after CP12: `732BDBCD76C1835D11BC4A3DD6136E92E5D4C6E50F53C19221631A75F557BBEA` (unchanged).
- Active `firebase.json`, `.firebaserc`, `firestore.rules`, `database.rules.json`, legacy source and production data were **not modified**.

## 2. Firebase configuration findings

### Project and environment

- `.firebaserc` selects the existing default project `sledge-classroom`. No alternate/non-production project alias exists.
- `modern/` has only `.env.example`; there is no `.env`, `.env.local`, `.env.production` or other environment file. Therefore no real Firebase config is available to a local build.
- The modern client requires seven `VITE_FIREBASE_*` values: API key, auth domain, project ID, database URL, storage bucket, messaging sender ID and app ID. `VITE_FIREBASE_MEASUREMENT_ID` is documented but optional (analytics is not initialized).
- The legacy root app has its own `firebase-config.js` containing the production project's **public** web identifiers. These values were inspected only to understand the project and were deliberately **not copied** into the modern environment; doing so would have pointed local verification at production Firebase without owner authorization.
- No service-account file, Admin SDK key, private key, credential JSON or secret environment file exists in the repository. The only configuration examples contain placeholders.
- CP12 hardened `modern/.gitignore` from `.env`/`.env.local` only to `.env` + `.env.*` with `!.env.example`, so a future `.env.production` or `.env.development` cannot be committed accidentally. `.env.example` remains tracked.

### Initialization and services

- `modern/src/services/firebase.ts` initializes lazily **only** when all required variables are non-empty.
- Duplicate initialization is guarded by `getApps()`; an existing app is reused rather than re-initialized.
- Firebase Auth, Firestore and Realtime Database instances are created from the same app. When unconfigured, they remain `null`, `firebaseConfigured` is `false`, and repositories return `FirebaseNotConfiguredError` rather than inventing data.
- Auth uses the Firebase SDK default browser persistence; no custom persistence or user creation exists.
- Repositories are constructed once in `modern/src/services/repositories/index.ts` from the singleton instances; no repository imports Firebase SDKs directly.

### Rules and indexes

- Firestore rules: `courses/{courseId}/{category}/{fileId}` and `events/{eventId}` are publicly readable; create/update/delete require the verified owner UID. No anonymous or non-owner writes are allowed.
- RTDB rules: `nowPlaying/current` is publicly readable. **Observation:** its write rule is `auth != null`, so any authenticated account can write it, unlike the owner-only Firestore model. This is pre-existing behaviour and was not changed under CP12; it should be reviewed by the owner if only the owner should update Now Playing.
- Repository queries use only single-field filters/orderings (`orderBy('createdAt')`, `where('date', …)`); no composite Firestore index file is required or present.
- No schema, index or rule change was made.

### Emulator/non-production availability

- No `emulators` block exists in `firebase.json`; no Firestore/Auth emulator configuration is present.
- No authorized non-production Firebase project is configured.
- The **Hosting emulator** is available through Firebase CLI `15.35.0` and was used for cutover validation. The Firestore/Auth emulators were not available/configured, and no attempt was made to invent a project.

## 3. Which Firebase checks were genuinely performed

| Check | Environment | Result |
| --- | --- | --- |
| Firebase Hosting config parsing | Local Firebase Hosting emulator, isolated proposed config | **Performed** — passed |
| Asset loading and MIME types | Hosting emulator serving `modern/dist` | **Performed** — passed |
| SPA rewrite/deep-link fallback | Hosting emulator | **Performed** — passed |
| Route/browser/responsive checks | Hosting emulator + headless Chrome | **Performed** — 50/50 passed |
| Firebase initialization with real config | — | **Not performed** — no environment values |
| Real Auth login/logout/state restoration | — | **Not performed** — no authorized credentials |
| Real owner/non-owner authorization | — | **Not performed** — covered only by unit tests |
| Real public Firestore reads | — | **Not performed** — would touch the production project |
| Real Firestore writes | — | **Not performed** — explicitly prohibited |
| Custom Hosting headers | Hosting emulator | **Not confirmed** — emulator served content but did not emit configured headers |
| Hosting preview channel deployment | Firebase cloud | **Not performed** — requires owner login/project authorization |

Local Hosting emulator results are **not** real Firebase cloud verification. No claim is made that Auth or Firestore work against the live project.

## 4. Authentication and Firestore verification results

- With no Firebase env, the app fails closed in the browser: `/admin` shows “Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).” and never renders owner controls.
- `/login` renders the form; validation errors appear in a `role="alert"` region. Submitting valid-looking credentials with unconfigured Firebase returns the same fail-closed error and does not navigate.
- Owner versus non-owner decisions, auth-state restoration, redirect return paths and repository failure mapping remain covered by the existing unit suite (244 tests), but those are mocks/test doubles, not live Firebase.
- Public Firestore reads and owner-only writes were **not** executed against `sledge-classroom` because that would be production access without explicit owner approval.
- No Firestore document, RTDB node, Auth user, rule, index or schema was created, modified or deleted.

## 5. Hosting configuration assessment

### Current active configuration

- Root `firebase.json` uses `"public": "."` and rewrites `**` to `/index.html`; it serves the legacy root application.
- Root `firebase.json` already has a pre-existing uncommitted change adding `worker/**` to `ignore`; CP12 preserved it and did not touch the file.
- `modern/dist` uses root-relative `/assets/...` URLs. It must be served from a **site root**, not a subdirectory, or Vite `base` would need to change.
- The legacy app remains fully present and deployable from the current root config, which is the rollback anchor.

### Proposed configuration (new, non-active)

CP12 added `firebase.modern.json`, a separate config that does **not** alter the active `firebase.json`:

- `public: "modern/dist"`
- SPA rewrite `**` → `/index.html`
- Ignore dotfiles, `node_modules`, and source maps
- Ordered headers:
  1. `/assets/**` → `Cache-Control: public, max-age=31536000, immutable` (Vite content-hashed assets)
  2. image extensions → 7-day cache with stale-while-revalidate
  3. `/index.html` and `/` → `Cache-Control: no-cache`
  4. `**` → `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`

Canonical page loads use `/` (the app is hash-routed), so the app shell is revalidated while hashed assets stay immutable. The config intentionally avoids a catch-all `Cache-Control` so header rules cannot conflict.

The config was tested directly with `firebase emulators:start --only hosting --config firebase.modern.json` from the repo root. Results:

- `/` → 200 `text/html`, correct app shell.
- `/assets/index-mEqJBX8Z.js` → 200 `application/javascript`, exact 1,196,784 bytes.
- `/assets/index-u9eP85AA.css` → 200 `text/css`, exact 183,434 bytes.
- `/favicon.svg`, `/icons.svg`, `/orihime.webp` → 200 with correct image MIME types.
- `/courses/os`, `/deep/link/refresh`, `/admin` → 200 app shell via rewrite, confirming refresh paths do not 404.
- Missing paths also return the app shell with HTTP 200, standard for a catch-all SPA rewrite. Hashed assets are therefore expected to exist for each build; the no-cache app shell plus immutable asset URLs prevent stale asset references in normal operation.

**Header limitation:** the local Hosting emulator did not emit the configured custom headers (nor a simple test header), so cache/security header precedence could not be verified locally. Confirm with a preview-channel request (`curl -I`) before production cutover.

### Routing and deep links

The app uses hash routing (`#/courses/os`), so user bookmarks refresh entirely client-side once `index.html` is served. The server rewrite additionally guarantees that path-style refreshes such as `/courses/os` return the app shell rather than a Hosting 404. Bare path URLs without a hash intentionally land on the home route; the supported deep-link shape is `/#/…` or `#/…`.

### Legacy preservation

- The active legacy deployment configuration is untouched.
- The proposed modern config is a separate file and can only be used when explicitly passed with `--config`.
- No legacy file was deleted or migrated.

## 6. Build and deployment-package validation

- `npm run build` (TS + Vite) passed.
- Final bundle: `dist/assets/index-mEqJBX8Z.js` 1,196.78 kB (gzip 354.64 kB), `dist/assets/index-u9eP85AA.css` 183.43 kB (gzip 33.93 kB), `dist/index.html` 2.55 kB.
- Known `>500 kB` chunk warning remains and was not suppressed.
- `dist/` contains only the app shell, hashed assets, `favicon.svg`, `icons.svg` and four decorative images. It does **not** reference `/app.js`, `/styles.css`, `/firebase-config.js`, `/now-playing-widget.js` or any legacy root asset.
- The only external runtime dependencies in `index.html` are Google Fonts and the Font Awesome CDN; the application code and local images are self-contained. This matches the legacy app's external font/icon usage.
- A production build must be created with the real `VITE_FIREBASE_*` values. The local validation build intentionally has no Firebase config and therefore fails closed; it validates packaging and Hosting behaviour, not backend connectivity.
- Browser validation against the emulator host: **10 routes × 5 widths (320/390/768/1024/1440) = 50 checks, 0 failures**. No horizontal overflow, console errors, page exceptions or failed requests. Admin remained protected and showed the fail-closed message; login, home, courses, course detail, labs, calendar, not-found, legacy hash and missing-reader routes rendered correctly.

## 7. Test, TypeScript, lint and browser results

- `npx tsc -b`: clean, exit 0.
- `npx vitest run`: **244 tests / 23 files passed**.
- `npm run build`: passed, exit 0.
- `npx oxlint`: exit 0, **0 errors**, 23 pre-existing warnings (same classes as CP11).
- Hosting emulator + headless Chrome: **50/50 route/viewport checks passed**, no console/network errors.
- Asset checks: HTML/CSS/JS/SVG/WebP all served with correct MIME types and byte sizes.
- No warning was hidden or suppressed.

## 8. Security findings and unresolved dependencies

- No secret, credential, service-account file or `.env` file is present or staged.
- `.env.*` production/development variants are now git-ignored; `.env.example` remains the only tracked environment file.
- Client configuration remains public identifiers only; security depends on the unchanged Firebase rules.
- Firestore owner-only writes and public reads are unchanged.
- RTDB `nowPlaying/current` allows writes from any authenticated user (pre-existing; see §2) — flagged for owner review, not changed.
- All externally rendered URLs remain restricted to http(s) by the `safeHttpUrl` policy established in CP10/CP11.
- `npm audit` remains at **4 high / 0 critical**, all from the upstream `firebase → @firebase/firestore → @grpc/grpc-js` chain. There is still no safe non-breaking fix; `firebase@9.14.0` (a major downgrade) was rejected. The vulnerable Node transport internals are not present in the browser bundle, but the advisory remains open upstream.
- No Firebase rule, index, schema, production data, Hosting header, or `.firebase/hosting..cache` change was made.

## 9. Exact production cutover prerequisites

The cutover is deliberately not performed. Owner approval is required at each external step.

1. **Provide Firebase web config**: create `modern/.env.production` or set CI secrets for `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Values must come from the intended project (`sledge-classroom`) and must never be committed.
2. **Authorize Firebase CLI**: owner runs `firebase login` and confirms the active project with `firebase use sledge-classroom`.
3. **Build from a clean install**: `cd modern && npm ci && npm run build`, then confirm `modern/dist/index.html` references the current hashed assets and that no `.env*` file is staged.
4. **Deploy to a preview channel first**:
   `firebase hosting:channel:deploy cp12-preview --config firebase.modern.json --expires 7d`
   The CLI normally syncs the preview domain to Firebase Auth authorized domains. Preview channels share the project's **production Firebase backend**, so only read-only/auth smoke tests are permitted there.
5. **Owner smoke test on the preview URL**: load home/courses/labs/calendar/reading room, verify asset/header responses, owner login and logout, non-owner denial, public reads, and `/admin` protection. Do not run create/edit/delete on a preview channel that points at production data.
6. **Verify headers** on the preview with `curl -I`: hashed assets should be `immutable`, the app shell should be revalidated, and security headers should be present. If the preview differs from the emulator, adjust `firebase.modern.json` before cutover.
7. **Cut over to live Hosting** only after owner sign-off:
   `firebase deploy --only hosting --config firebase.modern.json`
   This replaces the default site's content with the modern build; it does not change Firestore/RTDB rules or data.
8. **Alternative zero-downtime path (recommended if the owner wants the legacy site online during validation)**: create/choose a separate Hosting site, map a deploy target, deploy the modern config there, validate it on its `.web.app` URL, then move the custom domain after approval. This requires Firebase Console/Hosting-site ownership and is out of local scope.
9. **Post-cutover checks**: `#/`, `#/courses`, `#/labs`, `#/calendar`, a reader deep link, `#/login` and `#/admin`; verify assets return 200, no console errors, and owner-only access remains enforced by rules.

## 10. Rollback procedure

Because CP12 did not change the live site, there is nothing to roll back yet. The prepared procedure is:

1. **Before cutover**, record the current Hosting release ID/URL from the Firebase Console and keep the legacy deployable tree (current `firebase.json` plus root app files) available. Do not delete legacy files.
2. **If the preview is unsatisfactory**, let the channel expire or delete it; the live site is unaffected.
3. **If a live cutover must be undone**, redeploy the legacy configuration from the pinned legacy commit/tree:
   `git checkout <legacy-commit> -- firebase.json` is **not** the recommended route because it would disturb working-tree changes. Instead deploy from a clean worktree of the legacy commit or use the Firebase Console release history to restore the previous release.
4. **Legacy redeploy command** (from a clean legacy checkout): `firebase deploy --only hosting --config firebase.json`.
5. **Verify rollback**: the legacy `index.html`, `app.js`, `styles.css` and `firebase-config.js` are served; `/#/courses` is no longer the React route; the legacy admin/login UI works; no modern hash routes are required.
6. **Do not** use destructive Git operations, force-push, reset, rebase or amend during rollback.

## 11. Files changed and commit details

**Added (2):**

- `firebase.modern.json` — non-active Hosting cutover proposal for `modern/dist`.
- `CP12-FIREBASE-INTEGRATION-AND-HOSTING-CUTOVER-REPORT.md` — this report.

**Modified (1):**

- `modern/.gitignore` — ignore all `.env.*` variants while keeping `.env.example` tracked.

**Removed:** none.

- Commit message: `chore(release): prepare Firebase integration and Hosting cutover`
- Parent: `49a4df5a14a7c27806742ddc99385fc8f5bf4028`
- One local commit only; no push, deploy, amend, reset, rebase or force operation.
- The commit SHA is reported in the CP12 handoff message; it cannot be embedded in the report file that the same commit introduces.

## 12. Confirmation and verdict

- **Production was not deployed or modified.**
- No `git push` was run.
- No Firestore/RTDB rules, schema, index, data or Auth user was changed.
- No legacy file was deleted or migrated.
- No service-account credential or secret was created, read into the client, or committed.
- `.firebase/hosting..cache` and the active `firebase.json` were preserved exactly.
- No paid API, billing upgrade or Blaze-plan change was requested or made.

**Verdict: READY WITH LIMITATIONS.**

The local preparation is sound: the proposed Hosting config parses and serves the production package correctly in the real Firebase Hosting emulator, rewrites and assets work, the full test/type/lint/build gate passes, and the app remains safe when Firebase is unconfigured. The cutover is deliberately incomplete because real Firebase Auth/Firestore verification requires owner-supplied public config and authorization, and production Hosting replacement requires explicit owner approval. Custom header behaviour and a preview-channel smoke test also remain owner-side checks. No production cutover should occur until those gates are completed.
