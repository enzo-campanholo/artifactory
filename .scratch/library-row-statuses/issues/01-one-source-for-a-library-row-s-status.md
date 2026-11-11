# 01: One source for a Library row's status

Status: claimed
Blocked by: None (can start immediately)

Spec: [Library row statuses](../spec.md). No behaviour changes: every row reads and paints as it does today.

**What to build:** move the row status out of `LibraryLayout.astro` into a module that paints from the store and a paint script that paints from the statuses this device last loaded, as `library-revisit.ts` and `library-revisit-paint.js` do for "To revisit". The layout inlines the script where its inline script stands today, right after the list, and imports the module. Then test both at seam 3 against one literal.

The paint script is inlined, so it stays a plain script, as `library-revisit-paint.js` is. Give the pair its entries in `design-system/package.json`'s `exports`, as the revisit pair has, so the test can load the script with `?raw`.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`). It reaches no shared part `CODING_STANDARDS.md` lists.

- [x] `LibraryLayout.astro` holds no status text and no status markup of its own.
- [x] The paint script writes the rows' statuses from the statuses this device last loaded, and the module writes them from the store, with the same markup.
- [x] A load that agrees with the paint script's rows leaves their nodes as they are.
- [x] `tests/store/library-statuses.test.ts` asserts a finished row, a row in progress and a row with no answers by their text, a status that goes when a load reports no answers, and the script and the module agreeing on the markup.
- [x] The existing `tests/store` and `tests/check` cases pass unchanged, the Library's first-paint case included.
- [x] `docs/agents/test-seams.md` › `tests/store` names the row statuses' text.
- [x] On the built Library, with the HTTP transport (`pnpm dev:worker`), a row's status shows with the rows on a reload and the load leaves it in place.

## Comments

### 2026-11-10: implementation

Implementer sub-agent, branch `impl/library-row-statuses-01`.

**Result:** the row status moved out of `LibraryLayout.astro` into `design-system/src/library-row-statuses.ts`, which exports `showRowStatuses(statuses)` and paints from the store, and `design-system/src/library-row-statuses-paint.js`, a plain script the layout inlines right after the list, where its inline script stood, with `data-kept-summaries-key` as the revisit paint script takes it. The layout's module script now only starts the statuses and calls `showRowStatuses`. Its frontmatter imports the two paint scripts as `paintRowStatusesFromKeptCopy` and `paintRevisitFromKeptCopy`. Both new files have `exports` entries in `design-system/package.json`. The `.library-status` rule stays in the layout's styles with the rest of the row's look: it's style, not status text or markup. The module takes the store's `LibraryStatuses` as an argument rather than reaching for it through `whenLibraryStatusesStart`: every test starts its own statuses, and a module-level subscription would follow only the first. The wording and the markup are unchanged.

**Commits:** the claim, then `Paint a Library row's status from one module and one paint script`.

**Validation:**

- Seam 3, `tests/store/library-statuses.test.ts`: a finished row, a row in progress and a row with no answers by their text; a status that goes when a reload reports no answers; the paint script's rows and the module's rows equal to one literal, `rowsFromKeptStatuses`; a load that agrees leaving every status `<p>` and its text node the same node; a load that differs correcting the painted rows; and no copy, an unreadable copy, a copy that isn't an object and progress that isn't numbers painting nothing, with the load filling the statuses in. Two mutations checked that the tests can fail: always rewriting the text (the identity test fails), and the script writing "Finished " (the literal tests fail). All 16 `tests/store` files pass (216 tests).
- Built Library with the HTTP transport: one `scripts/heavy` command ran `pnpm dev:worker` on ports 8797/8798, saved one answer to the sample artifact (`ep0zvgsx`, `what-eve-lacks`) through the API, and loaded the Library in Chrome (puppeteer-core, `CHROME_PATH`), with a MutationObserver recording every `.library-status` node added or removed. On the first visit, with no copy on the device, the module added "In progress · 1 of 13 answered" once the load answered. On the reload, the paint script added it at 14 ms, before `#library-end` was parsed and before the store started, and nothing removed or rewrote it after the load. A screenshot of the reloaded row matched the look before the change.

**Shared parts:** none of the ones `CODING_STANDARDS.md` lists.

**Left undone:** nothing.
