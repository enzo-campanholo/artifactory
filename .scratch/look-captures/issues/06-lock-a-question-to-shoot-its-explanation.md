# 06: Lock a question to shoot its explanation

Status: resolved
Blocked by: 03 (Reveal a model answer to shoot what it holds); [Question explanations 02](../../question-explanations/issues/02-single-choice-explanation.md); [Question explanations 03](../../question-explanations/issues/03-numeric-question-explanation.md); [Content types 05](../../content-types/issues/05-matching-explanation.md)

Spec: [What `pnpm look` captures](../spec.md) › Content behind a hidden part

**What to build:** an agent who puts a drawing in a question's explanation sees it rendered in look's shots. To reveal an explanation the way the owner would, look locks the question. In `SingleChoice` it picks the first option and checks it. In `NumericQuestion` it submits a number. In a `Matching` ([Content types](../../content-types/spec.md)), whose explanation shows once its last item locks, it picks the first option for every item and checks the set, the same reveal as a `SingleChoice`'s. A right answer and a wrong one both show the explanation. Look waits for the question to come alive first, since a question stays inert until the store starts. Then it shoots each item in the explanation alone, as ticket 03 does for a model answer: every step of a Stepper, and a Stage as written and at its first option or example.

The lock happens on the build's throwaway state, so it never reaches the owner's answers. The question stays locked afterwards, because only "start over" undoes a lock, and later shots don't depend on it. The item's line names its location in place of a number: `… (inside the explanation of Questão 4)`, with the question's name read from the accessibility tree as in ticket 03; a matching is named by its header as the page shows it (`… (inside the explanation of Questões 3–5)`). Once ticket 04's failure rule is in, an item still unrendered after the lock fails the case as it says.

- [x] An item inside a `SingleChoice` explanation is shot once look has locked the question with its first option. An item inside a `NumericQuestion` explanation is shot once look has submitted a number. An item inside a matching's explanation is shot once look has chosen the first option for every item and checked the set.
- [x] The lock runs on throwaway state and saves nothing anywhere, and the question stays locked.
- [x] The item's printed line and its `results.json` entry name its location (`inside the explanation of <question name and number>`).
- [x] Seam 1 test, a new opt-in Look fixture: a figure inside a `SingleChoice` explanation and one inside a matching's explanation are each shot once the question or the set locks (exit 0, their captures at both widths, their locations printed).
- [x] In the same commit, the `artifact` skill's **Look** section adds explanations next to model answers in what's shot, and `stage.md` › **Look**'s reveal line covers "a model answer or explanation".

## Comments

### 2026-11-09: where ticket 04 put the failure rule

Implementer of [ticket 04](04-fail-on-an-item-look-cant-shoot.md#comments). In `scripts/look.ts`, `shootRevealed` checks an item is rendered (`checkVisibility()`, a sized box) inside a local `shootRendered(after)`, after the model answer opens and before `kinds[item.kind].shoot`. An unrendered item comes back as `{ problem }`, and the loop passes it to `couldNotShoot`, which fails the case without stopping it. For an explanation, lock the question first, then call `shootRendered(" after its reveal")` (or a wording that names the lock), so an item still unrendered after the lock fails the same way. `place` comes from `item.modelAnswer?.location`, so an explanation's location needs its own place in `Item` or a more general field.

### 2026-11-09: from Question explanations 02

Implementer of [Question explanations 02](../../question-explanations/issues/02-single-choice-explanation.md#comments). A `SingleChoice`'s explanation is `.question-explanation` (after the question's `<fieldset>`, holding `.question-revealed`) and stays `hidden` until the question's `data-status` is `saved` or `answered-elsewhere`. On the build's throwaway state, a check moves to `saving` first and to `saved` a moment later, so wait for `hidden` to go, not just for the click. The option inputs are `input[type=radio]` inside the `<fieldset>`, and Check is `.question-check`, which stays `aria-disabled="true"` until an option is chosen with an `input` event.

### 2026-11-09: from Question explanations 03

Implementer of [Question explanations 03](../../question-explanations/issues/03-numeric-question-explanation.md#comments). A `NumericQuestion`'s explanation is the same `.question-explanation` after the `<fieldset>`, shown by the same element code, so the wait for `hidden` to go that 02 describes holds unchanged. Its field is `input#q-<id>--field` inside `.numeric-question-answer`; set its value and dispatch an `input` event (bubbling) so `.question-check` loses `aria-disabled`. Submit any plain number, such as `0`: input that isn't a number (`π`, `1.000,5`) is refused with a validation message, saves nothing and never locks, so look would wait forever. A wrong number also adds the right-answer line before the explanation; that line is no shootable item.

### 2026-11-09: from Content types 05

Implementer of [Content types 05](../../content-types/issues/05-matching-explanation.md#comments). A matching's explanation is the same `.question-explanation` (holding `.question-revealed`) as `artifact-matching > form > .question-explanation`, after the `<fieldset>` that holds the item rows. The box shows it in its own code (`matching-element.ts`), once every item row (`[data-question-id]`) has `data-status` `saved` or `answered-elsewhere`, so wait for `hidden` to go, as 02 says; the box's own `data-status` is not the signal, since it is `answered-elsewhere` while only some rows are. Each row's choices are `input[type=radio]` named `q-<item id>`; pick `input[value="1"]` in every row and dispatch a bubbling `input` event, and `.question-check` loses `aria-disabled` once every open row has a choice. The box's name is its header, `.question-number` (`aria-labelledby` points at it), which reads its items' range, such as "Questions 3–5" / "Questões 3–5". The catalog's questions page now has a matching with an explanation (a paragraph and a bulleted list, no figure), and the `derivadas` fixture in `tests/check/library-and-question-manifest.test.ts` has one in pt-BR.

### 2026-11-09: from Question explanations 04

Implementer of [Question explanations 04](../../question-explanations/issues/04-unnumbered-figures-in-questions.md#comments). A figure, diagram or Stage inside a `.question-revealed` part now has no number: its `.figure-number` is `display: none`, so `numberOf` would read "" for it; name it by its location as the ticket says. An uncaptioned one hides its whole `figcaption` (`figcaption[data-uncaptioned]`). The catalog's questions page now has a figure in the `SingleChoice`'s explanation, a diagram in the `NumericQuestion`'s and an uncaptioned figure in the matching's.

### 2026-11-09: resolved

Implementer of this ticket. Result: `pnpm look` reveals an item inside a question's explanation by locking the question, then shoots it alone like any other item, named `… (inside the explanation of Question N)` or, in a matching, `… (inside the explanation of Questions 3–5)` from the header the page shows.

- **Commits:** `2ff1e8b` (claim), `47b658c` (lock, its seam 1 test, the `artifact` skill's **Look**, `stage.md` › **Look** and `docs/agents/test-seams.md`), and this closing commit.
- **Validation:** the new opt-in fixture `look-explanation` (`tests/check/browser-verification.test.ts` › "opt-in Look explanation evidence") failed first with every explanation figure unrendered, then passed: two figures in one `SingleChoice` explanation, one in a `NumericQuestion`'s and one in a matching's, each captured at 393 and 1920 px with its location printed and in `results.json`, exit 0. Every opt-in Look test passed with it (11), and I opened the captures: each shows its figure alone. Full `pnpm check` gate on the merged HEAD.
- **Decisions:**
  - `Item.modelAnswer` became `hiddenIn`, a model answer or an explanation, and the location reads `inside the <part> of <question name>` for both, the name from the question box's `.question-number` (a matching's header included).
  - One lock for every kind: in the question box, the first radio of each radio group is checked (a `SingleChoice`'s first option, or every matching item's first option), any `.numeric-question-answer` field is set to `0`, each with a bubbling `input` event, then Check is clicked in the page. `0` because input that isn't a plain number never locks (Question explanations 03).
  - Look waits for the box to stop being `inert` (the store started) before answering, and for the explanation to lose `hidden` after Check. Both waits end quietly on a timeout, so an explanation that never shows fails its item through ticket 04's rule as `not rendered after its question locked (…)`.
  - A later item in an already shown explanation doesn't lock again; the question stays locked.
  - "Saves nothing anywhere" is asserted per lock as `<item>: the lock saved nothing` (the page's `localStorage` and `sessionStorage` keys before and after the lock), and look now builds with `PUBLIC_STATE_TRANSPORT` emptied, so a shell set up for the deploy build still gets throwaway state.
  - `docs/agents/test-seams.md`'s seam 1 Look line now lists the explanation reveal.
- **Shared parts:** none reached; the change stays in `scripts/look.ts`, its tests and docs.
- **Left undone:** nothing.
