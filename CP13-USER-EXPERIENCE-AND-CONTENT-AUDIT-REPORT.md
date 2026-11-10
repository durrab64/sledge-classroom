# CP-13 — USER EXPERIENCE & CONTENT QUALITY AUDIT REPORT

**Project:** Sledge Classroom · **Production:** https://sledge-classroom.web.app · **Firebase:** `sledge-classroom`
**Baseline:** `1d75925` · **Branch:** `cp13/user-experience-audit` · **Date:** Nov 10 2026
**Type:** READ-ONLY AUDIT — no implementation work; nothing committed, pushed, or deployed

---

## 1. Executive Summary

CP-13 evaluated the live site from a real student's perspective across six journeys (course discovery, lab resources, opening resources, Reading Room, calendar, general site experience), audited the complete published content catalogue (read-only Firestore REST read), verified every external resource link (101 links), and re-tested responsive usability at 320/390/768/1440.

**The site works well for students.** Discovery is straightforward, all 9 course cards describe their content accurately, and every one of the 101 external Google Drive/Docs links resolves (HTTP 200/303). The Reading Room is strong — clear breadcrumbs, full metadata, working previous/next navigation, related-resource lists, and in-site Google Drive previews. Calendar month navigation, empty states, and mobile layout behave correctly.

The genuine findings are **content-quality issues**, not technical defects: typo'd event titles ("MIDTERm", "Theoy of Automata"), one event assigned to the wrong course, zero resource/event descriptions in the data layer, an empty Past Papers category across all courses, and inconsistent capitalization. None block a student journey.

## 2. Verdict

**READY WITH DOCUMENTED LIMITATIONS**

- No Critical or High findings.
- 3 Medium content-quality findings (should be fixed by the owner in the next content pass).
- 6 Low polish findings and 3 Suggestions.
- **User-reported extension (§18):** 4 Medium UX/visual defects (pop-up block shadows, Labs masthead clipping + card divergence, mobile navbar alignment, admin hover-menu timing) and 1 Low design-consistency finding — all reproduced/diagnosed, none blocking, queued for CP-14.
- Limitations: no real screen-reader, no Firefox on this machine, no authenticated owner session.

## 3. Repository Preflight & Git State

| Check | Result |
|---|---|
| Repository location | `C:\LMS FOR my class lmao` ✓ |
| Branch before | `cp12/production-hardening` (HEAD `1d75925`) |
| HEAD / origin/main | `1d759254e6a5252c591ed58ecfbfc649741b579d` — matches released baseline ✓ |
| Baseline suite | 82/82 passing ✓ |
| Branch created | `cp13/user-experience-audit` from `1d75925` ✓ |
| Preserved work | `CP10/CP10.1/CP11/CP12` reports untouched; `.firebase/hosting..cache` untouched ✓ |
| `git status` after audit | Only the pre-existing cache modification + report files (incl. this one) — **zero application file changes** ✓ |

## 4. Student Journey Results

### Journey A — Discover a course ✅ PASS (findings: L4, S1)

Reproduction: load `https://sledge-classroom.web.app/#courses`, first visit, no login.

- Home hero ("KNOWLEDGE IS POWER.") plus sub-copy explains the service plainly: *"Explore computer science study materials, programming labs, course notes, and past papers for NUML BSCS students. 100% free, with direct downloads and zero login barriers."* Clarity good.
- Stats strip (06 Theory · 03 Lab · ∞ Open Resources) sets expectations immediately.
- Courses page has a clear lede ("Theory and practical resources, organised by course…"), filter pills (All/Theory/Lab), a live search box, and 4 sort modes — discovery tools are above typical class-site standard.
- All 9 archive cards (6 theory + 3 lab) expose code, full name, an accurate one-line description, and per-category counts (e.g. OS: 11 Slides · 0 Papers · 1 Material · 1 Event). Counts match the Firestore catalogue exactly (verified against the dumped collection data).
- Navigation labels (Home / Courses / Labs / Calendar) are intuitive; no unnecessary clicks: Courses → card → tab → resource is 3 steps max.
- Finding L4: three courses appear twice (theory card + lab card) with identical names; only the small Theory/Lab type chip differentiates. Confusing on first scan.

### Journey B — Find a laboratory resource ✅ PASS (finding: L2 evidence)

Reproduction: `#labs` → Bench Directory → open a bench.

- Labs masthead explains the purpose and its per-bench stats aggregate correctly (3 sections · 7 manuals · 0 tasks · 3 sessions — matches Firestore: `os/lab`=1, `web/lab`=3, `arch/lab`=3).
- Bench Directory shows exactly 3 benches with accurate per-bench metrics and accessible `aria-label`s.
- Bench → detail opens the lab-mode course view with distinct tabs (Lab Manuals 03 / Lab Past Papers 00 / Code & Tasks 00 / Lab Schedule). Web Engineering manuals: "lab 4", "lab 2", "lab 3" with OPEN/DOWNLOAD actions.
- Mixed titles "lab 2/3/4" (lowercase, no descriptive names) are scannable but not informative — see L6.
- Empty states communicate clearly: "No Lab Resources Yet — Lab manuals, code files, and experiment sheets will appear here."

### Journey C — Open an academic resource ✅ PASS (link verification complete)

Method: sources. the published catalogue via **read-only Firestore REST** (public-read rules honor anonymous reads) + production UI checks. No writes performed.

- **All 101 unique external links resolve: 59 × HTTP 200 (view pages), 42 × HTTP 303 (Drive download redirects). Zero confirmed failures.** (`cp13-links.json`)
- Every resource has a valid `downloadURL`/`url`/`previewURL`; no dead storage or placeholder URLs were found.
- Destination matches the displayed label: type "PDF" items open Drive file views, "Slides" items open Google Slides/Docs presentation links — verified representative sample.
- Reader actions ("View online", "Open in Google Drive", "Download", in-site preview iframe) all present on the sampled resource.
- Download links (303 → `uc?export=download`) redirect normally; no large files were downloaded.

### Journey D — Reading Room ✅ PASS (findings: L5 partial-verify)

Reproduction: `#course-os` → Lectures → open "Lecture 14-15"; also deep-link `#course-os/lectures/52X4IBqkfVKyOkUq5fLX`.

- Breadcrumb "COURSES / OPERATING SYSTEMS / LECTURE SLIDES" gives full context; "BACK TO LECTURE SLIDES" returns to the original category. Return-to-course-context works.
- Metadata complete and clear: Uploaded Oct 28 2026 · Source Google Drive · Format PDF · Course CS 321.
- In-site preview loads in a Google Drive iframe (`— verified src: drive.google.com/file/d/1CTVdV…/preview`).
- Previous/Next navigation works (Lecture 14-15 has no previous — newest; NEXT → Lecture 12); related list "More in Lecture Slides" lists 4 sibling lectures.
- Deep-link directly opens the reader view correctly.
- Browser Back exits the reader into the category view (readerHidden confirmed at `#course-os/lectures`); forward/deeper multi-step back-forward was inconclusive in automation (R4 limitation) but no defect found.

### Journey E — Academic calendar ✅ PASS (findings: M1, M2, L3)

- Month navigation (prev 42×42 / next 42×42 / today 69×42 buttons) and Today retargeting work; "THE CALENDAR" masthead renders correctly with grid + agenda.
- November 2026 grid shows the 4 exam events with readable chips ("MVC MIDTERM", "Stats & Probability MIDTERm", …). December 2026 shows a clear empty state. Live agenda correctly shows "No Upcoming Events — Add events from the Calendar page…" because all 6 events (Oct 29 – Nov 5) are in the past relative to today (Nov 10). Event chips/keyboard semantics verified in CP-10.
- Mobile (390/320): zero overflow, month title scaling verified in CP-10 and re-confirmed.
- Content findings: M1 (all events lack descriptions), M2 (typos + one event on the wrong course).
- No events were created, edited, or deleted.

### Journey F — General site experience ✅ PASS (findings: L1, L2, S1–S3)

- Dock: opens a self-explanatory effects panel with presets; labelled "Show or hide…"; Alt/M/N keyboard shortcuts documented in-site.
- Music popup (`#now-playing-widget`): toggles correctly with clean "YOUTUBE OFFLINE / Not listening right now" state and proper `aria-pressed`. **Observed a delayed fade-out when toggling off** — recorded as L2.
- Quiet Mode: verified working (`body.quiet-mode effects-paused`). Good discoverability via the dock.
- Character popups ("Ganbatte!✨", "Haiii♥"): charming, but currently **render on top of content** (screenshots show a bubble over the hero headline area and over the Labs stats panel) — recorded as L1.
- Theme switching: verified light↔dark on Home (and previously full-site).
- Footer: complete secondary nav (Home/Courses/Labs/Calendar + all 6 course deep-links + attribution). No dead links.
- Zero console errors and zero failed network requests across all crawls.

## 5–11. Content Quality, Discoverability & Data Findings (read-only catalogue audit)

Catalogue: **54 resources** across 6 courses; counts: stats lectures 1 / related 6; automata lectures 3 / related 6; calculus related 4; os lectures 11 / related 1 / lab 1; web lectures 3 / lab 3; arch lectures 7 / related 5 / lab 3. **Events: 6.**
No changes were made to any record.

| ID | Sev | Location | Actual vs Expected | Resolution |
|---|---|---|---|---|
| **M1** | Medium | All `courses/*` (53/54 docs) and all `events/*` | `description` field empty; UI has no description text for any resource or event | Owner adds 1-line descriptions during a content pass; UI already renders descriptions when present |
| **M2** | Medium | `events/*` (production) | 1) Typos: "MIDTERm" ×3, "Theoy of Automata MIDTERM"; 2) **"Web Engineering MIDTERm" stored with `courseId: "arch"`** — wrong course; it renders under Computer Architecture attribution | Owner edits event records from the authenticated UI; no record was modified by this audit |
| **M3** | Medium | Past Papers tab, all 6 courses | Past Papers category exists everywhere but contains **0 items in every course** — students specifically seeking past papers find a consistent empty set | Either upload papers or rename/deprioritize the category; empty states do communicate the situation correctly |
| L1 | Low | Home hero, Labs stats (320–757 px evidence) | Character bubbles ("Ganbatte!✨", "Haiii♥") can overlap headline/panel text | Move mascot anchor point above/below text blocks; keep Quiet Mode as instant fix |
| L2 | Low | Music widget | Widget appears to remain briefly visible after toggle-off (CSS fade timing); needs visual confirm | Shorten transition or hide immediately |
| L3 | Low | Calendar agenda | Agenda 'upcoming events' date chip measured 78×22 px (<40 px touch target) | Increase chip padding on touch breakpoints |
| L4 | Low | Courses page | OS/Web/Arch each appear as two cards with identical titles (Theory vs Lab) | Differentiate titles (e.g. "Operating Systems — Lab") |
| L5 | Low | OS lectures | Duplicate generic titles: "Lecture 01" ×3 courses, "course outline" ×3 | Add course/section qualifier in titles where useful |
| L6 | Low | OS, Web materials | Inconsistent capitalization ("web engineering slides 2", "lab 2/3/4") vs Title-Case elsewhere | Normalize naming convention |
| L7 | Low | Top nav (light theme screenshots) | Nav label glyphs appeared faint/washed in captures — needs human eyeball; contrast was previously verified programmatically (~4.5:1) | Re-verify visually; no code change authorized |
| S1 | Sugg | Home hero | "Good morning, scholars. Pakistan Standard Time." reads oddly with the period+location phrasing | Refine copy ("for scholars in Pakistan · 09:40 PKT") |
| S2 | Sugg | Lab Manuals | "lab 2/3/4" titles carry no topic info | Name manuals by experiment topic |
| S3 | Sugg | Courses page | Search covers course names only (not resource titles) | Extend search to resource titles when catalogue grows |

**Duplication scan:** no duplicate resource entries *within* a course/category; duplicates found are only cross-course generic titles (L5). **Broken-resource scan:** zero confirmed broken links (101/101 healthy; failures would require retry before labeling — none occurred). **Category assignment:** `automata/related` mixes slides-type PDF uploads into "Related Materials" (e.g. "Pumping Lemma Slides" is type PDF in related) — minor, covered by L6; no misleading assignments otherwise.

## 12. Responsive Usability Matrix (measured)

| Width | Home | Courses | Labs | Calendar | Notes |
|---|---|---|---|---|---|
| 320 | no overflow | no overflow | no overflow | no overflow | hero copy wraps cleanly |
| 390 | no overflow | no overflow | no overflow | no overflow | calendar title scales (CP-10 verified) |
| 768 | no overflow | no overflow | no overflow | no overflow | three-column stats collapse properly |
| 1440 | no overflow | no overflow | no overflow | no overflow | — |

- Touch targets: filter pills, tabs, nav, prev/next/today all ≥ 42 px; exception L3 (agenda chip 78×22).
- Information density at 320 is acceptable; actions (OPEN/DOWNLOAD) remain discoverable.
- Beyond overflow: no cramped previews observed; resource cards retain full titles.

## 13. Screenshots & Evidence

- `…\opencode\cp8\evidence\cp13\jA-home.png`, `jA-courses.png`, `jB-labs.png`, `jB-lab-*.png`, `jC-*.png`, `jD-reading-room.png`, `jE-calendar*.png`, `jF-theme.png`
- `…\opencode\cp8\evidence\cp13\cp13e-benches.png`, `cp13f/cp13g-lab-*.png`
- `…\opencode\cp8\evidence\cp13-2\cp13h-music.png`, `cp13h-web-lab.png`, `cp13h-os-tabs.png`, `cp13i-music-widget.png`
- Machine-readable: `cp13.json`, `cp13b.json`, `cp13e.json`, `cp13g.json`, `cp13h.json`, `cp13-firestore.json` (54 docs), `cp13-events.json` (6 docs), `cp13-links.json` (101 probes)
- Performance baseline reused from CP-12 (Lighthouse Perf 88 desktop / 92 mobile, LCP < 2 s, CLS ≈ 0.003) — no regression observed during crawls (zero console/network errors, no layout shifts in captures).

## 14. Severity-Ranked Issue Register

**Medium (3):** M1 missing descriptions · M2 event typos + wrong-course event · M3 empty Past Papers everywhere
**Low (7):** L1 mascot overlap · L2 music-widget fade · L3 small agenda chip · L4 duplicate course cards · L5 generic duplicate titles · L6 naming inconsistency (+ automata slides-in-related) · L7 nav faintness (unconfirmed)
**Suggestion (3):** S1 hero copy · S2 lab manual titles · S3 resource-title search

## 15. Recommended Future Improvements

1. Owner content pass on event titles and the mis-assigned Web Engineering event (via authenticated UI only).
2. Add resource descriptions where a sentence will help students; reader/category UI already supports them.
3. Populate or reposition the Past Papers category.
4. Visual mascot placement review; naming normalization pass; agenda touch-target bump.
5. (Future checkpoint) genuine screen-reader and Firefox verification once available.

## 16. Limitations & Untested Areas

- **Content data was audited via a read-only Firestore REST catalogue read** (public-read rules, no auth) plus production UI sampling; per-doc *rendered* rendering was sampled, not exhaustive.
- **No authenticated owner session** — owner-edit workflows were not exercised (unchanged from CP-11/CP-12).
- **No real screen reader; Chrome-only automation** (Edge for earlier CP-12) — Firefox unavailable.
- Automation waits occasionally raced Firestore's first paint in headless runs; all Labs checks were re-run with polling and passed — the in-app loading skeletons behave correctly; no defect.
- Music-widget close behavior (L2) needs visual confirmation; automation saw delayed visibility only.
- L7 (nav faintness) is from two screenshots only; previously verified contrast did not fail — treat as *requires human eyeball*.

## 17. Modification Confirmation

**No application file, resource metadata, Firestore/Realtime Database record, Firebase rule, authentication setting, or production data was created, modified, or deleted.** No commits, pushes, merges, or deploys were made. `.firebase/hosting..cache` was not touched. All catalogue reads were read-only; no large files were downloaded; 101 HTTP HEAD/1-byte probes were polite and completed with zero failures.

---

## 18. Additional User-Reported Findings (CP-13 Extension)

Five issues reported from real-world use were reproduced and diagnosed. **CP-13 remains read-only — no code, asset, or data changes were made.** All five are carried forward to **CP-14** (implementation) unless an existing CP-14 change resolves them first.

### U1 — Character pop-up shows rectangular blocks instead of transparent backgrounds

- **Severity:** Medium (visual quality; affects every character pop-up)
- **Affected:** All character pop-ups (`#bee-container`, `bleach-easter-egg.js`), i.e. Orihime (WebP w/ GIF fallback), Ichigo (GIF), Miku (GIF)
- **Reproduction:** Open `https://sledge-classroom.web.app/#home`, wait for a character pop-up (or run `window.__bleachCharacters.showNow()`), observe a grey rounded-rectangle halo behind the sprite — most visible over the dark hero. Evidence: `evidence/cp13-3/bee-1794274163320.png` (Orihime: dark block behind sprite), `bee-1794274169236.png` (Ichigo: 92×92 block around character), plus CP-13 pop-up screenshots over the Labs stats panel.
- **Asset audit (alpha is actually OK):** measured with PIL — `ichigo.gif` 500×500, 8 frames, 47% transparent; `miku.gif` 160×120, 20 frames, 76% transparent; `orihime.gif` 360×360, 136 frames, 83% transparent; `orihime.webp` 184×184 RGBA, 82% transparent. **The blocks are not missing alpha in the animation files.**
- **Responsible code:** inline styles injected by `bleach-easter-egg.js` lines 132–141:
  - `.bee-wrap { box-shadow: 0 8px 24px rgba(0,0,0,.22); border-radius:14px; }` → a **square drop shadow around a transparent image** renders as the visible "rectangular block".
  - `.bee-img { object-fit: cover; border-radius:14px; }` → `cover` crops non-square GIF canvases (Ichigo 1:1 with character at bottom; Miku 4:3) inside the 92×92 box and enforces a rectangular image box.
  - Secondary asset risk: the GIFs declare transparency in the global GCE (frame 0) but **no per-frame `disposal`** (PIL reports `disposal=None`), so browsers that do not clear between frames can leave stale rectangular patches during playback. `process_gif.py` writes `disposal=2`, but the deployed GIFs do not carry it.
- **Recommended correction (CP-14):** remove `box-shadow`/`border-radius` from `.bee-wrap`; move a silhouette-aware shadow to the image (`filter: drop-shadow(...)`) or drop the shadow entirely; change `.bee-img` to `object-fit: contain` and drop the rectangular `border-radius`; optionally re-export the GIFs with `disposal=2` (or animate WebP only, already supported for Orihime).

### U2 — Header and footer look visually untouched vs the redesigned sections

- **Severity:** Low (design consistency), with one Medium layout defect cross-referenced (U4/U3a)
- **Affected:** Global navbar (`#navbar`) and site footer (`#footer`)
- **Evidence / investigation:**
  - **Footer was redesigned:** it carries the current editorial design language — `footer-masthead` with 第漆章 + "COLOPHON" eyebrow, rules, Japanese label, seal, brand block, Quick Links / Courses columns. Introduced in commit `1771981` ("phase 2 perf pass + phase 3 homepage redesign"). Production screenshot `evidence/cp13-3/labs-full.png` shows it matching the Courses/Labs masthead system.
  - **Navbar was NOT redesigned:** `.nav-link` / `.nav-link.active` styling still traces to the original `ada2d35` ("firebase based classroom") — blue pill active states (`var(--blue-50)`), generic radii, icon+label buttons. It does not use the mono eyebrow / rule / gold-accent / chapter-language identity that CP-8/9/10 mastheads and the footer use. It also renders misaligned on mobile (U4).
- **Recommended correction (CP-14):** scoped navbar refresh to the same design tokens (mono meta labels, hairline rules, type scale, active indicator consistent with the archive/pill system used on Courses) — no structural change; keep 44px hit targets and current routing. Footer needs no rework (already consistent).
- **Note:** This is a consistency finding, not a functional defect.

### U3 — Labs section appears to have missed the UI improvements

- **Severity:** Medium (perception driven by a real rendering defect + a card-language gap)
- **Affected:** `#page-labs` on load / deep-link
- **Investigation result — the redesign IS deployed:** `labs-masthead`, engineering-paper grid, bench directory and `.lab-entry` cards were added in the release commit `1d75925`. The bench directory, stat aggregation and card accents all render.
- **What makes it look unfinished:**
  1. **Masthead clipped under the fixed navbar on deep-link (measured defect):** loading `/#labs` produces `scrollY=84` while `#navbar` height is 72 → the `<h1>` lands at `top=65`, i.e. **behind the navbar**, and the kicker is ghosted under the translucent nav. `#labs.anchor-target` has `scroll-margin-top: 0px`, whereas the Calendar anchor was explicitly given `scroll-margin-top: calc(var(--nav-height) + 16px)` in CP-10. Evidence: `evidence/cp13-3/labs-1440-clean.png` (clipped title), `labs-full.png`, vs `courses-1440-clean.png` (clean).
  2. **Bench card visual language diverges:** `lab-entry` cards (white, shadowed, accent rail) don't match the paper/archive cards used on the Courses page (`course-card--archive` with grid metrics and TH/LB indices) — a consistency gap, not a broken layout.
- **Recommended correction (CP-14):** add `scroll-margin-top: calc(var(--nav-height,72px) + 16px)` to `.page-labs #labs.anchor-target` (same fix pattern as Calendar); optionally restyle `.lab-entry` to the archive card tokens. No structural rework needed.

### U4 — Mobile top bar: the action buttons sit at the left instead of distributed

- **Severity:** Medium (navigation discoverability/visual polish on phones)
- **Affected:** `.navbar` at ≤768 px — verified at 320 and 390 px
- **Reproduction:** open production at 390×844 or 320×700 → logo, then theme toggle, admin button and hamburger cluster immediately after the logo, leaving the entire right side of the bar empty. Evidence: `evidence/cp13-3/labs-320-clean.png`, `home-320.png`, `home-390.png` (logo text also appears truncated at 390).
- **Responsible code:** `.nav-links { margin-left: auto; }` (styles.css:260–265) is the only element pushing the bar apart. At ≤768 px `.nav-links { display: none; }` (styles.css:2043–2045), so `.nav-actions` (margin-left: 8px) has nothing pushing it right and collapses next to the logo. The PKT clock is hidden ≤1100 px (`styles.css:5679–5683`).
- **Recommended correction (CP-14):** in the ≤768 px block add `.nav-actions { margin-left: auto; }` (and verify logo text can shrink with `min-width:0`/`overflow:hidden`); touch targets remain ≥40 px.

### U5 — Desktop hover menu closes too fast when moving toward it

- **Severity:** Medium (owner workflow friction; admin-only surface)
- **Affected:** Admin dropdown (`#admin-dropdown`) hover behaviour on desktop (`(hover:hover) and (pointer:fine)`)
- **Reproduction:** requires an authenticated owner session (not available to the audit — consistent with CP-11/12/13 limitations). Behaviour analysed and confirmed in code:
  - Menu is `position: fixed; top: calc(var(--nav-height) + 8px)` → an **8 px dead gap** below the navbar between the trigger and the panel (styles.css:2223–2235).
  - **Two independent visibility systems conflict:** (a) CSS `@media (hover:hover)` rules show it only while `.admin-btn` or `.admin-dropdown` is hovered via `:has()`/siblings (styles.css:2246–2256); (b) JS adds/removes `.hidden` with a 400 ms grace timer (app.js:239–250), while `.hidden` itself fades with `transition-delay: 0.15s` (styles.css:2237–2242).
  - While the pointer crosses the 8 px gap, **neither** element is hovered, so the CSS rule drops instantly and the 0.15 s fade-out starts — the JS 400 ms timer cannot keep it visible because the CSS `:has()` state is the controlling rule. Result: the user must cross the gap in ~150 ms, exactly as reported.
- **Recommended correction (CP-14):** make one mechanism authoritative. Either (1) extend the trigger's hover boundary over the gap with an invisible bridge (`.admin-dropdown::before` absolute strip of ~12 px, `pointer-events:auto`), or (2) attach open/close solely to mouseenter/mouseleave on a shared wrapper with a 300–400 ms close delay and no `:has()` visibility overrides, keeping `focus-within` for keyboard. Keep touch tap-toggle unchanged.

### Extension register update

| ID | Sev | Issue | Carry-forward |
|---|---|---|---|
| U1 | Medium | Pop-up rectangular shadow block (CSS shadow + `object-fit:cover`; GIF disposal secondary) | CP-14 |
| U2 | Low | Navbar never received design-system pass (footer did) | CP-14 |
| U3 | Medium | Labs masthead clipped on deep-link (`#labs` missing `scroll-margin-top`); bench cards diverge from archive cards | CP-14 |
| U4 | Medium | Mobile navbar actions collapse left when `.nav-links` is hidden ≤768 px | CP-14 |
| U5 | Medium | Admin hover menu: 8 px gap + conflicting CSS `:has()` vs JS 400 ms timer → closes in ~150 ms | CP-14 |

**Verdict impact:** unchanged — **READY WITH DOCUMENTED LIMITATIONS**. U1/U3/U4/U5 are visual/UX defects on top of a functioning product; none blocks a student journey, and all have specific, low-risk corrections queued for CP-14.

**Read-only confirmation for this extension:** no application files, assets, metadata, Firestore/RTDB records, rules, or auth configuration were modified; no commit/push/deploy was made; `.firebase/hosting..cache` untouched.

---

*Report produced by CP-13 audit only. Any release of future changes requires separate explicit approval.*
