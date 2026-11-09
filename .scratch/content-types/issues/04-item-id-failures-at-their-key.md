# 04: A matching item's ID failure points at its key

Status: resolved
Blocked by: 03 (Matching)

Spec: [Content types](../spec.md) › Writing one: "Each key follows the rules of a question's `id`: readable kebab-case, unique within the artifact, never reused."

**What to build:** `pnpm check` places a `question-id` failure where the source writes the ID. A matching's item IDs are keys of its `answers` prop, not `id="…"` props, so after 03 a bad or reused item ID fails at the entry's first line. Make the check find an item's ID where its `answers` key is written, so the failure line points at that key, and a reuse names the line of the first use, whether that first use is another item's key or another question's `id`.

The check finds a component's props by reading its tag; `answers` is a nested object (`{{ … }}`), which that reading doesn't take today, so the locator learns to read it, by the name the entry imports `Matching` as, as it does for `Statement`.

- [x] An item ID that isn't kebab-case fails as `question-id` at its key in `answers`, tested at the `pnpm check` seam.
- [x] An item ID reused by another item, in the same or another matching, or by a `SingleChoice`, `NumericQuestion` or `OpenQuestion`, fails at the second use and names the first use's line, in each direction, tested at the `pnpm check` seam.
- [x] Existing question-ID and statement-ID failures keep their positions (their tests pass unchanged).
- [x] The `artifact` skill, in the same commit: its Question IDs rule, which says to write `id` as a plain string so failures point at the right line, says the same of a matching item's key in `answers`.

## Comments

### 2026-11-09: from 03

Implementer of [03](03-matching.md#comments). What you start from:

- **Where item IDs come from:** each item's row carries the question markers (`questionMarkers` in `design-system/src/Matching.astro`), so `readQuestions` lists the items in page order and `checkedIds` (`src/id-failures.ts`) checks them with every other question. `locate`'s `question-id` target (`src/source-locator.ts`) only finds `id="…"` props, so an item's failure lands at `1:1`.
- **The test to move:** `tests/check/artifact-failures.test.ts` › "fails a matching item's ID by the rules of a question ID, at the entry's start" uses the `regras-de-derivacao` fixture's `<Matching answers={{ "Regra_do_produto": 1, "regra-da-potencia": 2 }}>`, asserting both failures at `1:1` (the reuse names line 13, the `SingleChoice`'s `id`). Change it to the keys' positions; the same fixture covers "reused by a `SingleChoice`" in one direction.
- **The skill line to change:** `rules.md` › Question IDs now ends "a failure in one points at the entry's `1:1`, so search the entry for the ID."; replace it with the plain-string rule for keys.
- `Matching`'s module is `@artifactory/design-system/matching`, so find it by its import name as `componentPropOffsets` does for `statement`.

### 2026-11-09: resolved

**Result.** `locate`'s `question-id` target (`src/source-locator.ts`) now finds a question ID both as an `id="…"` prop and as a key of a matching's `answers`, merged in source order, so occurrence N is the Nth writing of the ID whichever form it takes. The matching is found by the name the entry imports `@artifactory/design-system/matching` as. The prop reading `componentPropOffsets` used is now `componentProps`, which `Statement`, `Ref`, `Proof` and the matching share, and a prop's value may now hold one nested object in braces (`answers={{ … }}`). The `artifact` skill's Question IDs rule (`rules.md`) now says to write each key as a plain string so failures point at the key, in the same commit.

**Commits.** 835b741 (claim), 07a2d9f (locator, tests, skill rule), then this closing commit.

**Validation.** At the `pnpm check` seam (`tests/check/artifact-failures.test.ts`): the `regras-de-derivacao` test now expects its two item failures at the keys (`42:22`, `42:45`, the reuse naming the `SingleChoice` at line 13). A new `associacoes` fixture imports `Matching` as `Associacao` (with a decoy `<Matching answers={{ "pilha": 1 }}>` in prose) and asserts every question-ID line exactly: an item reusing an `OpenQuestion`'s and a `NumericQuestion`'s ID; an item in one matching reusing an item of another, through a multi-line `answers`; and a `SingleChoice`, a `NumericQuestion` and an `OpenQuestion` each reusing an earlier item's ID. Each second use fails at its own position and names the first use's line. The question-ID, statement-ID, citation and proof position tests pass unchanged. The run's count went from 60 to 66, exactly the six new lines. Red was seen first: every item failure landed at `1:1`, and reuses named the wrong line. The full `pnpm check` gate runs on the merged head.

**Decisions.**

- A bare identifier key (`heap: 3`) is located as well as a quoted one, since Prettier may drop quotes a key doesn't need, and the fixture writes one. A computed or template-literal key still falls back to `1:1`. The skill says to write a plain string.
- Reuse by another item in the *same* matching isn't a `question-id` case. A JavaScript object literal keeps only one of two equal keys, so `answers` gives fewer answers than there are items, and the build fails with the `Matching:` component error first. That case isn't tested here: it follows from the language, and 03 already owns the component error.
- Sorting the merged offsets by source position matches the page's order, because a matching renders its items in the order of `answers`' keys (spec › Writing one).

**Shared parts.** None of the design-system shared parts in `CODING_STANDARDS.md` changed. The change stays inside the check's source locator, and the statement, citation and proof positions it shares with matchings are covered by their unchanged tests.

**Left undone.** Nothing.
