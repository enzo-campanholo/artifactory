# 04: A matching item's ID failure points at its key

Status: ready-for-agent
Blocked by: 03 (Matching)

Spec: [Content types](../spec.md) › Writing one: "Each key follows the rules of a question's `id`: readable kebab-case, unique within the artifact, never reused."

**What to build:** `pnpm check` places a `question-id` failure where the source writes the ID. A matching's item IDs are keys of its `answers` prop, not `id="…"` props, so after 03 a bad or reused item ID fails at the entry's first line. Make the check find an item's ID where its `answers` key is written, so the failure line points at that key, and a reuse names the line of the first use, whether that first use is another item's key or another question's `id`.

The check finds a component's props by reading its tag; `answers` is a nested object (`{{ … }}`), which that reading doesn't take today, so the locator learns to read it, by the name the entry imports `Matching` as, as it does for `Statement`.

- [ ] An item ID that isn't kebab-case fails as `question-id` at its key in `answers`, tested at the `pnpm check` seam.
- [ ] An item ID reused by another item, in the same or another matching, or by a `SingleChoice`, `NumericQuestion` or `OpenQuestion`, fails at the second use and names the first use's line, in each direction, tested at the `pnpm check` seam.
- [ ] Existing question-ID and statement-ID failures keep their positions (their tests pass unchanged).
- [ ] The `artifact` skill, in the same commit: its Question IDs rule, which says to write `id` as a plain string so failures point at the right line, says the same of a matching item's key in `answers`.

## Comments

### 2026-11-09: from 03

Implementer of [03](03-matching.md#comments). What you start from:

- **Where item IDs come from:** each item's row carries the question markers (`questionMarkers` in `design-system/src/Matching.astro`), so `readQuestions` lists the items in page order and `checkedIds` (`src/id-failures.ts`) checks them with every other question. `locate`'s `question-id` target (`src/source-locator.ts`) only finds `id="…"` props, so an item's failure lands at `1:1`.
- **The test to move:** `tests/check/artifact-failures.test.ts` › "fails a matching item's ID by the rules of a question ID, at the entry's start" uses the `regras-de-derivacao` fixture's `<Matching answers={{ "Regra_do_produto": 1, "regra-da-potencia": 2 }}>`, asserting both failures at `1:1` (the reuse names line 13, the `SingleChoice`'s `id`). Change it to the keys' positions; the same fixture covers "reused by a `SingleChoice`" in one direction.
- **The skill line to change:** `rules.md` › Question IDs now ends "a failure in one points at the entry's `1:1`, so search the entry for the ID."; replace it with the plain-string rule for keys.
- `Matching`'s module is `@artifactory/design-system/matching`, so find it by its import name as `componentPropOffsets` does for `statement`.
