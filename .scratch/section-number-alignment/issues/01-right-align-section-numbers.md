# 01: Right-align section numbers

Status: resolved
Blocked by: None (can start immediately)

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**Problem:** section numbers are left-aligned in their column, so once an artifact has ten or more sections, "9" and "10" end in different places.

**What to build:** set section numbers flush right in their column, so they line up on their last digit.

- [ ] In the contents (`.artifact-section-number`), the numbers line up on the right, from 1 to two digits.
- [ ] Section numbers in the margin beside each section heading line up the same way.
- [x] Checked in light, dark, print and at phone width.

## Comments

### 2026-11-23: owner narrows and widens the scope

- **Approved:** the owner, in this session's thread (2026-11-23, after seeing three rendered options), set the scope: "On the phone it looks fine, don't change anything. My only issue is on the computer. Because the section and the subsection number are left aligned, there is an uneven amount of space between them and their 'child'. If both of them were right-aligned, the space between both of them and the text on the right would be equal." So, on the desktop (`width >= 64rem`) only, every hanging number (section, h3, clause and statement label) is set flush right on one edge, the same distance from its text. This supersedes the checklist's first two items: the contents (`.artifact-section-number`) and the phone's inline numbers stay as they are.

### 2026-11-23: resolved

- **Result:** on the desktop (`width >= 64rem`), section, h3, clause and statement-label numbers end on one edge, `--hang` (now 1.5rem, was 3.25rem) left of the text edge, so "1" and "1.1", or "10" and "10.1", stand the same distance from their text. Each number is a box of no width, justified to its end, positioned `--hang` out, so it overflows toward the start. DESIGN.md (the `hang` token and Layout › Desktop) and the artifact layout's surface brief describe the new edge.
- **Not done, by the owner's decision above:** the first two checklist items. The contents and the phone's inline numbers are unchanged.
- **Shared parts:** `--hang` is a `tokens.css` token, but only `ArtifactFrame.astro` uses it, so the fix stays inside the frame. Every catalog page renders inside the frame, and the catalog's `many-questions` page was checked with the same evidence as the sample.
- **Validation:** `pnpm check` passed with 0 failures. The impeccable detector found nothing. Built pages captured with puppeteer and judged by eye: the sample (11 sections) at 1440px in light and dark (sections 1, 9 and 10, their first clauses, and a statement label "2.2") and at 1100px, the catalog's `many-questions` at 1440px, the phone at 393px (unchanged), and print at 794px, where the phone's inline layout applies and so is unchanged too. The owner saw the earlier three-option renders, not this final capture.
- **Review:** `/code-review`, on both axes. Standards asked for this shared-parts note and two wording fixes, all now made. Spec found no defects. It noted that a printed page 64rem or wider, such as A4 landscape, takes the desktop rule, so its numbers hang into the page margin. This predates the change (the old rule hung 52px out; a five-character clause like "10.12" now reaches about 68px) and is left as it is.
