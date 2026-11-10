# Library row statuses

Source: the architecture review of 2026-11-10, candidate 3. The decisions below were made with the owner that day, and [Comments](#comments) records them.

## Problem

A Library row shows the status of its artifact's latest attempt: "Finished", or "In progress · N of M answered", and nothing before the first answer. `design-system/src/LibraryLayout.astro` writes that rule twice:

- an inline script right after the list paints the rows from the statuses this device last loaded, so they appear with the rows;
- the layout's module script paints them again from the store once the load answers (`statusText` and `showStatuses`).

The inline script's comment says "It writes the markup the module writes", and nothing holds the two to that. No test asserts a row's text or its markup: `tests/store/library-statuses.test.ts` covers the store and the notices only, although `docs/agents/test-seams.md` gives seam 3 "the Library's statuses".

"To revisit", in the same folder, already has the shape that fixes this. `library-revisit.ts` paints from the store, `library-revisit-paint.js` paints from the statuses this device last loaded, the layout inlines one and imports the other, and `tests/store/library-revisit.test.ts` loads both and holds them to one literal.

## Behaviour

Nothing the owner sees changes.

- The row status is painted by one module from the store and by one paint script from the statuses this device last loaded. Both write the same markup.
- `LibraryLayout.astro` inlines the paint script right after the list, where the inline script is today, and imports the module. It holds no status logic of its own.
- A load that agrees with what the paint script wrote leaves the rows' nodes as they are.

## Tests

Seam 3, in `tests/store/library-statuses.test.ts`, with the pattern `library-revisit.test.ts` uses.

- A finished artifact's row, one in progress and one with no answers, each by its text.
- A status that goes when a load reports no answers.
- The paint script and the module writing the same markup for the same statuses.

Seam 1 keeps what it owns: the Library's first paint held only until its list is parsed.

## Out of scope

- The subject filter's inline script. It is written once.
- Any change to the status's wording or look.

## Comments

### 2026-11-10: owner decisions at the architecture review

Owner, architecture review session, 2026-11-10 (thread 8d57bee0-37b7-4277-bf58-cace669ef571), every recommendation accepted.

- **Approved, round 1 Q5:** only the row statuses move, into a module and a paint script like the revisit pair, tested in `tests/store/library-statuses.test.ts`; the subject filter stays; one ticket.
- **Order of work, round 2 Q12:** second, after [Component rules](../component-rules/spec.md). It depends on no other feature.
