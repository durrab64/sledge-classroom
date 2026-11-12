# Firebase Integration & Legacy Feature Parity Report

**Project:** Sledge Classroom 2.0 (React)
**Branch:** `modernization/react-foundation`
**Baseline commit:** `c6c15c9d3d74d58749aac9bb23ed0797d178bc50` (CP14)
**Firebase project:** `sledge-classroom` (existing project only)
**Mode:** owner-authorized integration, read-only real-data verification, parity audit
**Verdict:** **READY WITH LIMITATIONS**

---

## 1. Git baseline and preservation

- Verified branch `modernization/react-foundation` at HEAD `c6c15c9d3d74d58749aac9bb23ed0797d178bc50`.
- Confirmed CP14 `c6c15c9` is an ancestor of the current HEAD.
- No amend, reset, rebase, force-push, or history rewrite was performed.
- No push and no deployment occurred.
- `.firebase/hosting..cache` was not modified by this milestone. Its SHA-256 remained
  `732BDBCD76C1835D11BC4A3DD6136E92E5D4C6E50F53C19221631A75F557BBEA`.
- Pre-existing working-tree changes (root `app.js`, `index.html`, `firebase.json`,
  legacy test files, report deletions/additions, `node_modules/`, root
  `package.json`/`package-lock.json`, etc.) were left untouched.
- Only files belonging to this milestone were changed/added under `modern/`.
- `.env.local` remains git-ignored (`modern/.gitignore:17` covers `.env.*`) and was
  never staged or printed. `.env.example` is preserved.

## 2. Firebase configuration status

- Recovered the seven public web identifiers from the existing legacy
  `firebase-config.js` and wrote them to the local, ignored `modern/.env.local`.
- Confirmed the legacy `projectId` is `sledge-classroom`.
- All seven required variables are present:
  `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_STORAGE_BUCKET`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- No values were printed in terminal output or this report. No service-account
  credentials or private keys were added. No billing change was made.
- A production build using the real configuration succeeded, and the emitted
  bundle contains the configured Firebase identifiers.

## 3. Authentication verification

| Check | Status | Evidence |
|---|---|---|
| Owner account exists and remains the only account | Verified (owner-side, unchanged) | UID preserved: `dRHxakX2iAWM4w1IqtYPLpCZrwr2`; no account creation in this milestone |
| Invalid credentials rejected | **Verified against real Firebase** | Real `POST /v1/accounts:signInWithPassword` reached; UI showed “Invalid email or password.” and stayed on `#/login` |
| Unauthenticated `/admin` access blocked | **Verified** | Real-data browser run redirected `#/admin` to `#/login`; admin UI not rendered |
| Login happy path | Implemented, requires owner-side verification | Requires the owner to type their password locally; never requested in chat |
| Auth state restoration after reload | Implemented, requires owner-side verification | Depends on a real owner session |
| Logout | Implemented, requires owner-side verification | Depends on a real owner session |
| Loading / invalid-credential / error states | Implemented and unit-tested | Auth context and `LoginForm` tests |

No password, token, or credential was requested, stored, logged, or committed.

## 4. Firestore integration results

Read-only production checks against `sledge-classroom`:

- Firestore listen channel observed from the real app.
- Course catalogue: **9 courses** rendered (6 theory, 3 lab).
- `courses/os` detail: 11 lecture resources, 0 past papers, 1 related resource,
  1 lab resource. REST confirmed `os/lectures=11`, `os/papers=0`,
  `os/related=1`, `os/lab=1`.
- `events`: **6 documents**, date range `2026-10-29..2026-11-05`, 4 in November 2026.
  Calendar rendered “4 events scheduled”.
- Event documents carry the legacy fields:
  `courseId, createdAt, date, description, groups, time, title, type`.
- Resource document fields preserved verbatim:
  `name, url, previewURL, downloadURL, type, description, date, createdAt`.
- No hardcoded sample resources replaced real content, and no duplicate records
  were observed in the rendered lists.
- Loading, empty, and error states are implemented in the read pages.

## 5. RTDB integration results

- Real unauthenticated REST read of `nowPlaying/current` returned **HTTP 200**.
- Present fields: `artist, artwork, isPlaying, songUrl, source, title, updatedAt`.
- The modern Now Playing repository remains a **read-only** consumer.
- No RTDB rule was modified and no production RTDB data was written.

## 6. Google Drive compatibility

- Production data contains 36 `drive.google.com` URLs and 3 `docs.google.com` URLs.
- Every inspected resource had `url`, `previewURL`, and `downloadURL`.
- Existing Drive/Docs links are rendered without migration, moving, duplication,
  or deletion.
- URL normalization, Drive preview/download derivation, Dropbox direct-download
  conversion, and unsafe-scheme rejection are covered by existing unit tests.
- Missing/invalid resource links fall back to a non-clickable state; stored
  `javascript:`/`data:` values are never emitted as clickable `href`s.
- No Drive file was modified.

## 7. Legacy feature parity matrix

Legend: **Verified equivalent** · **Needs real-Firebase verification** · **Missing** · **Intentionally excluded**

| Feature | Classification | Notes |
|---|---|---|
| Home | Verified equivalent | Real course/event data, responsive layout, no page overflow at all tested widths |
| Courses catalogue | Verified equivalent | 9 real courses, filters/search/sort preserved |
| Course navigation | Verified equivalent | Course detail routes and legacy hash mapping verified |
| Course categories (theory/lab) | Verified equivalent | Lectures/papers/related plus lab categories |
| Resource catalogue | Verified equivalent | Real resources load and map correctly |
| Reading Room | Verified equivalent | Preview/open/download flows and URL normalization tested |
| Resource preview and download | Verified equivalent | Drive/Docs URLs preserved; safe-link guards in place |
| Labs | Verified equivalent | Real lab directory and resources |
| Calendar | Verified equivalent | 4 real November 2026 events, month grid, day panel |
| Events (display) | Verified equivalent | Course + calendar + home event feeds |
| Events (admin create/delete) | Needs real-Firebase verification | **Newly implemented this milestone**; mocked write tests pass; no production write performed |
| Now Playing | Verified equivalent | Real RTDB reads; read-only |
| Login and logout | Needs real-Firebase verification | Error path verified against production; happy path needs owner password |
| Admin dashboard | Verified equivalent | Owner-gated, real data reads |
| Resource upload (create) | Needs real-Firebase verification | Implemented; emulator blocked (see §9); no production write |
| Metadata editing | Needs real-Firebase verification | Transactional stale-check implemented and unit-tested |
| Resource deletion | Needs real-Firebase verification | Metadata-only semantics tested; no production write |
| Theme selection and persistence | Verified equivalent | Existing localStorage keys/tests preserved |
| Responsive navigation | Verified equivalent | 320/390/768/1024/1440 audit |
| Existing deep links / hash compatibility | Verified equivalent | Legacy hashes normalize to current routes (browser-checked) |
| Chota Don / AI chatbot | Intentionally excluded | Owner decision |
| Past Papers | Manual Drive workflow | Intentionally unchanged |

No legacy functionality was silently dropped. The only parity gap found —
admin event create/delete — was implemented rather than omitted.

## 8. Admin functionality verification

- Owner-only route guard (`ProtectedRoute`) and the unchanged Firestore rules
  remain the authorization boundary. No client-side authorization is claimed.
- Resource create preserves `confirmUpload()` semantics: scheme correction,
  URL validation, Drive preview/download derivation, and duplicate detection
  scoped to course/category.
- Metadata edit preserves the legacy sequence: read → stale snapshot compare →
  transactional update → read-back verification of saved and unrelated fields.
- Resource deletion removes only Firestore metadata; Google Drive files are
  never deleted.
- Duplicate detection collapses Drive/Docs URLs to stable keys.
- **New:** calendar-event management in the admin page:
  - course-scoped event list with loading/empty/error states;
  - add-event dialog with the legacy fields (title, date, time, type, course,
    description, comma-separated groups);
  - validation requiring title + ISO date;
  - payload `{ title, date, time, type, courseId, description, groups, createdAt }`;
  - delete with explicit confirmation;
  - list refreshes after create/delete.
- Event writes use `events/{eventId}` and remain subject to the deployed
  owner-only Firestore rules.

## 9. Production versus emulator testing distinction

Real production checks performed (read-only):

- Firebase initialization and Firestore listen traffic against `sledge-classroom`.
- Public Firestore course/event reads.
- RTDB `nowPlaying/current` read.
- Invalid-credential auth request and `/admin` access control.

Mocked / unit-level only:

- All resource and event create/update/delete persistence behavior.
- Repository payload shape, error mapping, duplicate detection, stale-protection,
  and metadata-only deletion.

Emulator limitation:

- Firebase CLI 15.35.0 requires Java 21+, while the local runtime is Java 8
  (`Error: firebase-tools no longer supports Java version before 21`).
- Therefore write-path emulator integration tests could not be run.
- No software was installed and no production write was performed to compensate.

## 10. Tests and build results

| Gate | Result |
|---|---|
| `npm ci` | Completed earlier in this milestone |
| `npx vitest run` | **276 tests / 26 files passed** |
| `npx tsc -b` | **Passed (exit 0)** |
| `npm run build` | **Passed (exit 0)**; only the existing large-chunk warning |
| `npx oxlint` | **0 errors / 24 warnings** (pre-existing warning classes; one new `set-state-in-effect` warning follows the existing effect-loading pattern) |

Browser audit with real data — 11 routes × 5 widths (320, 390, 768, 1024, 1440):

- No page-level horizontal overflow (`overflowX=false` everywhere).
- No console or page exceptions on fresh loads.
- Two rapid-navigation audit passes produced only transient `net::ERR_ABORTED`
  events caused by in-flight requests being cancelled during route changes.
  Fresh single-load checks of the affected routes produced **no failures**.
- Admin route correctly redirected to login at every width.

## 11. Remaining security decisions

1. **RTDB write rule** — the Chrome extension account UID is still unconfirmed.
   The existing `auth != null` write rule was **not** tightened, and the extension
   was not modified. This remains an owner review item before any rule change.
2. **Firestore owner-only writes** remain enforced server-side. The modern app
   does not claim to replace those rules.
3. **Local configuration** — `.env.local` stays untracked and contains only the
   public web client identifiers. No privileged credentials exist in the frontend.

## 12. Remaining blockers

- **Owner login / reload restoration / logout** against real Firebase require the
  owner to enter the password locally. These could not be executed by the agent.
- **Emulator-based write integration tests** are blocked by Java 8 vs the required
  Java 21 runtime. No installation was attempted.
- **Real production writes** and **rule deployment** remain prohibited by scope, so
  admin create/edit/delete are verified only by mocked tests.
- **Chrome extension account UID** remains unconfirmed; RTDB write-rule decision is
  open.
- Deployment, Hosting preview, and push are explicitly out of scope and were not
  performed.

## 13. Files changed and commit details

Source changes:

- `modern/src/features/admin/AdminPage.tsx`
  — event panel, add-event dialog, delete confirmation, event loading state,
  and new optional `eventReader` / `eventWriter` props.
- `modern/src/features/admin/adminEvent.ts` **(new)**
  — pure event types, draft, groups parsing, and validation/payload builder.
- `modern/src/features/admin/index.ts`
  — exports event types and helpers.
- `modern/src/services/repositories/adminRepository.ts`
  — `createEvent()` and `deleteEvent()` on `events/{eventId}` plus payload type.
- `modern/src/services/repositories/eventRepository.ts`
  — read-only `listEventsForCourse()` equality query.

Test changes:

- `modern/test/features/adminEvent.test.ts` **(new)**
  — pure event helper coverage.
- `modern/test/features/adminPage.test.tsx`
  — event load/create/delete/validation/error UI coverage and fake event adapters.
- `modern/test/repositories/adminRepository.test.ts`
  — event payload, path, failure, and not-configured coverage.

Commit:

- Suggested message: `feat(firebase): connect React classroom to existing backend`
- Commit contains only the milestone files above plus this report.
- `.env.local` is explicitly excluded. No push or deployment was done.

---

**Verdict: READY WITH LIMITATIONS**

Core Firebase integration is verified against the real `sledge-classroom`
project for public reads, RTDB Now Playing, invalid-credential handling, and
admin access control. Legacy parity is complete except for owner-authenticated
login/session checks and real write-path verification, which remain blocked by
the owner-password requirement, the Java 21 emulator requirement, and the
no-production-writes scope.
