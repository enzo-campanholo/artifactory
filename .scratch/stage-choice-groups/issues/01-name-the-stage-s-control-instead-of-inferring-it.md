# 01: Name the Stage's control instead of inferring it from the input's type

Status: resolved
Blocked by: None (can start immediately)

Spec: [Stage choice groups](../spec.md). A prefactor: no behaviour changes.

**What to build:** today the Stage, its step applier and the check tell a Stage with `choose` from one with `input` by whether the build's input is text. A choice-group run hands the build a record of names to options, which isn't text, so every one of those places would take it for typed input. Make which control a Stage has, `choose` or `input`, something the page and the check carry and pass along, and make what `steps` must take an explicit shape (text, or named values each of a given kind), so [02](02-a-stage-takes-two-or-more-choice-groups.md) adds the list form without a new branch in each place. [Stage text input](../../stage-text-input/spec.md), which widens typed input to text values, meets the same inference and gains from this too.

The places that infer it today:

- the step applier's rule that a run with `input` gives `body` on every step once it gives it on one (a run with `choose` may leave it out to show the starting state);
- the page's refusal lines, which pick "Choose another option." or "Try other numbers." by the input's type;
- the check's naming of a run in its `stage-run` lines (`B`, or `a = 48, b = 18` in the fields' order);
- `build-input`'s expectation: text with `choose`, the fields' names each a `number` with `input`.

Stays inside the Stage, its step applier and the check; it reaches no shared part `CODING_STANDARDS.md` lists.

- [x] The step applier's `body` rule, the page's refusal wording, the check's run naming and `build-input`'s expectation each follow the Stage's control as given, not the type of the input value.
- [x] What `steps` must take is stated as one shape, text or named values each with its kind, which `build-input` compares against and from which it words its message.
- [x] Every existing `tests/check` case passes unchanged, the `build-input` and `stage-run` failure lines and the `pnpm look` Stage cases included; no test is added or rewritten for the refactor.
- [x] The catalog's Stage page still runs, refuses and steps as before, a `choose` Stage and a typed one both, checked in a browser as the agent docs' browser verification says.
- [x] No doc comment, `COMPONENTS.md` or `artifact` skill text changes, since nothing an agent or `pnpm check` reports changes.

## Comments

### 2026-11-09: resolved

**Result:** `<artifact-stage>` carries `data-control` (`choose` or `input`), written by `Stage.astro`. `stageControl(stage)` in `step-applier.ts`, shared by the page and the check, reads it and states what `steps` takes as `Takes`: `{ shape: "text" }`, or `{ shape: "named", values: [{ name, kind }] }`, every kind `"number"` today. Each of the four places now follows them:

- **The `body` rule:** `runBuild(build, control, input, …)` applies it only when `control === "input"`.
- **The page's refusal lines:** `stage-element.ts` keys "Choose another option." and "Try other numbers." (too many, failed, and the retry after a fault) by control, as `texts.refused[control]`.
- **The check's run naming:** `named(input, takes)` in `custom-build-runs.ts`. The check also takes its inputs (options or `data-examples`) and the first-example comparison from the control, and passes the control to the build runner.
- **`build-input`:** compares the build's type against `takes`, checks each named value's kind through `kindFlags`, and words the expected type from it, `{ a: number; b: number }`. The noun in the message ("options", "fields") comes from the control.

**Commits:** c722941 (claim), 9160f59 (the refactor), the merge of the integration tip (machine trace 05, no conflicts), and this closing commit.

**Validation:**
- No test was added or changed. The full `pnpm check` on the final HEAD passed: every existing `tests/check` case, the `build-input` and `stage-run` lines and the look cases included.
- I built the integration tip in a detached baseline worktree, then stepped every Stage on `/catalog/stage/` (en and pt-BR) and `/rsa-from-scratch/` from its first option or example to its last step, light and dark, with the shared capture script. The two `record.json` files are identical (336 steps), and so are all 336 PNGs.
- A refusal probe compared baseline and branch on `/catalog/stage/`, `/catalog/mepa/` (en and pt-BR) and the sample: a copy of each Stage whose build can't load (the "couldn't be worked out" line, `choose` and typed), collatz 27 (more than 200 steps) and a refused number. The probe found the same lines word for word and no page errors. The only difference is the new attribute. The fault refusal wasn't triggered, but it shares the retry line the probe checked.

**Decisions:**
- The page carries the control as one attribute. It doesn't carry the shape: `stageControl` derives the shape from the control and the fields on the page, so field names aren't written twice. Stage text input 01 puts each field's definition on the page once and can feed `kind` from it.
- `NamedValue["kind"]` holds only `"number"` until 02 and Stage text input need `"string"`, with no speculative kinds.
- `scripts/look.ts` still tells the controls apart by whether a field exists. The ticket didn't list it, and 03 reworks that code, so 03 got a note.

**Shared parts:** none of `CODING_STANDARDS.md`'s shared parts changed. The change stays inside the Stage (`Stage.astro`, `stage-element.ts`, `step-applier.ts`) and the check. No doc comment, `COMPONENTS.md`, `DESIGN.md` or `artifact` skill text changed.

**Left undone:** nothing. Notes are on [02](02-a-stage-takes-two-or-more-choice-groups.md), [03](03-look-shoots-the-first-option-of-every-group.md) and [Stage text input 01](../../stage-text-input/issues/01-one-rule-per-stage-field.md).
