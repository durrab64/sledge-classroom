# Owner Authentication & Admin Write-Path Verification Report

**Project:** Sledge Classroom 2.0 (React)
**Branch:** `modernization/react-foundation`
**Firebase project:** `sledge-classroom` (existing project only)
**Local app:** `http://localhost:5300/` (Vite dev server, IPv6 `::1`)
**Date:** 2026-11-12
**Verdict:** **READY WITH LIMITATIONS**

---

## 1. Git baseline and preservation

**Baseline**

- Branch: `modernization/react-foundation`
- HEAD: `d7a2ed8eb87429b2f49065fda368c6d044d5c66a`
- HEAD subject: `feat(firebase): connect React classroom to existing backend`
- Recent commits:
  - `d7a2ed8` — `feat(firebase): connect React classroom to existing backend`
  - `c6c15c9` — `release: finalize React classroom modernization`
  - `9a704f6` — `test(firebase): verify production integration readiness`
- The HEAD matches the implementation commit named in the prior Firebase integration report. No material divergence was found.

**Preservation**

- No reset, rebase, amend, force-push, or history rewrite was performed.
- No push and no deployment occurred.
- `.firebase/hosting..cache` retained its byte hash:
  `732BDBCD76C1835D11BC4A3DD6136E92E5D4C6E50F53C19221631A75F557BBEA`
- `.env.local` exists at `modern/.env.local` and is ignored by Git
  (`modern/.gitignore:17` covers `.env.*`). Its contents were not printed, logged, or committed.
- All pre-existing unrelated working-tree changes were left intact.
- No source or test changes were required for this verification. Only this report was added to the working tree.

**Final working tree**

The pre-existing unrelated changes remain exactly as at the start of the session. The only new file from this task is this report. No production configuration, rules, schemas, indexes, or Hosting files were modified.

## 2. Local application and Firebase initialization

- Vite dev server started for `modern/` only:
  `npm run dev -- --port 5300 --strictPort`
- Local URL: **http://localhost:5300/**
- Firebase initialized against the existing `sledge-classroom` project using the
  ignored local env file. No configuration values were printed.
- Public routes were loaded against real Firebase data:
  - Home: real content; Firestore listen channel observed.
  - Courses: 9 courses (6 theory, 3 lab).
  - Course detail (`/courses/os`): 11 slides, 0 papers, 1 related, 1 event.
  - Labs, Calendar, Login: rendered correctly.
  - Calendar: 4 real events in November 2026.
- No production writes, rule changes, or deployments were performed.

## 3. Owner login result and UID match

The owner entered the password directly into the local browser. No password,
ID token, refresh token, cookie, or credential was requested, observed, logged,
or stored.

| Check | Result | Evidence |
|---|---|---|
| Owner login with the existing account | **Verified** | Manual owner sign-in in the local app completed successfully |
| Authenticated UID | **Matches expected owner UID** | App auth service reported `dRHxakX2iAWM4w1IqtYPLpCZrwr2` |
| Email shown in Admin | Matches owner account | `mhdurrabrehan@gmail.com` (non-secret UI display) |
| Admin route accessible after login | **Verified** | `#/admin` rendered “Resource Management”, “Add resource”, and event management |
| Admin route blocked before login | **Verified** | `/admin` redirected to `#/login`; no admin controls rendered |
| Authenticated non-owner behaviour | Verified by existing tests | UID comparison is strict; route shows “Access denied” |
| Invalid credentials | Verified in the prior milestone against real Firebase | Real `signInWithPassword` rejected with “Invalid email or password.” |

No Firebase account was created, deleted, or modified. The owner UID was
preserved.

## 4. Session restoration and logout results

| Check | Result | Evidence |
|---|---|---|
| Reload while signed in | **Verified** | Full page reload on `#/admin` restored the owner session and the Admin page |
| Logout via Admin “Sign out” | **Verified** | Signed out to `#/login`; auth service returned `null` |
| Logout persistence | **Verified** | Polled every 500 ms for 10 seconds after clicking Sign out; session stayed cleared |
| UI after logout | **Verified** | No “Signed in as”, no “Add resource”, no Admin controls |
| Admin after logout | **Verified** | `#/admin` redirected to `#/login`; admin content not rendered |
| Public browsing after logout | **Verified** | `#/courses` rendered real course data while signed out |
| Unauthenticated Admin access | **Verified** | Admin route guard redirected to login without leaking admin UI |

One earlier rapid sequence produced an ambiguous re-authentication observation.
A clean, isolated re-test with the owner signed in and the window untouched
showed the session remaining cleared for the full 10-second trace. The final
logout behaviour is consistent and correct.

## 5. Emulator availability and Java version

- Local Java runtime: **Java 8** (`java version "1.8.0_511"`, HotSpot 25.511-b32).
- No JDK 21+ is installed. Only Java 8 JRE installations were found.
- `JAVA_HOME` is not set.
- Firebase CLI: **15.35.0**.
- Emulator start attempt failed immediately:
  `Error: firebase-tools no longer supports Java version before 21.`
- No Java installation, system change, global tooling change, billing change, or
  rule deployment was attempted.

**Consequence:** real emulator-backed write verification was not possible.

## 6. Admin workflow verification classification

Production Firestore/RTDB writes were strictly prohibited and none were made.
Real admin UI reads were inspected; dialogs were opened and cancelled without
submitting.

| Workflow | Classification | Details |
|---|---|---|
| Admin page owner reads | **Real Firebase (read-only)** | Selected course/category loaded 1 real resource; Calendar events panel loaded 1 real event |
| Add-resource dialog | **Real UI, no write** | Opened and closed without saving |
| Edit-metadata dialog | **Real UI, no write** | Opened with prefilled real metadata (`Statistics 1`, type `ppt`); closed without saving |
| Delete-resource confirmation | **Real UI, no write** | Confirmation showed metadata-only semantics; cancelled without deleting |
| Add-event dialog | **Real UI, no write** | All legacy fields present; closed without saving |
| Resource creation | **Mocked only** | Repository/UI unit tests; no real Firebase write |
| Resource metadata editing | **Mocked only** | Transactional stale-check covered by unit tests; no real write |
| Resource metadata deletion | **Mocked only** | Metadata-only semantics covered by unit tests; no real write |
| Event creation | **Mocked only** | Payload/validation/UI tests; no real write |
| Event deletion | **Mocked only** | Confirmation/UI/repository tests; no real write |
| Validation / loading / success / error states | **Mocked + real read states** | Unit/UI tests plus real loading/loaded admin reads |
| Owner-only access | **Real Firebase** | Owner session granted; others denied by UID check |
| Unauthenticated denial | **Real Firebase** | Redirected to login; no admin UI exposed |

No claim of real Firebase write verification is made.

## 7. Tests, typecheck, build, lint, and browser results

| Gate | Result |
|---|---|
| Full Vitest suite | **276 tests / 26 files passed** |
| TypeScript build (`tsc -b`) | **Passed (exit 0)** |
| Production Vite build | **Passed (exit 0)**; only the existing >500 kB chunk warning |
| Oxlint | **0 errors / 24 warnings** (pre-existing warning classes; none suppressed) |

Browser verification against the dev server:

- 11 routes × 5 widths (320, 390, 768, 1024, 1440) = 55 checks.
- No page-level horizontal overflow at any width.
- No console/page exceptions on fresh loads.
- Admin route redirected to login when signed out at every width.
- One transient `net::ERR_ABORTED` appeared during the rapid sequential audit on
  `admin/768`; a fresh isolated load of that route produced **no failed requests**
  and correct rendering, confirming it was an in-flight navigation cancellation.
- Owner login, Admin access, reload restoration, and logout were separately
  verified in the dedicated browser window.

## 8. Blockers and remaining limitations

1. **No real write verification.** The Firebase Emulator Suite cannot start on the
   installed Java 8 runtime, and production writes are prohibited. All create,
   edit, delete, and event writes remain verified only by mocked/unit tests.
2. **Emulator requires Java 21+.** Installing a JDK was not authorised and was not
   attempted.
3. **Real write-path integration tests** should be run with a JDK 21+ emulator, or
   with explicit owner approval for a controlled preview environment.
4. **RTDB write rule decision** remains open because the Chrome extension account
   UID is unconfirmed. No RTDB rule was changed and the modern app remains
   read-only for Now Playing.

## 9. Explicit scope confirmations

- **No production Firestore writes** occurred.
- **No production RTDB writes** occurred.
- **No Firestore or RTDB security-rule changes** occurred.
- **No schema or index changes** occurred.
- **No Firebase Hosting preview or production deployment** occurred.
- **No GitHub push** occurred.
- **No root `firebase.json` or active Hosting configuration change** occurred.
- **No billing or plan change** occurred.
- **No Firebase account creation or credential modification** occurred.
- **No secrets** (password, ID token, refresh token, cookies, config values) were
  requested, captured, printed, or stored.

## 10. Git changes from this verification

- Added: `OWNER-AUTH-AND-ADMIN-VERIFICATION-REPORT.md`
- Source files changed: **none**
- Test files changed: **none**
- `.env.local`: not staged, not committed
- Hosting cache: unchanged

---

**Verdict: READY WITH LIMITATIONS**

Owner authentication, UID matching, Admin authorization, session restoration,
logout, public access, and real read-only Admin behaviour are verified against
the existing `sledge-classroom` project. The only material gap is that Admin
write workflows could not be verified against a real Firebase backend because
the emulator requires Java 21+ and production writes are prohibited; those
workflows remain covered by mocked/unit tests only.
