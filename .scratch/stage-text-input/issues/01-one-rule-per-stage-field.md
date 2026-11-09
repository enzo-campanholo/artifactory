# 01: One rule per Stage field, shared by the page and the check

Status: resolved
Blocked by: [Stage choice groups 01](../../stage-choice-groups/issues/01-name-the-stage-s-control-instead-of-inferring-it.md)

Spec: [Stage text input](../spec.md). A prefactor: make the change easy, then make the easy change.

**What to build:** nothing changes for the owner or for an agent writing a Stage. Today a typed-input field's rule is assumed to be a whole number in three places that each rebuild it their own way. The Stage checks its `input.examples` with the shared number rule. The page rebuilds each field's bounds from separate attributes on its input before it refuses what the owner typed. `build-input` writes `number` beside every field name it finds on the built page to get the type it expects. Gather these so that each field's definition, with its name, its label and its rule, sits on the built page once. The page's refusal and the Stage's example check then go through one field rule, and `build-input` takes each field's expected type from that definition instead of assuming `number`. Ticket 02 then adds the text kind in one place, not three.

The edge to Stage choice groups 01 exists only because both prefactors rewrite the same seam, how the Stage, the page and the check read a build's input, so their rewrites don't conflict; nothing here depends on its behaviour.

- [x] Every existing test passes unchanged, and no test is added or moved. This is a behaviour-neutral refactor, so the seams already cover it.
- [x] The built page still holds each number field with the same name, label and first-example value. It also still holds the same line naming the first example ("Calcular mdc(a, b) a = 48, b = 18").
- [x] `build-input`'s messages and the Stage's example failures are unchanged word for word.
- [x] On the catalog's Stage page, "Typed input", "Refusing a number", "Code, mid-run" and "A table that grows" show, run and refuse exactly as before. That means the same step line, the dashed field, focus taken back and the line's description, in English and with `?lang=pt-BR`. The sample artifact's two typed Stages (`rsa-from-scratch`) run as before too.
- [x] Nothing visible changes, so `DESIGN.md` is untouched. If the `input` prop's type is reworded, `pnpm components` leaves `COMPONENTS.md` as it was, or changes it only where the prop's type is printed.
- [x] The change stays inside the Stage: none of `CODING_STANDARDS.md`'s shared parts change. It reaches every Stage with `input`, which the catalog and sample checks above cover.
- [x] Runs in a local session, as `design-system/CLAUDE.md` asks for any component change, though no visual change goes through impeccable here.

## Comments

### 2026-11-09: notes from Stage choice groups 01

Implementer of [Stage choice groups 01](../../stage-choice-groups/issues/01-name-the-stage-s-control-instead-of-inferring-it.md), which rewrote the same seam:

- `build-input` no longer assumes `number`. It takes `takes` from `stageControl(stage)` in `step-applier.ts`, whose `named` values each carry a `kind`, and words the expected type as `{ name: kind; … }`. `kindFlags` in `build-input.ts` maps each kind to TypeScript's flag. `stageControl` still writes `kind: "number"` for every `.stage-field input`: take each field's kind from the field definition this ticket puts on the page, and 02 adds `"string"` (`TypeFlags.String`) there.
- The page's refusal lines are `texts.refused[control]` in `stage-element.ts`. "Try another input." for a Stage with a text field needs a choice beyond the control. The check's run naming (`named()` in `custom-build-runs.ts`) and the `body` rule (`runBuild`'s `control` argument) no longer look at the input's type.

### 2026-11-09: closing comment

Implementer of this ticket, impeccable-gaps-implementation pass.

**Result:** each typed field's definition, `Field` in `step-applier.ts` (`{ name, label?, kind: "number", min, max }`), sits on the built page once, as JSON in `data-fields` on `.stage-input`, beside `data-examples`. `Stage.astro` builds the list once from the props and renders the fields, the example line and the example checks from it; the inputs lose `data-min`/`data-max`. `fieldProblem` (was `numberProblem`) is the one rule: `Stage.astro`'s example check and the page's refusal (`#type` in `stage-element.ts`, which now walks `stageFields(this)` and words the line from the definition's `label ?? name` and bounds) both go through it. `stageControl` takes each named value's `kind` from the definition (`NamedValue["kind"]` is `Field["kind"]`), so `build-input` no longer gets `number` from a constant. No test added or moved; the `input` prop's type is unchanged, so `COMPONENTS.md` and `DESIGN.md` are untouched.

**Commits:** 6784b22 (claim), f57c72f (the refactor), ca7d4c1 (closing), 8d8d772 (a field without `label` leaves it out of its definition, for `exactOptionalPropertyTypes`; the built page is byte-for-byte the same, since JSON drops an undefined label) and the commit recording it.

**Validation:**

- Full `pnpm check` on the final HEAD after merging the integration tip passes, every existing test unchanged.
- Browser, before/after: baseline worktree at the integration tip (e18ba60) and this branch, both built, run through the shared `capture-stages.ts` extended to record each typed Stage as loaded and refused for every field with `99999`, `4.5`, `−99999` and `x` (step line, announcement, value, `aria-invalid`, `aria-describedby` pointing at the step's line, focus, computed border style). Covers `/catalog/stage/`, `/catalog/stage/?lang=pt-BR` and `/rsa-from-scratch/` (its two typed Stages), light and dark, so "Typed input", "Refusing a number", "Code, mid-run" and "A table that grows" included. The two `record.json` files are byte-identical and all 512 PNGs hash the same; no page errors.

**Decisions:**

- The definitions go on the form as one JSON list (`data-fields`), next to `data-examples`, rather than per input: one place on the page holds the fields, as one holds the examples, and `stageFields` reads it for the page and the check alike.
- The definition carries `kind: "number"` though the props don't: a field without `kind` is a number field, and the page's definition says so explicitly so the page, the Stage and `build-input` don't each infer it. 02 adds `"text"`.
- `typedNumber` stays a separate step before `fieldProblem` on the page, rather than taking the field: reading by kind has one caller kind today, so a field parameter would be speculative; 02 adds the text reading beside it.
- The page's refusal names the field from the definition (`label ?? name`) instead of the label's `span` text. They are the same text by construction; no catalog or sample field has a `label`, so the browser check exercised the name path, and the fixture `maximo-divisor`'s labelled field is covered by the built-page test.

**Shared parts:** none of `CODING_STANDARDS.md`'s shared parts changed. The change stays inside the Stage (`Stage.astro`, `stage-element.ts`, `step-applier.ts`) and reaches every Stage with `input`; the catalog and sample checks above cover them.

**Left undone:** nothing. Notes left on 02, 03, 04 and [Stage choice groups 02](../../stage-choice-groups/issues/02-a-stage-takes-two-or-more-choice-groups.md).
