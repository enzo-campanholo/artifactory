# 03: Reveal a model answer to shoot what it holds

Status: resolved
Blocked by: 02 (Shoot one-block code Steppers at every step)

Spec: [What `pnpm look` captures](../spec.md) › Content behind a hidden part

**What to build:** an agent who puts a drawing in an `OpenQuestion`'s model answer sees it rendered in look's shots, and no longer moves it out of the model answer to see it. For each item inside a model answer, look opens the model answer's `<details>` and shoots the item alone, exactly as it would anywhere else: a Stepper at every step, a Stage as written and then at its first option or example. Then look closes the model answer again.

An item inside a question is unnumbered, so the item's line names where it sits in place of a number. Look reads the question's number from the accessibility tree, as it reads figure numbers, so the name comes in the artifact's main language: `03-figure (inside the model answer of Questão 2)`, or `… of Question 2` in an English artifact. `results.json` records the same location.

Ticket 04's failure rule comes after this ticket and runs after the reveal: it fails the case for an item still unrendered once revealed.

Notes:

- The model answer's summary stays disabled until an answer is written, so look opens the `<details>` itself. This happens on the build's throwaway state and saves nothing. The question's text field becomes read-only when the model answer opens and stays read-only after it closes. Later shots don't depend on that field.
- Until [Question explanations](../../question-explanations/spec.md) makes figures inside questions unnumbered, an opened figure's caption may show a number in the shot. Look's label comes from the location, not from that caption.

- [x] An item inside a model answer is revealed, then shot alone at both widths: every step of a Stepper, and a Stage as written and at its first option or example.
- [x] Its printed line and its `results.json` entry name its location (`inside the model answer of <question name and number, as the page shows it>`) in place of a number.
- [x] Once the item's shots are done, the model answer is closed again, and `results.json` holds an assertion saying so.
- [x] Seam 1 test, a new opt-in Look fixture: a figure inside a model answer is shot revealed (exit 0, its captures at both widths, outcome `captured-awaiting-visual-review`). The printed line names its question, and the model answer is closed afterwards.
- [x] In the same commit, the `artifact` skill's **Look** section says items inside a model answer are shot: look reveals them as the owner would and labels them with the question's number. `stage.md` › **Look** gains one line saying a Stage inside a model answer is revealed first.

## Comments

### 2026-11-08: where the reveal goes, from tickets 01 and 02

Delegator, copied from [ticket 02's comment](02-shoot-one-block-code-steppers-at-every-step.md#comments). The reveal goes around `kinds[item.kind].shoot(…)` in look's main loop. `item.element` is the element shot (a Stage's frame, not `artifact-stage`), so `item.element.closest("details")` finds the model answer for every kind. Ticket 05's hiding of fixed and sticky layers sits inside `shoot`, so a revealed item passes through it too.

### 2026-11-09: implemented, awaiting review

Result: `scripts/look.ts` reveals a model answer before shooting what it holds. `resolveItem` looks up `item.element.closest("details.question-model-answer")`. When it finds one, it reads the question's `.question-number` from the accessibility tree (the same read as figure numbers, now `accessibleText`, so the label comes in the page's language) and gives the item a `modelAnswer` with its `<details>` and its location, `inside the model answer of Question 2`. In the main loop, `shootRevealed` wraps `kinds[item.kind].shoot(…)`: it sets the `<details>` open, waits for its `toggle` (so the question's own toggle handler has made the text field read-only before any shot), shoots the item exactly as anywhere else, sets it closed again and waits for that `toggle`. Then it asserts `<name>: model answer closed again` (expected `false`) into the case. The printed line puts the location where a number goes (`01-figure (inside the model answer of Question 2): <alt>`). The item's `results.json` entry in `observed.figures` has a `location` key in place of `number`. The question's text field stays read-only after the close, as the ticket's notes allow. Nothing is saved: the reveal only toggles `open` on the build's throwaway state.

The `artifact` skill's **Look** section now says items inside an `OpenQuestion`'s model answer are shot: look opens it as the owner would, shoots each item alone, closes it, prints the location in place of a number, and the agent should keep a drawing in the model answer it belongs to. `stage.md` › **Look** has one new line saying a Stage inside a model answer is revealed first. Both are in the same commit as the look change.

Commits: aa695a0 (claim), 005dadf (look, Seam 1 test and skill, one commit), d4454d8 (merge of `gaps-implementation` at 405067a, with ticket 05's hidden fixed layers; the only conflict was both tickets' new describe blocks at the end of `tests/check/browser-verification.test.ts`, kept both), 48a5408 (types the question number's handle as `ElementHandle<Node>`, which the first full check caught).

Validation:

- Seam 1: new opt-in fixture `opt-in Look model answer evidence`. One English artifact holds a `NumericQuestion` and then an `OpenQuestion` with a `Figure` in its model answer. The test asserts exit 0, the printed block `01-figure (inside the model answer of Question 2): Literal circle of radius forty.` with both PNG lines, and, for each case, outcome `captured-awaiting-visual-review`, captures `01-figure-<width>.png`, the passed `model answer closed again` assertion and `observed.figures` holding the location. It failed before the change: look printed `01-figure: Literal circle…` and shot the hidden figure's empty box. It passes after. With ticket 05 merged, all 6 Look fixtures pass (`ARTIFACTORY_BROWSER_ACCEPTANCE=1 … vitest run tests/check/browser-verification.test.ts -t Look`).
- Throwaway artifact, not committed: a `pt-BR` `OpenQuestion` whose model answer holds a one-block code Stepper and a choose Stage. look exited 0 and printed `01-stepper (inside the model answer of Questão 1)` with both steps at both widths, and `02-stage-choose (inside the model answer of Questão 1)` with as-written plus `first option A, 2 steps`. It had 0 failed assertions, and four `closed again` assertions passed. I checked the 393 px Stepper step 2 and the 1920 px Stage step 2 by eye: both rendered, with the right line highlighted and the right step shown. The Stage's caption shows `Figura 1.1`, which the ticket's note expects until Question explanations.
- `pnpm look rsa-from-scratch`: exit 0, the same 7 items as after ticket 02 (the sample has no question with a drawing in it).
- Full `pnpm check` at 48a5408: 0 failures (after `chmod 644 README.md`, as the brief says). An earlier run at d4454d8 failed on the type error above, and every fixture repo's check failed on it too. 48a5408 fixes it.

Left undone: nothing in scope. Ticket 04's notes are on ticket 04.

### 2026-11-09: resolved

Delegator, Artifact generation gaps implementation session. Merged as `d2c58dd`, checked `current` there. The review moved the model-answer reveal rule into `SKILL.md` › Look, with a pointer from `stage.md` › Look in place of the restated line. It was claimed while its `Blocked by:` ticket was still `claimed` rather than `resolved`. The review flagged this against `issue-tracker.md` › Implementation tickets. The blocker had been merged into `gaps-implementation` and had passed the full check there first, so the work was built on finished code. Every ticket in the chain is resolved together here.

- **Review:** a two-axis code review (Standards and Spec) of `gaps-implementation` since `6b935f9`. Its findings were fixed in `c018047`: they are listed on [look captures 05](../../look-captures/issues/05-hide-fixed-and-sticky-layers-during-every-shot.md#comments).
- **Check:** the full `pnpm check` passed on `ac82155`, the integration tip with the review fixes (`check.applicability: current`). All 9 opt-in Look tests passed on `c018047`.
- **Left undone:** nothing.
