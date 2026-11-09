# 03: The check fails a text field's broken examples and props

Status: resolved
Blocked by: 02

Spec: [Stage text input](../spec.md), section "Failures". The decisions are in [Typed words in a Stage](../../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md) › Answer.

**What to build:** an agent whose Stage gets a text field wrong learns it from `pnpm check`, before the owner ever sees the page. The failures come as `build` failures at the entry, under the `artifact` skill's Build failures, shaped like today's example problems and reported together in one run with them. The text rule they check is the one field rule from 01. The same rule decides, after NFC and counting code points, whether an example's text is outside the alphabet, too long or too short. 04's page refusal then uses that rule, so an example that passes the check is never refused on the page.

- [x] **An example that breaks a text field's rule:**
  - "example 2 gives `w` "abc", whose c is outside the alphabet"
  - "example 3 gives `w` "…", longer than 12"
  - "… shorter than 1"
  - An example with several symbols outside the alphabet names the first.
  - Lengths count code points after NFC, so a decomposed `é` counts as one.
- [x] An example whose text isn't in NFC fails, naming the example and the field in the shape of the others. Record the wording in the closing comment.
- [x] An example that gives a text field a number, or a number field text, fails. A number field given text keeps today's "which isn't a whole number". A text field given a number reads "example 2 gives `w` 5, which isn't text".
- [x] An alphabet symbol that isn't one code point after NFC, or a symbol given twice, fails, naming the field and the symbol.
- [x] A `minLength` above `maxLength`, or a negative `minLength`, fails.
- [x] Props of the wrong kind fail: `min` or `max` on a text field, and `alphabet`, `minLength` or `maxLength` on a number field.
- [x] Every new failure is asserted, word for word, by extending the existing Stage-failures test (`tests/check`). Today's number-field failures stay unchanged word for word.
- [x] **The `artifact` skill, in the same commit:** the custom-build rules (`stage.md`) list the new failure messages beside the existing Stage failures.
- [x] The `Stage`'s doc comment, where it lists what the check fails, names the text field's rules. Then `pnpm components`.
- [x] Stays inside the Stage: no shared part changes. Number Stages on the catalog and in the sample artifact (`rsa-from-scratch`) still pass the check.
- [x] A missing `maxLength`, or one that isn't a whole number of at least 1, fails, naming the field.

## Comments

### 2026-11-09: notes from Stage text input 01

`Stage.astro`'s `exampleProblems` checks each example against the definitions in `fields` through `fieldProblem` (`step-applier.ts`), the rule the page also refuses typed input by. Give the text rule's problems there, so the check's example failures and the page's refusals keep one rule; the props' own failures (alphabet, `minLength`, `maxLength`) sit with the other `problems` above it.

### 2026-11-09: notes from Stage text input 02

Implementer of [02](02-a-stage-takes-a-text-field.md):

- `Field` in `step-applier.ts` is now `NumberField | TextField`. A text field's definition on the page is `{ name, label?, kind: "text", alphabet?, minLength, maxLength }`: `Stage.astro` fills `minLength` with 0 when the props leave it out, and writes `alphabet` only when given. The props' own type (`Typed["input"]["fields"]` in `Stage.astro`) is a union on `kind`, so `min` on a text field or `alphabet` on a number field already fail the type check; the build-time failures this ticket adds cover entries that break the types and still build.
- `fieldProblem` returns `"not-text"` for a text field given anything but a string, and `Stage.astro`'s `exampleProblems` words it as the owner decided, "example 2 gives `w` 5, which isn't text". No test asserts it yet: add it to the Stage-failures test here. The text rule itself (alphabet, lengths by code point after NFC, the example's NFC) isn't in `fieldProblem` yet; it goes there.
- The valid fixtures `automato-par` and `hash-modular` (`tests/check/valid-artifacts.test.ts`) write their examples in NFC and must keep passing once the NFC failure lands.

### 2026-11-09: closing comment

Implementer of 03. Result: `pnpm check` fails a Stage's broken text fields as `build` at the Stage, in the same `Stage: …; …` line as its other problems, and in the same run.

- **The rule** is `fieldProblem` (`step-applier.ts`), which now returns `{ problem }` or `{ problem: "outside-alphabet", symbol }`. For a text field, in this order: not a string (`not-text`), not in NFC (`not-nfc`), the first symbol outside the alphabet, longer than `maxLength`, shorter than `minLength`, lengths counted in code points (`Array.from`). One problem per field per example, the first in that order. `Stage.astro`'s `exampleProblems` words them; the page's `#type` already calls the same function (04 wires the text refusal).
- **Wording** (asserted word for word in `tests/check/artifact-failures.test.ts` › "an artifact whose Stage breaks the Stage's own rules", whose number-field lines are unchanged):
  - examples: "example 2 gives `w` \"abc\", whose c is outside the alphabet", "example 3 gives `w` \"abab\", longer than 3", "example 4 gives `w` \"\", shorter than 1", **NFC:** "example 5 gives `w` \"bé\", which isn't in NFC", "example 7 gives `w` 5, which isn't text", and a number field given text keeps "example 7 gives `a` \"x\", which isn't a whole number".
  - props: "the field `t` has \"ab\" in its alphabet, which isn't one code point", "the field `t` has \"x\" more than once in its alphabet", "the field `u` has `minLength` -1, which isn't a whole number of at least 0", "the field `v` has no `maxLength`", "the field `u` has `maxLength` 0, which isn't a whole number of at least 1", "the field `t` has `minLength` 3, above its `maxLength` 2", "the field `t` has `min`, which only a number field takes", "the field `n` has `alphabet`, which only a text field takes" (likewise `max`, `minLength`, `maxLength`). They sit after "give it only one of `choose` and `input`" and before the example problems, per field: alphabet, `minLength`, `maxLength`, the two compared, then props of the other kind.
- **Decisions:**
  - The NFC check is in `fieldProblem` too, so the rule stays one function. The page hands it typed text already in NFC, so only an example can hit it.
  - An alphabet symbol is normalised to NFC in the definition the page and the check share (`data-fields`), so a decomposed `é` in an alphabet counts as one code point and matches a composed `é` typed or in an example. Duplicates are found after NFC (`é` and `e` + U+0301 are one symbol given twice), and each repeated or overlong symbol is named once.
  - A field whose own props fail isn't held to its examples (it has no rule that can hold). Its examples still fail "has no" when they leave it out.
  - "outside the alphabet" names the symbol bare, as the ticket and spec write it, not in backticks or quotes.
  - `minLength` that isn't a whole number fails with the negative one: "isn't a whole number of at least 0", the same shape as `maxLength`'s.
  - A field with no `kind` but with `alphabet`, `minLength` or `maxLength` gets past the props' types (it matches the number member), so only this check catches it. `min`/`max` on a text field also fail the type check (TS2353), which the test asserts beside the build line.
- **Docs:** `.claude/skills/artifact/stage.md` lists the new failures beside the Stage's others, in the same commit as the check; the `Stage` doc comment's list of what the check fails names the text field's rules; `pnpm components` regenerated `COMPONENTS.md`.
- **Shared parts:** none changed. The change stays inside the Stage (`Stage.astro`, `step-applier.ts`). Nothing rendered changes except the alphabet in `data-fields`, which is the same for every alphabet already in NFC, the catalog's `["a", "b"]` among them. The impeccable detector found nothing in `Stage.astro`. The catalog's and `rsa-from-scratch`'s number Stages, and the valid fixtures `automato-par` and `hash-modular`, pass the full check.
- **Commits:** d8bab0b (rule, failures, test, skill, doc comment, `COMPONENTS.md`), c7b693c (lint: `Array.from` for code points), the merge of `impeccable-gaps-implementation` at 56951d4 (code display 03; no conflicts), and this closing commit.
- **Validation:** the Stage-failures test went red, then green (22 of 22 in `artifact-failures.test.ts`). The full `scripts/heavy pnpm check` on the merged HEAD first failed on three ESLint errors in this change (string spread, an unnecessary `?.`), which also failed the fixture-repo tests that lint the same code. After the fix, ESLint and Prettier pass on both files. The final gate's result is recorded in the next comment.
- **Left undone:** the page's refusal of text (04).

### 2026-11-09: gate

The full `scripts/heavy pnpm check` on 0d00228 passed with 0 failures, Vitest included, and `scripts/heavy --status --json` showed `check.applicability: current` for that HEAD. In the built catalog and `rsa-from-scratch`, every Stage's `data-fields` matches its props as written: the number fields are unchanged, and the text Stage's alphabet is `["a","b"]`. `README.md` was set to mode 644 before the run, as the brief's known-flake note says.
