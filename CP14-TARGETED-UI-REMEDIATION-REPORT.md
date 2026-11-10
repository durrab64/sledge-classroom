# CP-14 — Targeted UI Remediation Report

**Project:** Sledge Classroom
**Production:** https://sledge-classroom.web.app
**Firebase project:** `sledge-classroom`
**Base release:** `1d75925`
**Checkpoint type:** Focused implementation and regression verification
**Date:** 10 November 2026

---

## 1. Executive summary

CP-14 implemented the five user-reported fixes documented in §18 of `CP13-USER-EXPERIENCE-AND-CONTENT-AUDIT-REPORT.md`.

| ID | Issue | Status |
|---|---|---|
| U1 | Character pop-ups painted a rectangular shadow block | Fixed (CSS only; assets audited, no re-export needed) |
| U4 | Mobile navbar actions bunched beside the logo | Fixed |
| U5 | Desktop admin hover menu closed too fast / dead gap | Fixed (single JS authority + continuous hover bridge) |
| U3 | Labs masthead clipped under the navbar on deep link | Fixed |
| U2 | Navbar had never received the editorial redesign | Refreshed within existing structure |

All five fixes were implemented in the required order, focused tests were added after each, and the full regression suite passes **99/99** (82 baseline + 17 new). No commit, push, merge, deploy, rule change, production record change, or auth/permission change was made.

**Verdict: READY WITH DOCUMENTED LIMITATIONS**

The only limitations are environmental: no authenticated owner account was available (U5's live menu was verified with a simulated owner flag plus code/tests), no real screen reader, and Firefox is not installed on this machine. Production still serves `1d75925`; publishing these changes requires separate explicit approval.

---

## 2. Starting state and preflight

| Check | Result |
|---|---|
| Repository | `C:\LMS FOR my class lmao` |
| Starting branch | `cp13/user-experience-audit` |
| Starting HEAD | `1d759254e6a5252c591ed58ecfbfc649741b579d` |
| `origin/main` | `1d759254e6a5252c591ed58ecfbfc649741b579d` |
| Working tree | only pre-existing ` M .firebase/hosting..cache` plus untracked CP-10…CP-13 reports |
| Baseline suite | 82 pass / 0 fail |
| Working branch | `cp14/targeted-ui-remediation` (created from `1d75925`) |

The pre-existing `.firebase/hosting..cache` modification was never staged, edited, or reverted. All prior reports were preserved.

---

## 3. Files changed

| File | Change |
|---|---|
| `bleach-easter-egg.js` | U1 — wrapper shadow/radius removed; sprite now `object-fit: contain` with `filter: drop-shadow(...)` |
| `styles.css` | U4 mobile `nav-actions` alignment + wordmark shrink guard; U5 bridge CSS and removal of the competing `:has()`/hover visibility block; U3 Labs `scroll-margin-top`; U2 scoped CP-14 navbar refresh block |
| `app.js` | U5 — hover close delay 400 ms → 350 ms, Escape-to-close + focus return; comment documenting single authority |
| `tests/accessibility-regressions.test.js` | Updated the existing admin-menu test to assert the CP-14 single-authority mechanism instead of the removed CSS `:has()` rules |
| `tests/cp14-ui-remediation.test.js` | **New** — 17 tests covering U1–U5, GIF frame disposal/transparency, keyboard, admin gating, theme and nav preservation |

Not modified: `index.html` (nav structure, routes, cache-busters `styles.css?v=26`, `app.js?v=28`), the footer, Firebase config/rules, data files, and any character asset.

---

## 4. Root causes and implementations

### U1 — GIF pop-up transparency

**Root cause (confirmed):** the animation files were not the problem. The injected CSS applied a rectangular `box-shadow: 0 8px 24px rgba(0,0,0,.22)` and `border-radius: 14px` to `.bee-wrap` (a square wrapper around a transparent sprite), and `.bee-img` used `object-fit: cover; object-position: top center`, cropping non-square canvases (Ichigo 1:1 with character low in frame, Miku 4:3).

**Implementation (`bleach-easter-egg.js`):**
- `.bee-wrap`: removed `box-shadow` and `border-radius` (focus outline retained via `.bee-wrap:focus-visible`).
- `.bee-img`: `object-fit: contain; object-position: center`, removed `border-radius`, added `filter: drop-shadow(0 6px 10px rgba(0,0,0,.28))` so the shadow follows the sprite silhouette.
- No behavior change: same `<img>`, same `src`/`fallbackSrc`, same `showCharacter`/`dismiss`, same timing and sizes.

**Asset decision:** the deployed GIFs already contain correct per-frame disposal, so no re-export was performed (the checkpoint explicitly forbids unnecessary re-export).

### U4 — Mobile navbar alignment

**Root cause:** `.nav-links { margin-left: auto }` was the only spacer in the bar. Below 768 px `.nav-links` is `display: none`, so `.nav-actions` (base `margin-left: 8px`) collapsed next to the logo while the right side of the bar stayed empty.

**Implementation (`styles.css`, `@media (max-width: 768px)`):**
- `.nav-actions { margin-left: auto; }` — pins the theme/admin/hamburger cluster to the right.
- `.logo-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }` — lets the wordmark shrink instead of pushing controls.
- Desktop layout untouched.

### U5 — Desktop hover menu stability

**Root cause (confirmed):** two competing visibility systems. CSS `:has()`/sibling-hover rules showed the panel only while the trigger or panel was hovered; JS maintained `.hidden` with a 400 ms timer. The panel starts at `calc(var(--nav-height) + 8px)`, i.e. 8 px below the navbar edge and ~24 px below the 42 px trigger. Crossing the gap, the CSS rule dropped immediately and the 150 ms `.hidden` fade began, so the JS timer could not keep it open.

**Implementation:**
- Removed the CSS hover/`:has()` visibility override entirely; JS is now the only visibility authority.
- `app.js`: close delay reduced to **350 ms** (within the requested 300–400 ms window); pointer enter/leave on button and panel; `focusin`/`focusout` retained for keyboard; existing touch tap-toggle untouched.
- Added **Escape** handling: closes the menu and returns focus to `#admin-btn`.
- `styles.css`: `.admin-dropdown` is `overflow: visible` with an invisible `::before` bridge 14 px tall across the navbar gap. The trigger also gets an invisible `::after` hit-extension 22 px tall, closing the remaining distance between the button's bottom (y≈56.5) and the panel bridge (top edge y≈66). Together they form a continuous hover boundary.
- Admin-only behavior unchanged: `showAdminMenu`/`scheduleHideAdminMenu` still return early unless `isAdmin`; auth state still fails closed.

### U3 — Labs heading clipping

**Root cause:** `#labs.anchor-target` had `scroll-margin-top: 0`, unlike the Calendar anchor. On a full deep-link load the browser scrolled the Labs anchor to the viewport top, placing the masthead under the 72 px fixed navbar.

**Implementation (`styles.css`):**
```css
.page-labs #labs.anchor-target {
    scroll-margin-top: calc(var(--nav-height, 72px) + 16px);
}
```
Same pattern as the Calendar anchor. No data, aggregation, or resource-link changes; no bench-card restyle (comparison found no blocking inconsistency).

### U2 — Navbar visual consistency

**Root cause:** the footer and page mastheads were redesigned (Bebas Neue display type, JetBrains Mono meta labels, hairline rules, gold accents), but navbar styles still traced to the original `ada2d35` commit (blue pill active states, generic radii).

**Implementation (`styles.css`, appended CP-14 block scoped to `.navbar`):**
- Wordmark: `Bebas Neue`, uppercase, `1.55rem`, `0.03em` tracking.
- Nav links: `JetBrains Mono`, `0.68rem`, `500`, `0.14em` tracking, uppercase, transparent background, no pill radius.
- Active state: `--text-primary` text with a 2 px gold underline (`#a16207` light, `#d8b45f` dark) and gold icon.
- Hover: text brightens with a hairline underline; legacy blue pill overrides neutralised.
- Mobile menu links use the same mono meta typography; the active item uses a gold left marker instead of the blue pill.
- PKT clock uses mono tracking.
- Narrow-phone guards (`≤430 px`, `≤360 px`) added inside the refresh block so the desktop wordmark size cannot override the existing shrink/hide behavior.

Preserved: nav DOM, routes/hashes, `data-page` routing, theme toggle, admin button visibility/authorization, 42 px controls, keyboard focus rings.

---

## 5. Before/after evidence

Evidence root: `C:\Users\mhDur\AppData\Local\Temp\opencode\cp8\evidence\cp14\` (`before/` contains production `1d75925` captures).

### U1 — pop-up

| Metric | Before (production) | After (local) |
|---|---|---|
| `.bee-wrap` box-shadow | `rgba(0,0,0,.22) 0 8px 24px` | `none` |
| `.bee-wrap` radius | `14px` | `0px` |
| `.bee-img` object-fit | `cover` | `contain` |
| Image filter | `none` | `drop-shadow(... 0 6px 10px)` |
| Visible halo | Yes (rectangular) | None |

Screenshots: `before/popup.png`, `popup-ichigo-gif-light.png`, `popup-miku-gif-light.png`, `popup-orihime-webp-light.png`, `popup-*-dark.png`, `popup-mobile390-light.png`, `popup-mobile390-dark.png`.

### U2/U4 — navbar

| Viewport | Before (production) | After (local) |
|---|---|---|
| 320 px | actions right edge 206 px, right gap 114 px | right edge 308 px, right gap 12 px |
| 390 px | actions left 131 px, only 16 px from logo, right gap 121 px | actions left 240 px, 137 px from logo, right gap 12 px |
| 430 px | controls clustered left | right gap 12 px |
| 768 px | — | right gap 24 px, logo 156 px readable |
| 1024 px | — | right gap 24 px |
| 1440 px | blue pill active state | gold underline, mono uppercase meta labels |

Horizontal overflow: `0 px` at every tested width, before and after.

Screenshots: `before/nav-320.png`, `before/nav-390.png`, `before/nav-1440.png`, `nav-320.png`, `nav-360.png`, `nav-390.png`, `nav-430.png`, `nav-768.png`, `nav-1024.png`, `nav-1440.png`, `nav-dark-390/768/1024/1440.png`, `mobile-menu-390-light.png`, `mobile-menu-390-dark.png`.

### U3 — Labs anchor

Reproduced exactly with a full document load to `/#labs`:

| Metric | Before | After |
|---|---|---|
| `scrollY` | 84 px | 0 px |
| Navbar height | 72 px | 72 px |
| `<h1>` top | 65 px (**clipped**) | 149 px |
| `scroll-margin-top` | `0px` | `88px` |
| Anchor top | −12 px | 72 px |

Screenshots: `anchor-full-before-1440.png` (kicker and top of “THE LABORATORY” behind the navbar), `anchor-full-after-1440.png` (kicker and title fully visible).

### U5 — hover menu

Settled geometry at 1440 px and 1024 px:

| Metric | Value |
|---|---|
| Trigger bottom | y = 56.5 |
| Panel top | y = 80 (8 px below navbar) |
| Button-to-panel gap | 24 px |
| Button bridge | 22 px, reaches y = 79 |
| Panel bridge | 14 px, top edge y = 66 |
| Continuous boundary | Yes (79 ≥ 66, horizontal coverage includes the trigger) |

Screenshot: `hover-open-1440.png` (menu open with no visible gap artefact).

---

## 6. GIF asset verification

Byte-level GIF89a block inspection (all frames, not just frame 0):

| Asset | Canvas | Frames | Per-frame GCE | Disposal | Transparency |
|---|---|---|---|---|---|
| `ichigo.gif` | 500 × 500 | 8 | all frames | `2` on every frame | true on every frame |
| `miku.gif` | 160 × 120 | 20 | all frames | `2` on every frame | true on every frame |
| `orihime.gif` | 360 × 360 | 136 | all frames | `2` on every frame | true on every frame |

- No ghosting was observed in headless Chrome playback across frame captures.
- No re-export was performed; dimensions, timing, transparency and file sizes are unchanged.
- `orihime.webp` (184 × 184, RGBA) remains the primary Orihime asset with `orihime.gif` as fallback.
- No animation was converted to a static image; no character was replaced.
- Miku's 4:3 canvas is now letterboxed inside the 92 × 92 (68 × 68 mobile) box without cropping; the transparent letterbox is invisible.

---

## 7. Responsive matrix

| Viewport | Logo | Controls position | Overflow-X | Active indicator | Result |
|---|---|---|---|---|---|
| 320 | hidden (existing ≤360 rule) | right, 12 px margin | 0 | gold underline (hidden nav) | PASS |
| 360 | hidden (existing rule) | right, 12 px margin | 0 | — | PASS |
| 390 | “SLEDGE” readable | right, 12 px margin | 0 | — | PASS |
| 430 | readable | right, 12 px margin | 0 | — | PASS |
| 768 | full wordmark 156 px | right, 24 px margin, burger visible | 0 | — | PASS |
| 1024 | full wordmark | right, 24 px margin, burger hidden | 0 | gold underline | PASS |
| 1440 | full wordmark | right (nav max-width), 84 px outer margin | 0 | gold underline | PASS |

Pop-ups: desktop 1440 and mobile 390, light and dark — all render with a transparent background and silhouette shadow.

Labs anchor: verified on desktop 1440 and mobile 390.

---

## 8. Hover and keyboard results

Simulated owner session (`isAdmin = true`, `body.is-admin`) at 1440 px and 1024 px, real CDP pointer/keyboard events:

| Test | 1440 | 1024 |
|---|---|---|
| Hover trigger opens menu | PASS | PASS |
| Slow crossing (~900 ms, 30 steps) stays open | PASS | PASS |
| Pause 800 ms inside bridge, then continue | PASS (stays open) | PASS |
| Genuine leave closes after grace period | PASS | PASS |
| Fast button → panel jump stays open | PASS | PASS |
| Keyboard focus opens menu | PASS | PASS |
| Escape closes and returns focus to `#admin-btn` | PASS | PASS |
| Pointer over menu item keeps it open | PASS | PASS |
| Leaving the panel closes it | PASS | PASS |

Keyboard navigation of the public bar: Tab order `nav-logo-link → nav-home → nav-courses → nav-labs → nav-calendar → theme-toggle`, each with a visible 2 px focus outline.

Theme switching: `light → dark`, persisted to `localStorage.theme`.
Guest admin button: opens the login modal; `body.is-admin` stays false; no admin control becomes public.

---

## 9. Admin limitations

- No owner credentials were available in this environment, so the live menu was exercised by setting the existing `isAdmin` flag from the page context and adding `is-admin` for styling. This validates the event wiring, geometry, delay, Escape behavior and CSS, but it does not validate a real Firebase session end-to-end.
- Firestore rules, `admin-auth.js`, owner UID resolution, and login/logout flows were not modified; existing admin tests pass unchanged.
- Touch tap-toggle was verified by code/test only (headless touch emulation was used for the mobile layout, not for the admin menu).

---

## 10. Regression suite

Command:

```
node --test tests\admin-auth.test.js tests\write-guards.test.js tests\admin-state-ui.test.js ^
  tests\reader-description.test.js tests\reader-navigation.test.js ^
  tests\accessibility-regressions.test.js tests\labs-redesign.test.js ^
  tests\calendar-redesign.test.js tests\cp14-ui-remediation.test.js
```

Result: **99 tests, 99 pass, 0 fail, 0 cancelled, 0 skipped.**

- Baseline: 82 pass.
- New `tests/cp14-ui-remediation.test.js`: 17 tests.
- One existing test (`desktop admin menu opens on hover/focus and only touch keeps click toggle`) was updated to assert the new single-authority mechanism (350 ms, `focusin`/`focusout`, bridge present, no `:has()` override). The behavioral intent is unchanged.

The new tests cover: wrapper shadow/radius removal, `object-fit: contain`, animated asset sources, per-frame GIF disposal/transparency/dimensions, Labs anchor offset, mobile action alignment, immutable narrow-phone logo rules, single visibility authority, bridge geometry, grace delay, keyboard/Escape, touch toggle, admin gating, nav routes, theme preservation, and the scoped navbar block.

---

## 11. Build and syntax checks

| Check | Result |
|---|---|
| `node --check app.js` | PASS |
| `node --check bleach-easter-egg.js` | PASS |
| `styles.css` brace balance | 1523 open / 1523 close |
| HTML/route/markup tests | PASS |
| Local static serve (`http://127.0.0.1:8005/`) | Loads and renders all changed styles |
| Console errors during verification | None observed |

---

## 12. Remaining limitations

1. No real owner session, real screen reader, or Firefox/WebKit in this environment; verification used Chrome/Edge + CDP.
2. Production still runs `1d75925`; the fixes exist only in the working tree on `cp14/targeted-ui-remediation` until a separate release is approved.
3. U1 is scoped to the pop-up wrapper/image. The pre-existing behavior that both `bee-left` and `bee-right` sprites settle at the left edge was observed but is outside CP-14's five fixes and was not changed.
4. CP-13 content findings (M1–M3, L/S items) remain open by design; content corrections require separate approval.
5. `index.html` cache-busters were not bumped, so a future deployment must handle cache invalidation deliberately rather than as part of this checkpoint.

---

## 13. Scope confirmation

- No commit, push, merge, or deploy was performed.
- No Firebase rules, production records, authentication architecture, or admin permissions were changed.
- No resource catalogue, descriptions, calendar events, or Past Papers data were modified.
- No unrelated section was redesigned; the footer was not touched.
- `.firebase/hosting..cache` was left exactly as found and never staged.
- Branch `cp14/targeted-ui-remediation` is based on `1d75925`; `origin/main` remains `1d75925`.

**Verdict: READY WITH DOCUMENTED LIMITATIONS**
