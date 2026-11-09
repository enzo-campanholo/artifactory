# 04: The page refuses typed text that breaks its field's rule

Status: resolved
Blocked by: 02, 03

Spec: [Stage text input](../spec.md), section "Refusals". The decisions are in [Typed words in a Stage](../../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md) › Answer.

**What to build:** text that breaks its field's rule never reaches the build. The rule is the same one 03 gives the check. When the owner types or pastes such text and presses Start, the page refuses it the way it refuses a number:

- the field is drawn dashed and takes the focus back, and its description names the reason;
- the step's line states the field's whole rule, not which symbol broke it;
- the content goes back as written.

Nothing is truncated: pasted text longer than `maxLength` stays whole in the field and shows whole. In a Stage with a text field, a failed run's line reads "…para esta entrada." / "…for this input.", and it and a run past 200 steps end with "Tente outra entrada." / "Try another input.". Number-only Stages keep today's lines.

- [x] The step's line takes the spec's four shapes, in both languages:

  | Field | pt-BR | English |
  | --- | --- | --- |
  | alphabet, `minLength` 0 | Digite até 12 símbolos, só a e b, para w. | Type up to 12 symbols, only a and b, for w. |
  | alphabet, `minLength` 1 | Digite de 1 a 12 símbolos, só a e b, para w. | Type 1 to 12 symbols, only a and b, for w. |
  | no alphabet, `minLength` 0 | Digite até 40 caracteres para t. | Type up to 40 characters for t. |
  | no alphabet, `minLength` 2 | Digite de 2 a 40 caracteres para t. | Type 2 to 40 characters for t. |

  - The alphabet lists its symbols with commas and a final "e" / "and" ("só 0, 1 e □").
  - The field is named by its `label` when it has one.
- [x] Lengths count code points after NFC, so `é` is one symbol however it was typed. An empty field is the empty word: taken with `minLength` 0 and refused with `minLength` 1.
- [x] The first refused field takes the focus, as with number fields. In a mixed Stage, a refused number field keeps today's line.
- [x] In a Stage with a text field, the too-many-steps and failed-run lines end "Tente outra entrada." / "Try another input.". The failed-run line's first half mustn't speak of numbers either: "…para esses números" would be wrong. It reads "…para esta entrada." / "…for this input.".
- [x] Number-only Stages' lines are unchanged word for word.
- [x] **The catalog's Stage page** gains the refused state of a text field. The catalog script types a word outside the alphabet and presses Start, as "Refusing a number" does. This goes through impeccable in a local session (`design-system/CLAUDE.md`).
  - Check the refusal in a browser on the catalog, in English and with `?lang=pt-BR`: the dashed field, the focus, the line and the description. Also check a pasted over-long word staying whole and a decomposed `é` counted as one. No seam owns the Stage page's behaviour.
- [x] `DESIGN.md` › Stage gains the text field's refusal.
- [x] The `Stage`'s **Typed input** doc comment gains the refusal line, then `pnpm components`. Update the `artifact` skill's custom-build rules too if they describe the page's refusal.
- [x] **Shared parts:** stays inside the Stage, since the refused field's dashed box is the number field's own style. "Refusing a number" on the catalog, and a refused number in the sample artifact (`rsa-from-scratch`), show exactly as before, with the same evidence as the new state.

## Comments

### 2026-11-09: notes from Stage text input 01

The page's refusal is `#type` in `stage-element.ts`. It walks `stageFields(this)`, the definitions on the page, and refuses the first field `fieldProblem` (`step-applier.ts`) refuses, with the line from `texts.refusedNumber(label ?? name, min, max)`. The text rule and its line join there, chosen by the definition's `kind`. A before/after capture of every Stage's refusals (record and PNG hashes, light and dark, en and pt-BR, catalog and `rsa-from-scratch`) is in the shared notes' `capture-stages.ts` pattern; 01 extended it with refusals (`aria-invalid`, `aria-describedby`, focus, border style).

### 2026-11-09: notes from Stage text input 02

Implementer of [02](02-a-stage-takes-a-text-field.md):

- `#type` in `stage-element.ts` reads a text field with `typedText` (`step-applier.ts`: NFC, untrimmed) and a number field with `typedNumber`, by the definition's `kind`. It refuses only number fields today (`definition.kind === "number" && fieldProblem(…)`), since 02 has no text rule: once 03 puts the text rule in `fieldProblem`, drop the `kind` guard and choose the line (`refusedNumber` or the text line) by `kind`.
- The text field carries `data-kind="text"` on its `.stage-field` label, and its box is the number field's own, so `&[aria-invalid="true"]`'s dashed border already reaches it.
- The catalog's text Stage is "Typed text" on `catalog/stage.mdx`, build `even-bs.build.ts` (alphabet a and b, `maxLength` 12). Its build runs any text the page hands it; a word outside the alphabet reaches it until this ticket refuses it.
- Browser scripts from 02, keyed by each Stage's build so a new catalog Stage doesn't shift the comparison: `capture-number-stages.ts` (number Stages loaded, stepped and refused, before/after) and `check-text-stage.ts` (the text Stage's look, NFC and trailing space at Start) in the shared notes.

### 2026-11-09: notes from Stage text input 03

Implementer of [03](03-check-fails-broken-text-fields.md):

- `fieldProblem` (`step-applier.ts`) now holds the whole text rule and returns an object: `{ problem: "not-whole" | "out-of-bounds" | "not-text" | "not-nfc" | "too-long" | "too-short" }` or `{ problem: "outside-alphabet", symbol }`, `undefined` when the value holds. Lengths are code points (`Array.from`). `#type` in `stage-element.ts` still compares its result to `undefined`, so it compiles unchanged. Drop its `definition.kind === "number"` guard and choose the line by `kind`. `typedText` already gives NFC, so the page never sees `not-nfc`.
- The definition in `data-fields` carries the alphabet in NFC (`Stage.astro` normalises each symbol), and `minLength` filled with 0. A field whose props fail never reaches the page: the build fails first.
- The ESLint config rejects `[...text]` (`@typescript-eslint/no-misused-spread`). Use `Array.from(text)` to walk code points in platform code.

### 2026-11-09: resolved

Implementer of 04.

**Result:** `#type` in `stage-element.ts` refuses a text field by `fieldProblem`, as it does a number field: dashed box, focus, `aria-describedby` on the step's line, the text left whole. The line states the field's whole rule in the spec's four shapes (`refusedText`, one `textRule` worded per language). A Stage with a text field takes its refused-run lines from `refused.text` ("…para esta entrada." / "…for this input.", "Tente outra entrada." / "Try another input."); number-only Stages keep `refused.numbers`, word for word. The catalog's Stage page gains "Refusing a word" (`even-bs-refused`, typed `abc`); `DESIGN.md` › Stage, `.impeccable/design.json`, the **Typed text** and `input` doc comments (`COMPONENTS.md` regenerated) and `.claude/skills/artifact/stage.md` ("the page refuses input the build throws on") say so. `rules.md` › Custom builds doesn't describe the page's refusal, so it's unchanged.

**Commits:** 73d4f01 (claim), 653eb2d (refusal, catalog, docs).

**Validation:**

- No seam owns the Stage page's behaviour, so red/green ran through a browser script on the built catalog (`/catalog/stage/`, en and `?lang=pt-BR`), editing the text Stage's field definition on the page where the catalog has no Stage with that rule. Red on the integration tip, green after: a word outside the alphabet; one symbol too long, whole and fitting the field; 30 pasted symbols kept whole, no `maxlength`; the empty word taken with `minLength` 0 and refused with 1; a label and a three-symbol alphabet ("only 0, 1 and □, for the word"); two decomposed `é` taken under `maxLength` 2 and three refused; `minLength` 2 with no alphabet; 250 symbols past 200 steps and a build that can't load, both "…Try another input."; a mixed Stage whose refused number keeps today's line; a number-only Stage's failed run unchanged. Each refusal checked for the line, the announcement, `aria-invalid`, `aria-describedby`, focus, the dashed border and the hidden counter.
- Shared parts, the number Stages: the 02 capture (`capture-number-stages.ts`, light and dark, en and pt-BR, catalog and `rsa-from-scratch`, loaded, stepped and refused per field) on the integration tip and on 653eb2d: `record.json` identical; every PNG identical except the three catalog Stages below the new section (collatz, factorial, sum-listing), whose figure number moved by one, plus faint antialiasing in factorial's step line (text and marks identical in the record). "Refusing a number" PNGs identical, light and dark, 1280 and 393, en and pt-BR. `rsa-from-scratch` identical.
- The new state looked at in light and dark, 1280 and 393, en and pt-BR.

**Decisions:**

- The range keeps together with no-break spaces as a refused number's bounds do ("up to 12", "1 to 12", "até 12", "de 1 a 12"), and the field's name is bound to "for" / "para", so it never stands alone on the line's last row (it did at 393px in pt-BR). Number lines are untouched.
- `maxLength` 1 takes the singular ("1 symbol", "1 caractere"), and `minLength` equal to `maxLength` says the one count ("Type 3 symbols, only a and b, for w.").
- The alphabet is listed by hand, not with `Intl.ListFormat`, since English's would add the serial comma the spec doesn't write.
- A machine fault's retry in a Stage with a text field also ends "Tente outra entrada." / "Try another input.", since "Tente outros números." would be as wrong there as in the other refused-run lines.
- The catalog's refused word Stage has its own build (`even-bs-refused.build.ts`, a re-export), as "Refusing a number" has `mdc-refused`, so captures keyed by build don't mix the two text Stages.
- `.impeccable/design.json`'s Stage description gains the sentence by hand, mirroring `DESIGN.md`; no other part of the world changed.

**Shared parts:** stays inside the Stage. The refused text field's dashed box is the number field's own `aria-invalid` style, unchanged; the evidence above covers the number Stages it reaches.

**Left undone:** nothing.
