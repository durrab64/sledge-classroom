# Content Moderation & Upload Guidelines

**Project:** Sledge Classroom (`sledge-classroom`)
**Applies to:** Course-resource uploads, review, correction, and removal
**Status:** Draft for owner review
**Intended audience:** Site owner / administrator

---

## Purpose

This document is a practical, maintainable checklist for uploading, reviewing, correcting, and maintaining learning resources on Sledge Classroom. It reflects how the application and Firebase backend actually work — not how we wish they worked. It is intended to be usable by someone who did not participate in building the site.

It does **not** automate anything. Every step is manual. Nothing here describes an enforcement mechanism that does not exist in code.

---

## A. Upload preflight checklist

Complete every item before submitting the Add Resource form.

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Correct course | The resource belongs to the course you are viewing (e.g. CS 331 Computer Architecture, not CS501 unless the owner confirms cross-course sharing). |
| 2 | Correct category | Choose `lectures`, `papers`, `related`, `lab`, `lab_papers`, or `lab_tasks` based on what the file actually is, not what you wish it were. |
| 3 | Accurate title | Use the real file title, spelled correctly (e.g. "Lecture 02 Regular Expressions", not "Lecutre 02..."). Include edition or year only if it is on the file. |
| 4 | Correct file type | Match the `Resource Format` dropdown to the actual file: PDF, Slides, Document, Spreadsheet, Code, ZIP, or Link. Do not label a slideshow as a PDF. |
| 5 | Resource is relevant | The content is on-topic for the selected course and category. |
| 6 | Intended version | Open the link and confirm this is the version you want to publish, not an older draft. |
| 7 | No duplicates | Check the target course/category first. The app performs duplicate detection by normalized link, but visually scan the list too. |
| 8 | No private information | No student names, IDs, grades, contact details, or confidential material in the title, description, link, or file. |
| 9 | No unsafe content | No malware, deceptive downloads, suspicious executables, or material that harms viewers. |
| 10 | Appropriate for public viewing | The resource will be visible to anyone who can reach the site. Publish only what is suitable for a public classroom audience. |
| 11 | Right to share | You own the resource or have the right to distribute it. Do not upload material you do not have rights to. |
| 12 | Access and sharing | For Google Drive, confirm "Anyone with the link can view" and test the link in a private/incognito window before submitting. |

---

## B. Metadata standards

The Firestore resource document has exactly these eight fields. Do not invent additional fields.

```
name, url, previewURL, downloadURL, type, description, date, createdAt
```

### Name (title)

- Use the real title as it appears on the file.
- Capitalize correctly: "Lecture", "Lemma", "Calculus", "Elementary" (not "Lecutre", "Lema", "Calculas", "Elementry").
- Include edition/year only when printed on the file.
- Examples:
  - Good: `Lecture 02 Regular Expressions`, `Bluman A.G. Elementary Statistics - A Step by Step Approach`
  - Bad: `Lecutre 02 Regular Expressions`, `statistics pdf 1` (mislabels a slideshow as a PDF)

### Category

Choose from: `lectures`, `papers`, `related`, `lab`, `lab_papers`, `lab_tasks`. Match what the file is, not the course you wish it belonged to.

### Resource type

Dropdown options: `pdf`, `ppt`, `doc`, `sheet`, `code`, `zip`, `link`. The app may auto-detect the type from a clear URL, but always verify the saved value. A Google Slides presentation is `ppt`, not `pdf`.

### Description

Optional. Add only when it genuinely helps students (e.g. "Includes solved numericals", "Midterm prep"). Leave blank otherwise — do not generate filler. Leading/trailing spaces are trimmed for display.

### Date and creation metadata

- `date` is generated automatically from the local browser date (`Oct 28, 2026` format). Do not edit it manually unless correcting a mistake.
- `createdAt` is a Firestore server timestamp set at creation. It cannot be edited through the form and must not be changed manually.

### URLs

- `url`, `previewURL`, and `downloadURL` are derived from the pasted link. For Google Drive, the app normalizes them to `/file/d/<id>/view?usp=sharing` and `/uc?export=download&id=<id>`.
- Never paste a folder link or an expired link. Test in incognito before submitting.

---

## C. File and sharing verification

### Google Drive links

1. Paste the share link into the form.
2. Open the link in a private/incognito window (not signed into your account).
3. Confirm the file opens and displays "Anyone with the link can view".
4. Confirm the Download link starts a download, not an error.
5. Confirm the Preview link opens the viewer.

### Google Slides / presentations

1. Open in incognito.
2. Confirm the deck loads and the title matches what you intend to publish.
3. Confirm viewers can see the deck without signing in.

### PDFs and other files

1. Open in incognito.
2. Confirm the file renders or downloads.
3. Confirm the file is not a shortcut, an empty doc, or a "request access" page.

### Broken or inaccessible URLs

- If a link requires sign-in, returns 404, or shows "Request access", do not publish it.
- Never make private information public merely to fix a link. If a resource contains personal or confidential data, remove that data first, or do not publish it.

---

## D. Content safety and moderation

Review each resource against these categories before publishing.

### Acceptable educational resources

Lecture slides, past papers, lab manuals, study notes, and openly shared educational material that the owner has the right to publish.

### Owner-created software and tools

Software, code, or utilities created by the owner may be published if the owner holds the rights. Example: the existing "Cracked multisim" resource is the owner's own software and must **not** be treated as an automatic violation merely because of its title.

### Third-party software and utilities

Only publish if you have the rights to distribute it. Do not upload commercial software, cracked software, keygens, or pirated distributions.

### Copyright or licensing concerns

If you are unsure whether a resource can be shared publicly, do not publish it. Hold it for owner review.

### Suspicious executables and archives

Treat `.exe`, `.zip`, `.rar`, `.7z`, and code files with caution. Verify provenance before publishing.

### Malware or deceptive downloads

Reject anything that appears to be malware, a scam, or material that misleads viewers.

### Confidential or personal data

Reject anything containing student names, IDs, grades, contact details, or other private information.

### Irrelevant or misleading material

Reject material that does not belong to the course, or whose title does not match the file.

### Decision outcomes

| Outcome | When to use |
|---|---|
| Accept | All preflight items pass; rights confirmed; public viewing appropriate. |
| Hold for review | Copyright, provenance, or category is unclear. Ask the owner before publishing. |
| Reject | Malware, pirated software, confidential data, broken links, or no right to share. |

**Important:** Do not automatically classify software as malicious, illegal, or prohibited merely because its title contains words such as "cracked". Review the actual content, provenance, licensing, and distribution rights.

---

## E. Post-upload verification

After every upload:

1. Confirm the Firestore document was created (the row appears in the course/category).
2. Verify title, type, and category are correct.
3. Open the preview link in incognito.
4. Test the download link in incognito.
5. Confirm the resource appears in the correct course and tab.
6. Open the Reader view and confirm metadata (title, format, date) displays correctly.
7. Check presentation on desktop and mobile when practical.
8. Confirm administrative write controls are not visible to unauthenticated visitors.

---

## F. Corrections and removal procedures

### Before any batch change

1. Back up the full catalogue (export all Firestore documents) and store it outside the repository.
2. Record before/after values for every change.

### Making a correction

1. Verify the exact Firestore document path and current values.
2. Correct only the approved field (e.g. title spelling). Do not touch `url`, `downloadURL`, `type`, `description`, `date`, or `createdAt`.
3. Do not delete and recreate a document for a simple correction — this changes `createdAt` and loses the original timestamp.
4. Verify through a fresh read that the change is correct and no unrelated document was modified.

### Removing a resource

1. Export/back up the document first (title, all fields, `createdAt` seconds/nanoseconds, linked Drive file identity).
2. Delete the Firestore document (hard delete — there is no undo, no soft delete, no quarantine).
3. Separately review the linked Google Drive file's sharing. Deleting the Firestore record removes the listing but does **not** revoke access to a known direct Drive URL. Restrict or remove Drive sharing separately if needed.
4. Verify the listing is gone (row count decreased, deep link shows "Resource not found").
5. To restore, recreate the document at the same path/ID with the exact 8 fields and original `createdAt` Timestamp.

**Owner approval is required** for ambiguous classification or removal decisions. Do not delete or move the two CS501 Architecture lectures or the "Cracked multisim" record without explicit confirmation.

Do not describe quarantine, hidden status, or undo features as implemented — they are not.

---

## G. Periodic catalogue review

Run this lightweight review monthly:

- [ ] Broken links — open each resource in incognito; fix or remove dead links.
- [ ] Duplicate resources — compare normalized links within each course/category.
- [ ] Incorrect titles — check spelling and file-type labels (PDF vs slides).
- [ ] Missing descriptions — add only where genuinely useful; leave blanks otherwise.
- [ ] Incorrect categories — confirm each resource is in the right course and category.
- [ ] Outdated material — superseded drafts, old editions.
- [ ] Suspicious or inaccessible files — executables, archives, sign-in-required links.
- [ ] Public sharing permissions — re-check Drive "Anyone with the link can view".
- [ ] Resource consistency — confirm titles match the actual files.

Keep it manageable: one monthly pass is better than an elaborate process that never runs.

---

## H. Roles and authorization

### Public visitors

Anyone can read published course resources and events. Reads are public.

### Authorized writer

Only the confirmed owner account (UID `dRHxakX2iAWM4w1IqtYPLpCZrwr2`, email `mhdurrabrehan@gmail.com`) may create, update, or delete resources and events, as enforced by Firestore security rules.

### Frontend admin UI is not the security boundary

The website shows/hides upload and delete buttons based on whether a user is signed in. This is a convenience layer only — it can be bypassed by calling Firestore directly. The **actual** authorization is enforced by Firestore rules, which require the owner's UID for every write. Treat the UI as cosmetic; never rely on it for access control.

### Credentials and tokens

Never share owner credentials, expose private tokens, or commit secrets to the repository.

### Public signup

If Email/Password signup is enabled, anyone can create an account. A created account is **not** an admin and cannot write through Firestore rules. Do not share owner credentials under any circumstances.

---

## Source basis

These guidelines were verified against:

- `app.js` — upload (`confirmUpload`), duplicate detection, delete (`deleteFileFromDB`, `deleteEvent`), Reader rendering.
- `index.html` — upload form fields (title required, URL required, format dropdown, description optional).
- `FIREBASE_SETUP_GUIDE.md` — intended setup and owner-only write assumptions.
- Deployed Firestore rules — `allow read: if true; allow create, update, delete: if request.auth.uid == <owner UID>`.
- CP-1 catalogue backup — 54 documents across 13 collections with the 8-field schema.
- CP-2 title corrections and CP-3 metadata investigation findings.

---

## Do not

- Do not describe quarantine, hidden status, or undo features as implemented.
- Do not propose new Firestore fields as if they exist.
- Do not automate moderation — none exists.
- Do not treat "cracked" in a title as an automatic violation without reviewing the actual resource.
- Do not make private information public to fix a link.
