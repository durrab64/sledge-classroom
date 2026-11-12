# CP14 — Production Cutover and Final Stabilization Report

**Repository:** `C:\LMS FOR my class lmao`  
**Branch:** `modernization/react-foundation` (local only; not pushed)  
**Previous checkpoint:** CP13 — `9a704f6bd5b3278ce901a88ba567162f1b10e08c`  
**Mode:** Final release preparation and stabilization  
**Verdict:** **COMPLETE — AWAITING CUTOVER** — the modernization is technically prepared and regression-verified, but no owner approvals or Firebase credentials were supplied, so no preview or live deployment was performed

---

## 1. Git baseline and preservation status

- Branch: `modernization/react-foundation`.
- Baseline HEAD: `9a704f6bd5b3278ce901a88ba567162f1b10e08c` — `test(firebase): verify production integration readiness`.
- CP13 confirmed as an ancestor of HEAD (`git merge-base --is-ancestor` → 0); CP12 (`f117ecd`) and CP11 (`49a4df5`) remain in history.
- CP11, CP12 and CP13 reports were read before changes.
- No reset, rebase, amend, force push or history rewrite was performed.
- Pre-existing unrelated working-tree changes preserved exactly:
  - Modified: `.firebase/hosting..cache`, `CP4-FIREBASE-FOUNDATION-AND-READ-ONLY-REPOSITORIES-REPORT.md`, `app.js`, `firebase.json`, `index.html`, `tests/admin-state-ui.test.js`, `tests/write-guards.test.js`
  - Deleted: `CP13-USER-EXPERIENCE-AND-CONTENT-AUDIT-REPORT.md`, `CP14-…`, `CP15-…`, `CP16-…` (legacy report filenames, pre-existing deletions)
  - Untracked: `CHOTA_DON_REMOVAL_FINAL_REPORT.md`, `CP2-…`, `CP4.1-…`, `CP4.2-…`, `CP5-…` through `CP10-…`, root `node_modules/`, root `package.json`/`package-lock.json`, `tests/cp29-existing-resource-metadata.test.js`, `verify.ps1`, emulator-generated `firebase-debug.log`
- `.firebase/hosting..cache` SHA-256 before and after CP14: `732BDBCD76C1835D11BC4A3DD6136E92E5D4C6E50F53C19221631A75F557BBEA` (unchanged).
- Active legacy Hosting configuration (working tree, **untouched**) remains `firebase.json` with `"public": "."`, a `**` → `/index.html` rewrite, legacy cache/security headers, and the pre-existing uncommitted `worker/**` ignore addition. The legacy application is still the live target.

## 2. Owner prerequisites and approvals

**None of the required CP14 approvals were supplied in this checkpoint.** Starting CP14 was not treated as authorization.

| Prerequisite | Status |
| --- | --- |
| Seven `VITE_FIREBASE_*` values via approved channel | **Missing** — `modern/` still contains only `.env.example` |
| Explicit authorization to use `sledge-classroom` backend | **Missing** |
| Chrome extension account identity confirmation | **Missing** |
| RTDB owner-only write decision | **Missing** |
| Explicit Hosting preview authorization | **Missing** |
| Explicit live Hosting replacement authorization | **Missing** |

No environment value, password, token or credential was printed, logged or stored. No Firebase project, service account or Auth user was created, and no billing upgrade was requested.

## 3. Firebase configuration status

- Intended project: `sledge-classroom` (`.firebaserc` default).
- Required client keys: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- `modern/.env.example` documents all seven plus an optional unused measurement ID, and was verified by test to contain no credential assignments.
- `.gitignore` ignores `.env` and `.env.*` while keeping `!.env.example`.
- `firebase.ts` initializes lazily only when all seven values are non-empty, guards duplicate init with `getApps()`, and leaves services `null` + fail-closed otherwise.
- The production build in this session was intentionally created **without** Firebase config, so it validates packaging and Hosting behavior only. It contains no API key, private key, service-account or legacy `firebase-config.js` reference (`AIza`, `private_key`, `service_account`, `client_secret` all 0 matches in `dist`).

## 4. RTDB security decision

- `nowPlaying/current` still allows `.read: true` and `.write: "auth != null"`; `$other` is fully denied.
- The modern `NowPlayingRepository` and legacy `now-playing-widget.js` are read-only.
- The only writer is `chrome-extension/background.js`, which authenticates with stored `np_email`/`np_password` via the Identity Toolkit password endpoint and writes `nowPlaying/current.json?auth=<idToken>`.
- The extension account's UID is still not recorded anywhere and the owner has not confirmed it.

**Final CP14 decision: no rule change.** Tightening to the owner UID could silently break Now Playing if the extension uses a separate account. The proposed minimal change remains documented in the CP13 report (§3) and is **not applied or deployed**. This is an owner decision, not a code defect.

## 5. Real Auth / Firestore / RTDB verification evidence

**Not performed.** With no credentials or authorization, no live Firebase request was made.

- No Firebase initialization against the real project.
- No Auth login, reload restoration, logout, owner access or non-owner denial against Firebase.
- No public Firestore course/event reads.
- No RTDB `nowPlaying/current` read.
- No production writes of any kind.

What *is* verified remains at the **unit/static level**: owner gating by exact UID, fail-closed auth state, repository mapping and error mapping, and read-only RTDB repository behavior. Those are test doubles, not live Firebase evidence, and are not claimed as production readiness.

## 6. Preview deployment and custom header results

- **No preview channel was deployed.** `firebase hosting:channel:deploy cp14-preview --config firebase.modern.json --expires 7d` was **not** run.
- Local validation used the real Firebase Hosting emulator (`15.35.0`) with `firebase.modern.json` from the repo root:
  - `/` served the app shell (2,559 bytes, `text/html`).
  - Entry and all lazy route chunks returned 200 with `application/javascript`; CSS returned `text/css`; images returned correct MIME types.
  - `/courses/os` and `/deep/link/refresh` returned the app shell via rewrite.
- **Custom headers remain unverified** because the local Hosting emulator does not emit configured custom headers. Real values must be checked with `curl -I` against an authorized preview.
- Preview channels share the project's **production Firebase backend**; even when authorized, only read-only/auth smoke tests are appropriate.

## 7. Production build and regression results

Performed after a **clean `npm ci`** (309 packages, lockfile-respecting):

- `npx tsc -b`: clean, exit 0.
- `npx vitest run`: **258 tests / 25 files passed** (CP13 baseline 254 + 4 router tests).
- `npm run build`: passed, exit 0.
- `npx oxlint`: exit 0 — **0 errors, 23 pre-existing warnings**, none suppressed.
- Browser audit against the Hosting emulator: **11 routes × 5 widths (320/390/768/1024/1440) = 55/55 checks passed**, zero horizontal overflow, console errors, page exceptions or failed requests. Routes covered: home, courses, course detail, labs, calendar, reader alias, login, admin, not-found, legacy hash and missing reader resource.
- `/admin` remains fail-closed without config; `/login` renders without establishing a session.
- Legacy hash deep links still normalize (`#course-os/lab` → `#/courses/os?mode=lab`), and `#/reader` intentionally resolves to the course catalogue.
- `modern/dist` is self-contained: zero references to `firebase-config.js`, `/app.js`, `styles.css` or `now-playing-widget.js`.

### Code-splitting change

Feature routes now load lazily (`src/app/router.tsx`). Effect:

| Metric | CP13 | CP14 |
| --- | --- | --- |
| Entry JS | 1,196.78 kB (gzip 354.64 kB) | **1,097.60 kB (gzip 332.35 kB)** |
| Route chunks | none | 10 chunks, 0.81–21.00 kB |
| Entry reduction | — | **−99.18 kB minified / −22.29 kB gzip (~8.3% / 6.3%)** |

The Vite `>500 kB` warning remains because Firebase and the global experience layer stay in the entry chunk. It was **not** suppressed. Route navigation was browser-verified to fetch the correct lazy chunks.

### Flake stabilization

One full-suite run produced a timing failure in `test/features/readingRoom.test.tsx` (“unknown resource ID”); it passed on 3 consecutive full-suite reruns and in isolation. The test’s secondary assertions were hardened to wait via `findByText`/`findByRole` and `waitFor` on `document.title`, without weakening any assertion. This addresses the same class of async race noted in CP11.

## 8. Dependency and security findings

- `npm audit`: **4 high / 0 critical**, all from `firebase → @firebase/firestore → @grpc/grpc-js`. No safe non-breaking fix; a major `firebase` downgrade was previously rejected. The vulnerable Node transport is not in the browser bundle, but the advisory remains open upstream.
- Bundle warning: reduced but still present (entry 1,097.60 kB). Further splitting of Firebase is not possible without changing the data layer or upgrading dependencies; left stable rather than destabilizing the release.
- Accessibility limitations carried from CP11 remain; CP14 did not regress them and browser checks include the 320 px layout.
- RTDB `auth != null` write permission remains the primary open security decision (§4).
- No new dependency, paid API, billing change or credential was introduced.

## 9. Production deployment status and release reference

- **Not deployed.** The live Hosting site still serves the legacy application.
- No Hosting release was created, replaced, rolled back or cloned.
- No Firestore/RTDB rules, indexes, schema or data were deployed or modified.
- Previous live release reference: **not captured**, because querying release history requires an authorized cloud call. The owner must record it immediately before cutover via the Firebase Console (Hosting → release history) or an authorized `firebase hosting:releases:list`.
- Cutover command remains, strictly pending separate approval:

  `firebase deploy --only hosting --config firebase.modern.json`

  This deploys Hosting only; it does not deploy `firestore.rules` or `database.rules.json`.

## 10. Post-deployment verification

Not applicable — no deployment occurred. The prepared checklist (route loads, asset MIME, headers, login/logout, owner admin, public reads, console/network, mobile/desktop, legacy restorability) is ready for execution only after approval.

## 11. Rollback instructions and verification

The legacy site and configuration are preserved untouched. Before any cutover the owner must record the current live release ID.

1. Preferred: Firebase Console → Hosting → release history → roll back to the recorded pre-cutover release.
2. Or redeploy the legacy config from a clean legacy worktree (never with destructive Git operations on this working tree):
   - Ref: CP11 baseline `49a4df5a14a7c27806742ddc99385fc8f5bf4028` (or a dedicated legacy tree).
   - Command: `firebase deploy --only hosting --config firebase.json`
3. Verify rollback: legacy `index.html`, `app.js`, `styles.css`, `firebase-config.js` are served; the legacy login/admin UI works; React-only hash routes are no longer required; no console errors on the landing page.
4. Preview channels can simply expire; they never replace the live site.

No legacy file was deleted or migrated during CP14.

## 12. Files changed and commit details

**Modified (2):**

- `modern/src/app/router.tsx` — feature routes now resolved through React Router lazy loaders; route paths and protection unchanged.
- `modern/test/features/readingRoom.test.tsx` — async-safe assertions in the not-found test (no assertion weakened).

**Added (2):**

- `modern/test/app/router.test.ts` — 4 guards for the route table and lazy loading.
- `CP14-PRODUCTION-CUTOVER-AND-FINAL-STABILIZATION-REPORT.md` — this report.

**Removed:** none.

- Commit message: `release: finalize React classroom modernization`
- Parent: `9a704f6bd5b3278ce901a88ba567162f1b10e08c`
- One local commit only; no push, deploy, amend, reset, rebase or force operation. The resulting SHA is reported in the CP14 handoff message.
- No environment file, secret or credential is staged.

## 13. Final modernization verdict

**COMPLETE — AWAITING CUTOVER.**

The React application, Hosting proposal, rollback path, clean-install build and full regression suite are verified locally. Completion of the *production* milestone is not claimed because the live site was not touched: Firebase credentials/authorization, the RTDB owner decision, preview deployment, custom-header verification and explicit cutover approval are all still outstanding owner actions.

**Required owner actions before cutover:**

1. Provide the seven `VITE_FIREBASE_*` values and authorize their use.
2. Confirm whether the Chrome extension signs in as the owner UID; approve or reject the proposed RTDB rule.
3. Authorize a preview deploy and run the read-only/auth smoke tests + `curl -I` header checks.
4. Record the current live Hosting release ID.
5. Give separate explicit approval for `firebase deploy --only hosting --config firebase.modern.json`.

**Production was not accessed, modified or deployed. No Git push occurred. `.firebase/hosting..cache`, the active `firebase.json`, rules, schema, data and all legacy files remain intact.**
