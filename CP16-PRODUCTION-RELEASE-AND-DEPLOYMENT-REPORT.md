# CP-16 — Production Release & Deployment Report

**Project:** Sledge Classroom
**Checkpoint:** CP-16 — Production Release
**Production base:** `1d75925`
**Release candidate branch:** `cp14/targeted-ui-remediation`
**Hosting target:** `sledge-classroom`
**Production URL:** https://sledge-classroom.web.app
**Date:** 10 November 2026

---

## 1. Initial repository state

| Check | Result |
|---|---|
| Repository | `C:\LMS FOR my class lmao` |
| Starting branch | `cp14/targeted-ui-remediation` |
| Starting HEAD | `f02e76f73608fa0b9b1d1c2a448c9e81ae71ef8e` |
| `origin/main` | `1d759254e6a5252c591ed58ecfbfc649741b579d` (unchanged from production base) |
| Release-candidate remote | `f02e76f73608fa0b9b1d1c2a448c9e81ae71ef8e` (matches local) |
| Merge base | `1d759254e6a5252c591ed58ecfbfc649741b579d` |
| Working tree | Only pre-existing ` M .firebase/hosting..cache` plus untracked CP-10/11/12 reports; `.firebase/hosting..cache` never touched |

---

## 2. CP-15 commit-history discrepancy and resolution

CP-15's summary mentioned two commits while its detailed report described one. The actual history contains two commits on top of `1d75925`:

1. `1af2189` — `fix(ui): finalize CP-14 targeted interface remediations` (9 files: the UI fixes, cache-buster bumps, tests, and CP-13/14/15 reports).
2. `f02e76f` — `fix(test): align cache-buster assertion with index.html v=29` (1 file).

**Resolution:** the second commit is a legitimate, scoped follow-up. The cache-buster test assertion (`app.js?v=28` → `v=29`) was accidentally left at the old value in the first commit while `index.html` already referenced `v=29`. The follow-up commit corrected only that single assertion. Both commits belong to the approved CP-15 release work; no unrelated changes entered the candidate. No history rewriting or force-push was used to produce them.

---

## 3. Release candidate verification

- Local HEAD == remote RC == `f02e76f73608fa0b9b1d1c2a448c9e81ae71ef8e` (verified).
- `git diff 1d75925..HEAD --name-status` shows exactly the 10 approved files; no unexpected files.
- Full suite: 99/99 pass; `node --check` clean on both JS files; `git diff --check` clean.
- Cache-busters confirmed: `styles.css?v=27`, `app.js?v=29`, `bleach-easter-egg.js?v=4`; test assertion matches `app.js?v=29`.

---

## 4. Final merge strategy and result

- `main` was still at `1d75925` and the candidate was a direct descendant, so a **fast-forward merge** was used.
- Command: `git merge --ff-only cp14/targeted-ui-remediation`
- Result: `Updating 1d75925..f02e76f` (Fast-forward), 10 files changed, 1172 insertions, 25 deletions.
- No conflicts. No force-push.

---

## 5. Exact final `main` commit hash

`f02e76f73608fa0b9b1d1c2a448c9e81ae71ef8e`

---

## 6. GitHub push verification

- `git push origin main` succeeded: `1d75925..f02e76f main -> main`.
- Local `main` == `origin/main` == `f02e76f73608fa0b9b1d1c2a448c9e81ae71ef8e` (verified via `git ls-remote`).
- Release-candidate branch `cp14/targeted-ui-remediation` remains available on GitHub and points to the same hash.
- `main` was not force-pushed.

---

## 7. Test and build results (pre-deploy)

- Full suite: **99/99 pass**, 0 fail, 0 cancelled, 0 skipped.
- `node --check app.js` — PASS.
- `node --check bleach-easter-egg.js` — PASS.
- `git diff --check` — no whitespace errors.
- Firebase Hosting public directory `.` (315 files; tests/** and docs/** ignored by hosting config).

---

## 8. Firebase project and Hosting target verification

| Check | Result |
|---|---|
| `.firebaserc` default project | `sledge-classroom` |
| Active Firebase CLI project | `sledge-classroom (current)` (verified via `firebase projects:list`) |
| Firebase CLI version | 15.35.0 |
| Hosting public directory | `.` |
| Hosting ignore list | includes `tests/**`, `docs/**`, rules files, dotfiles |
| Hosting-only deploy | Yes (`--only hosting`) |

No Firestore, Functions, rules, or Storage deployment was performed.

---

## 9. Exact deployment command used

```
npx -y firebase-tools deploy --only hosting --project sledge-classroom
```

Result: `Deploy complete!` — Hosting URL `https://sledge-classroom.web.app`.
- 315 files found; 44 new files uploaded; version finalized and released.
- No errors during upload/finalize/release.

---

## 10. Live production QA results

CDP/Chrome headless against `https://sledge-classroom.web.app`:

| Check | Result |
|---|---|
| `styles.css?v=27` served | Yes |
| `app.js?v=29` served | Yes |
| `bleach-easter-egg.js?v=4` served | Yes |
| Labs deep link `/#labs` | `scrollY 0`, `<h1>` top 149 px, not clipped, `scroll-margin-top 88px` |
| Pop-up (light) | `wrapShadow none`, `wrapRadius 0px`, `objectFit contain`, `filter drop-shadow(...)` |
| Pop-up (dark) | `showNow()` returned no element (auto-popup had already dismissed / `isAnimating`); light-mode + local dark-mode verification (CP-14) confirms the same CSS applies |
| Navbar tokens | `Bebas Neue` wordmark, `JetBrains Mono` links, gold active underline `rgb(161,98,7)`, transparent active background |
| Horizontal overflow | 0 px at 320/360/390/430/768/1024/1440 across home/courses/labs/calendar |
| Console errors | 0 |
| Failed network requests | 0 |

Additional smoke (not re-measured live but verified locally and unchanged by deploy): Home, Courses, Calendar, Reading Room, theme switching, mobile menu, music popup, character popups, Quiet Mode, guest admin (login modal, `is-admin` stays false), keyboard focus/Escape, reduced-motion CSS.

---

## 11. Responsive viewport results

| Width | Pages checked | Overflow | Result |
|---|---|---|---|
| 320 | home, courses, labs, calendar | 0 | PASS |
| 360 | home, courses, labs, calendar | 0 | PASS |
| 390 | home, courses, labs, calendar | 0 | PASS |
| 430 | home, courses, labs, calendar | 0 | PASS |
| 768 | home, courses, labs, calendar | 0 | PASS |
| 1024 | home, courses, labs, calendar | 0 | PASS |
| 1440 | home, courses, labs, calendar | 0 | PASS |

---

## 12. Accepted limitations

1. No authenticated owner session; admin hover menu was verified with a simulated owner flag plus code/tests.
2. No real screen reader; Firefox/WebKit not installed (Chrome/Edge + CDP only).
3. Console errors were captured as zero in the final live run.
4. CP-13 content findings (M1–M3, L1–L7, S1–S3) remain open as future owner content/UX tasks.
5. Pop-up dark-mode rendering was not re-captured live (auto-dismiss timing); the identical CSS was verified locally and in light mode on production.

---

## 13. Preservation confirmations

- `.firebase/hosting..cache` was left exactly as found; never staged, edited, or reverted.
- No Firestore records, rules, Functions, Storage rules, or authentication configuration were deployed or modified.
- Only Firebase Hosting was deployed.
- No history rewriting or force-push was performed.
- The release-candidate branch `cp14/targeted-ui-remediation` remains available on GitHub.

---

## 14. Final verdict

**DEPLOYED AND VERIFIED**

- Merge: fast-forward `1d75925` → `f02e76f73608fa0b9b1d1c2a448c9e81ae71ef8e` on `main`.
- GitHub push: `main` and `cp14/targeted-ui-remediation` both at `f02e76f73608fa0b9b1d1c2a448c9e81ae71ef8e`.
- Firebase Hosting: deployed successfully to `https://sledge-classroom.web.app`.
- Live QA: cache-busters updated, Labs anchor fixed, pop-up halo gone, navbar refreshed, zero overflow, zero console errors, zero failed requests.
