# 02: A Stage takes a text field and runs its build on the text typed

Status: ready-for-agent
Blocked by: 01

Spec: [Stage text input](../spec.md), sections "A text field", "The build", "The field", "Print and the page without JavaScript", "Say it for the ear", "Runs and Look" and "Documentation". The decisions are in [Typed words in a Stage](../../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md) › Answer. Don't reopen them.

**What to build:** the happy path, end to end.

- **The agent:** an agent can put a text field in a Stage's `input.fields`, `{ name, label?, kind: "text", alphabet?, minLength?, maxLength }`, beside number fields or alone. It types the build per field, `defineBuild<{ w: string; m: number }>`, and `pnpm check` runs the build on every example, the empty word included.
- **The owner:** the field opens filled with the first example's text. On Start, the build gets the typed text normalised to NFC, not trimmed or case-folded, as a `string`, with `""` for the empty word, and the owner steps through the run.
- **Print and no JavaScript:** without JavaScript and in print, the Stage names the first example after the input's label, with the text value bare in the code face and `ε` for the empty word.
- **Number fields:** a field without `kind` stays a whole number, so existing Stages and builds don't change.

This ticket doesn't cover refusals. The check's failures for examples and props that break a text field's rule are 03, and the page's refusal of typed text is 04.

- [ ] `Typed` holds a number or a string per field, and `Build` and `defineBuild` take a build typed per field. Existing builds typed `{ a: number; b: number }` still type-check: the existing valid fixtures pass unchanged.
- [ ] Two new valid fixture artifacts pass `pnpm check`, with their builds run on every example (`tests/check`):
  - A Stage with a word field over an alphabet, whose examples include the empty word.
  - A Stage that mixes a free-text field (no alphabet) and a number field, shaped like a hashing build, `h(t, m)`.
  - In each, a run's tables as written show that the build got the text as given, the empty word as `""`. Use the first example's result check, not an internal assertion.
- [ ] The built page holds a text field with its name, its label when given, and the first example's text as its value. Autocapitalise, autocorrect and spellcheck are off, it has no `maxlength` attribute, and it isn't a numeric field. The number fields beside it are unchanged.
- [ ] The line naming the first example reads "Aceita w? w = aabba", the value in the code face and without quotation marks. With the mixed fixture it reads "Calcular h(t, m) t = olá mundo, m = 7", and an empty first example shows `ε` in the value's place. These are asserted on the built output.
- [ ] `build-input` fails when a build's type gives a text field anything but `string`, or a number field anything but `number`. The wording follows the existing typed-input messages, with the expected type naming each field's own type: "`steps` takes `{ w: number }`, but the Stage's fields give it `{ w: string }`: write `defineBuild<{ w: string }>`". Extend the existing `build-input` test.
- [ ] On the page, Start reads the text field as NFC. A decomposed `é` reaches the build as one code point, and a trailing space reaches it intact. Check this in a browser on the catalog, since no seam owns the Stage page's behaviour.
- [ ] **The field's look:**
  - It is set in the code face and is as wide as `maxLength` plus one character.
  - A field wider than a 393px phone takes its own line, full width.
  - The look goes through impeccable in a local session (`design-system/CLAUDE.md`), and `DESIGN.md` › Stage gains the text field: its code face and its width.
- [ ] The catalog's Stage page gains a Stage with a word field over an alphabet and an empty-word example, through impeccable. The page's `about` line names it.
- [ ] `pnpm look` on the text fixture or the catalog prints `first example w = aabba` with no change to Look. Confirm it, and change Look only if it doesn't.
- [ ] **The `Stage`'s doc comments**, then `pnpm components` to regenerate `COMPONENTS.md`:
  - **Typed input:** whole numbers or text, the text field's props, NFC and code points, the empty word and `ε`, and print naming.
  - The `input` prop's type and description, `Typed`, `Build` and `defineBuild`.
  - **Say it for the ear:** a screen reader reads `aabba` as one word, so when the symbols matter `say` spells them out ("lê a, a, b, b, a") and says "a palavra vazia", never "ε".
  - If the reference gains a text-field example, mirror its build as a valid fixture, as the existing reference builds are mirrored.
- [ ] **The `artifact` skill, in the same commit:**
  - The custom-build rules (`stage.md`) gain the text field and the new `build-input` wording.
  - **Custom builds** › "Missing a control or a mark?" says the Stage takes `choose`, or typed whole numbers and text (`input`).
- [ ] An `input.examples` value that isn't in NFC fails the build (03 gives the failure), so the check and the page, which reads the field as NFC, always run the same text. The fixtures here write their examples in NFC.
- [ ] **Shared parts:** this changes no part `CODING_STANDARDS.md` lists. The Stage's field reading, its markup and print naming, and `Typed` reach every Stage with `input` and every build's types. The catalog's number Stages and the sample artifact's typed Stages (`rsa-from-scratch`) show, run and refuse exactly as before. Check them on the catalog with the same evidence as the new Stage.

## Comments

### 2026-11-09: notes from Stage text input 01

Implementer of [01](01-one-rule-per-stage-field.md), which gathered the field definition:

- Each field's definition is `Field` in `step-applier.ts`, `{ name, label?, kind: "number", min, max }`. `Stage.astro` builds it once from the props (`fields`, picking each prop explicitly, so add the text props there with `kind: "text"`) and writes the list as JSON in `data-fields` on `.stage-input`, beside `data-examples`. `stageFields(stage)` reads it back.
- `stageControl` takes each `NamedValue`'s `kind` from the definition, and `NamedValue["kind"]` is `Field["kind"]`. `build-input` words the expected type as `` `${name}: ${kind}` `` and keys `kindFlags` by it, so with `kind: "text"` map it to the type's name, `string`, rather than printing `text`.
- `fieldProblem(field, value)` is the one rule: `Stage.astro`'s `exampleProblems` and the page's `#type` both call it. The page reads the owner's text with `typedNumber` before it; reading a text field (NFC, not trimmed) goes there, chosen by `kind`. The refusal line comes from the definition (`label ?? name`, `min`, `max`), not the DOM.
- `README.md` is mode 0600 in new worktrees: `chmod 644 README.md` before `pnpm check`, or `tests/check/reporting.test.ts` fails.
