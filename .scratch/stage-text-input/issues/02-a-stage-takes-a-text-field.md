# 02: A Stage takes a text field and runs its build on the text typed

Status: resolved
Blocked by: 01

Spec: [Stage text input](../spec.md), sections "A text field", "The build", "The field", "Print and the page without JavaScript", "Say it for the ear", "Runs and Look" and "Documentation". The decisions are in [Typed words in a Stage](../../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md) › Answer. Don't reopen them.

**What to build:** the happy path, end to end.

- **The agent:** an agent can put a text field in a Stage's `input.fields`, `{ name, label?, kind: "text", alphabet?, minLength?, maxLength }`, beside number fields or alone. It types the build per field, `defineBuild<{ w: string; m: number }>`, and `pnpm check` runs the build on every example, the empty word included.
- **The owner:** the field opens filled with the first example's text. On Start, the build gets the typed text normalised to NFC, not trimmed or case-folded, as a `string`, with `""` for the empty word, and the owner steps through the run.
- **Print and no JavaScript:** without JavaScript and in print, the Stage names the first example after the input's label, with the text value bare in the code face and `ε` for the empty word.
- **Number fields:** a field without `kind` stays a whole number, so existing Stages and builds don't change.

This ticket doesn't cover refusals. The check's failures for examples and props that break a text field's rule are 03, and the page's refusal of typed text is 04.

- [x] `Typed` holds a number or a string per field, and `Build` and `defineBuild` take a build typed per field. Existing builds typed `{ a: number; b: number }` still type-check: the existing valid fixtures pass unchanged.
- [x] Two new valid fixture artifacts pass `pnpm check`, with their builds run on every example (`tests/check`):
  - A Stage with a word field over an alphabet, whose examples include the empty word.
  - A Stage that mixes a free-text field (no alphabet) and a number field, shaped like a hashing build, `h(t, m)`.
  - In each, a run's tables as written show that the build got the text as given, the empty word as `""`. Use the first example's result check, not an internal assertion.
- [x] The built page holds a text field with its name, its label when given, and the first example's text as its value. Autocapitalise, autocorrect and spellcheck are off, it has no `maxlength` attribute, and it isn't a numeric field. The number fields beside it are unchanged.
- [x] The line naming the first example reads "Aceita w? w = aabba", the value in the code face and without quotation marks. With the mixed fixture it reads "Calcular h(t, m) t = olá mundo, m = 7", and an empty first example shows `ε` in the value's place. These are asserted on the built output.
- [x] `build-input` fails when a build's type gives a text field anything but `string`, or a number field anything but `number`. The wording follows the existing typed-input messages, with the expected type naming each field's own type: "`steps` takes `{ w: number }`, but the Stage's fields give it `{ w: string }`: write `defineBuild<{ w: string }>`". Extend the existing `build-input` test.
- [x] On the page, Start reads the text field as NFC. A decomposed `é` reaches the build as one code point, and a trailing space reaches it intact. Check this in a browser on the catalog, since no seam owns the Stage page's behaviour.
- [x] **The field's look:**
  - It is set in the code face and is as wide as `maxLength` plus one character.
  - A field wider than a 393px phone takes its own line, full width.
  - The look goes through impeccable in a local session (`design-system/CLAUDE.md`), and `DESIGN.md` › Stage gains the text field: its code face and its width.
- [x] The catalog's Stage page gains a Stage with a word field over an alphabet and an empty-word example, through impeccable. The page's `about` line names it.
- [x] `pnpm look` on the text fixture or the catalog prints `first example w = aabba` with no change to Look. Confirm it, and change Look only if it doesn't.
- [x] **The `Stage`'s doc comments**, then `pnpm components` to regenerate `COMPONENTS.md`:
  - **Typed input:** whole numbers or text, the text field's props, NFC and code points, the empty word and `ε`, and print naming.
  - The `input` prop's type and description, `Typed`, `Build` and `defineBuild`.
  - **Say it for the ear:** a screen reader reads `aabba` as one word, so when the symbols matter `say` spells them out ("lê a, a, b, b, a") and says "a palavra vazia", never "ε".
  - If the reference gains a text-field example, mirror its build as a valid fixture, as the existing reference builds are mirrored.
- [x] **The `artifact` skill, in the same commit:**
  - The custom-build rules (`stage.md`) gain the text field and the new `build-input` wording.
  - **Custom builds** › "Missing a control or a mark?" says the Stage takes `choose`, or typed whole numbers and text (`input`).
- [x] An `input.examples` value that isn't in NFC fails the build (03 gives the failure), so the check and the page, which reads the field as NFC, always run the same text. The fixtures here write their examples in NFC.
- [x] **Shared parts:** this changes no part `CODING_STANDARDS.md` lists. The Stage's field reading, its markup and print naming, and `Typed` reach every Stage with `input` and every build's types. The catalog's number Stages and the sample artifact's typed Stages (`rsa-from-scratch`) show, run and refuse exactly as before. Check them on the catalog with the same evidence as the new Stage.

## Comments

### 2026-11-09: notes from Stage text input 01

Implementer of [01](01-one-rule-per-stage-field.md), which gathered the field definition:

- Each field's definition is `Field` in `step-applier.ts`, `{ name, label?, kind: "number", min, max }`. `Stage.astro` builds it once from the props (`fields`, picking each prop explicitly, so add the text props there with `kind: "text"`) and writes the list as JSON in `data-fields` on `.stage-input`, beside `data-examples`. `stageFields(stage)` reads it back.
- `stageControl` takes each `NamedValue`'s `kind` from the definition, and `NamedValue["kind"]` is `Field["kind"]`. `build-input` words the expected type as `` `${name}: ${kind}` `` and keys `kindFlags` by it, so with `kind: "text"` map it to the type's name, `string`, rather than printing `text`.
- `fieldProblem(field, value)` is the one rule: `Stage.astro`'s `exampleProblems` and the page's `#type` both call it. The page reads the owner's text with `typedNumber` before it; reading a text field (NFC, not trimmed) goes there, chosen by `kind`. The refusal line comes from the definition (`label ?? name`, `min`, `max`), not the DOM.
- `README.md` is mode 0600 in new worktrees: `chmod 644 README.md` before `pnpm check`, or `tests/check/reporting.test.ts` fails.

### 2026-11-09: closing comment

Implementer of this ticket, impeccable-gaps-implementation pass.

**Result:** a Stage's `input.fields` takes a text field, `{ name, label?, kind: "text", alphabet?, minLength?, maxLength }`, beside number fields or alone. `Typed` is `Record<string, number | string>`; `Build` and `defineBuild` take a build typed per field (`defineBuild<{ w: string; m: number }>`), and existing `{ a: number; b: number }` builds type-check unchanged. `Field` in `step-applier.ts` is `NumberField | TextField`; the definition on the page carries `kind: "text"`, `minLength` (0 when left out) and `alphabet` when given. On Start the page reads a text field with `typedText` (NFC, not trimmed or case-folded) and hands it to the build as a `string`, `""` for the empty word. The field is the number field's 2px box set in the code face (Recursive, `"MONO" 1`) at 1rem, set left, `maxLength + 1` characters wide, with autocapitalise, autocorrect and spellcheck off, no `maxlength` and no `inputmode`. Print and the page without JavaScript name the first example with the text bare in `<code>`, `ε` for the empty word. `build-input` words a text field's expected type as `string`. The doc comments (Typed input, a new **Typed text** with a reference build, `input`, `Typed`, `Build`, `defineBuild`, Say it for the ear), `COMPONENTS.md`, `stage.md`, `rules.md` › "Missing a control or a mark?", `DESIGN.md` › Stage and `.impeccable/design.json` say so. The catalog's Stage page gains "Typed text" (`even-bs.build.ts`, a word over a and b with the empty word among its examples), named in its `about` line.

**Commits:** 9e3e75c (claim), 22c67a8 (the work), the closing commit and the merge of the integration tip.

**Validation:**

- Tests were written before the implementation (the queue was busy, so their first run came after it). `tests/check/valid-artifacts.test.ts` gains `automato-par` (a word field over an alphabet, two Stages: the first example `aabba`, the second the empty word, each build writing the text it got into its table, so the first-example result check shows `aabba` and `ε`/`0` for `""`) and `hash-modular` (a free-text field and a number field, `h(t, m)`, its table holding `t`, the code-point count 9, the sum 1023 and h = 1 for `olá mundo`, 7). A new test asserts the built fields (name, label, value, `autocapitalize`/`autocorrect`/`spellcheck` off, no `maxlength`, no `inputmode` on text, the number field unchanged) and the lines "Aceita w? w = aabba", "Contar |w| w = ε" and "Calcular h(t, m) t = olá mundo, m = 7", with the text in `<code>`. `artifact-checks.test.ts` extends `build-input` with `{ w: number }` against a text field (the ticket's wording) and `{ t: string; m: string }` against a mixed Stage; its failure counts go up by those two.
- Browser, on the built catalog (`/catalog/stage/`, `?lang=pt-BR`), light and dark, 1280 and 393, screen and print: Start hands the build `aé` as two code points (97, 233, so 4 steps), `ab ` with its trailing space (97, 98, 32), and the empty field as `""` (the build's `ε`, 2 steps); the field is Recursive at 16px, set left; print shows "Accepts w? w = aabba" with the word in Recursive. A field forced to 41 symbols at 393 px first overflowed the column (the controls' grid track grew to the form's min-content); `.stage-input` now takes `min-inline-size: 0`, and the field then fills its own line (353 px) with Start under it. No page errors.
- Number Stages before/after (baseline worktree at the integration tip, both built): every Stage on `/catalog/stage/` (en, pt-BR) and `/rsa-from-scratch/`, keyed by build, loaded, stepped to the end and refused per field with 99999, 4.5, −99999 and x (line, announcement, marks, cells, `aria-invalid`, `aria-describedby`, focus, border style, field width and font), light and dark: the two `record.json` files are byte-identical. With the caret hidden and each Stage on a whole pixel, the PNGs of `rsa-from-scratch`'s two typed Stages and the catalog's "Typed input" and "Refusing a number" hash the same; the Stages after the new catalog figure differ only by their figure number (5.1 → 6.1), and the two Prim Stages by faint antialiasing on their drawings' lines (largest channel difference 49), nothing visible.
- `pnpm look` on a temporary copy of the reference Stage prints `first example w = aabba, 7 steps`; Look needed no change. The copy was removed.
- Full `pnpm check` on the final HEAD, after merging the integration tip: recorded below the merge.

**Decisions:**

- The text field is set at 1rem, the frame size, not code's 0.82em of body type: below 16px a phone zooms the page into a focused field. Recursive at 1rem still reads as the code face beside code blocks (about 15px).
- The print line's text is plain inline `<code>`, so it takes inline code's own look (Recursive, 0.82em, the wiped grey) rather than a style of its own.
- `fieldProblem` gives a text field one problem today, `"not-text"`, worded "which isn't text" as the owner decided, so the union stays exhaustive; the text rule (alphabet, lengths, NFC) is 03's. The page refuses only number fields until 04 (`definition.kind === "number"` in `#type`).
- The definition carries `minLength` filled with 0, as it carries `kind: "number"`: the page, the Stage and the check read one explicit rule.
- Every `.stage-field` carries `data-kind`, which the text field's styles select on; the number fields' look doesn't change.
- `DESIGN.md`'s frontmatter gains no token for the text field: it is the `stage-field` box in the existing code face at the frame size, which the prose records.
- A Stage needs a build of its own, so the empty-word first example is a second Stage in `automato-par` with its own small build (`tamanho`), rather than a third artifact.
- The catalog's build walks the word with `Array.from`, since the platform's ESLint refuses spreading a string (`no-misused-spread`); artifact builds aren't linted that way, so the reference keeps `[...input.w]`, which counts by code point as the Stage does.

**Shared parts:** none of `CODING_STANDARDS.md`'s shared parts changed. The change stays inside the Stage (`Stage.astro`, `stage-element.ts`, `step-applier.ts`, `stage-build.ts`) and `build-input`; it reaches every Stage with `input` and every build's types, which the before/after capture and the unchanged valid fixtures cover.

**Left undone:** nothing in this ticket. The NFC failure for examples is 03's, and the page's refusal of text is 04's; notes are on both.
