# 01: One source for a Library row's status

Status: ready-for-agent
Blocked by: None (can start immediately)

Spec: [Library row statuses](../spec.md). No behaviour changes: every row reads and paints as it does today.

**What to build:** move the row status out of `LibraryLayout.astro` into a module that paints from the store and a paint script that paints from the statuses this device last loaded, as `library-revisit.ts` and `library-revisit-paint.js` do for "To revisit". The layout inlines the script where its inline script stands today, right after the list, and imports the module. Then test both at seam 3 against one literal.

The paint script is inlined, so it stays a plain script, as `library-revisit-paint.js` is. Give the pair its entries in `design-system/package.json`'s `exports`, as the revisit pair has, so the test can load the script with `?raw`.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`). It reaches no shared part `CODING_STANDARDS.md` lists.

- [ ] `LibraryLayout.astro` holds no status text and no status markup of its own.
- [ ] The paint script writes the rows' statuses from the statuses this device last loaded, and the module writes them from the store, with the same markup.
- [ ] A load that agrees with the paint script's rows leaves their nodes as they are.
- [ ] `tests/store/library-statuses.test.ts` asserts a finished row, a row in progress and a row with no answers by their text, a status that goes when a load reports no answers, and the script and the module agreeing on the markup.
- [ ] The existing `tests/store` and `tests/check` cases pass unchanged, the Library's first-paint case included.
- [ ] `docs/agents/test-seams.md` › `tests/store` names the row statuses' text.
- [ ] On the built Library, with the HTTP transport (`pnpm dev:worker`), a row's status shows with the rows on a reload and the load leaves it in place.

## Comments
