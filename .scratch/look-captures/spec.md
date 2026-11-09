# What `pnpm look` captures

Source: [What `pnpm look` captures](../artifact-generation-gaps/issues/11-what-pnpm-look-captures.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them. The facts it builds on are in [Find out what `pnpm look` misses](../artifact-generation-gaps/issues/07-find-out-what-pnpm-look-misses.md).

## Problem

Agents writing study artifacts couldn't see some of what they had to judge, and sometimes got a shot of the wrong thing:

- look's selector (`scripts/look.ts`) only takes Steppers with `.stepper-boards` or `.stepper-figure`, so a code Stepper is skipped, and look doesn't say so. A stack-machine artifact's line-by-line Stepper was never seen rendered.
- A figure inside a closed model answer isn't rendered but still has a client rect, so look shoots whatever is painted there and prints the hidden figure's `alt` above it. The outcome is `captured-awaiting-visual-review`. A graph-colouring agent moved its solution drawing out of the model answer to see it.
- At 393 px the fixed bottom bar can show up in an element shot, depending on the timing of look's clicks and scroll restores. An intermediate-code agent reordered its Stepper to avoid an overlap that isn't a page bug.

## Behaviour

### What look shoots

- Look shoots drawings and anything that steps: every `Diagram`, every `Figure`, every `Stepper` and every `Stage` in `main`, at 393 px and 1920 px, in the light theme, on screen.
- **Every Stepper form is shot at every step:** figure and D2 Steppers as today, a one-block code Stepper (`lines`), and a Stepper with one code block per step ([Code display](../code-display/spec.md)). Look clicks forward between steps and names files `NN-stepper-step-K-<width>.png`, as it does for figure Steppers. A code Stepper has no `alt`, so look prints its caption in place of the `alt`, as it already does for a Stage without a drawing.
- **Not shot:** plain code blocks (with `start=N` or `{…}` marks or not), tables and questions. Everything that can go wrong in them can be read from the source or is caught by `pnpm check`.
- Look selects broadly, by element (`artifact-stepper`, `artifact-stage`, `figure.diagram`, `figure.figure` in `main`), not by what a Stepper contains, so a new Stepper form can't drop out of the shots without a word.

### Content behind a hidden part

- An item inside a part of a question the owner reveals is revealed the way the owner would reveal it, then shot alone, exactly as anywhere else: every step of a Stepper, and a Stage's first option or example.
  - **Inside a model answer:** look opens the model answer's `<details>`, shoots the item, then closes it.
  - **Inside an explanation** ([Question explanations](../question-explanations/spec.md)): look locks the question first, with its first option in `SingleChoice`, or by submitting a number in `NumericQuestion`. A right or wrong answer both show the explanation. This runs on the build's throwaway state and never touches the owner's answers. The question stays locked afterwards: only "start over" undoes the lock, and later shots don't depend on it.
- An item inside a question is unnumbered (Question explanations), so in place of a number its line names where it sits: the question's number, read from the accessibility tree as figure numbers are (`03-figure (inside the model answer of Questão 2)`, `… (inside the explanation of Questão 4)`), in the artifact's main language.

### The item alone

- For the length of every element shot, look hides each layer outside the item whose computed `position` is `fixed` or `sticky` (today the bottom bar, the state notice band and the rail), then restores them. It finds them by computed style, not by class name, so a new fixed layer can't get back into the shots.
- Look doesn't check overlaps. An overlap in a shot is a look bug, not something to fix in the artifact.

### Never a silent skip, never a shot of the wrong thing

- Look fails the case, with an assertion naming the item (its number or location, its kind, and its `alt` or caption), for any item it selected but can't shoot. That covers a Stepper form it doesn't know, and an item still not rendered after its reveal (`checkVisibility()` false, or a zero-size box). It never shoots such an item.
- A failed case makes `pnpm look` exit 1, as today, so it's never mistaken for `captured-awaiting-visual-review`.
- Look prints no separate "found but not shot" list: under these rules, the only item found but not shot is a failure.
- With nothing to shoot, look's last line says the artifact "has nothing for look to shoot", not "has no diagrams or figures", because code Steppers now count too.

## Sequencing

Look's whole behaviour lives in this spec, but two parts depend on features not built yet:

- The explanation reveal waits on [Question explanations](../question-explanations/spec.md).
- Shooting a Stepper with one code block per step waits on [Code display](../code-display/spec.md)'s Stepper form.

`/to-tickets` blocks each of these on the ticket that builds its feature. The broad selection, one-block code Steppers, the model-answer reveal, the hidden fixed layers and the failure rule don't wait.

## Documentation

- `.claude/skills/artifact/SKILL.md` › **Look**, rewritten to say:
  - **What's shot:** every `Diagram`, `Figure`, `Stepper` (figure, D2 or code, at every step) and `Stage`, items inside a model answer or explanation included. Look reveals those as the owner would and labels them with the question's number.
  - **What isn't shot, and what checks it instead:** plain code blocks, tables and questions (the source and `pnpm check`), and dark mode and print (the design system's catalog).
  - **Each shot is the item alone,** with the bar and the notices hidden. A bar in a shot is a look bug to report, not something to fix in the artifact.
  - **A failed case names the items look found but couldn't shoot.** Fix the item, or report a look bug if the item is fine. Never move content just to get it shot.
- `.claude/skills/artifact/stage.md` › **Look**: one line saying a Stage inside a model answer or explanation is revealed first.
- `docs/agents/test-seams.md` keeps "How diagrams and figures look (agents use `pnpm look`)" in what no seam tests. What look shoots and fails on is tested at seam 1 (below), but whether a shot reads well stays a person's judgement.

`CODING_STANDARDS.md` requires the skill change in the same commit as the look change it describes.

## Tests

At seam 1 only, extending the fixtures `tests/check/browser-verification.test.ts` already runs `pnpm look` against. Each asserts on look's exit code, its printed lines and `results.json`:

- A one-block code Stepper is shot at every step, with its caption printed.
- A Stepper with one code block per step is shot at every step (with Code display).
- A figure inside a model answer is shot revealed, labelled with its question, and the model answer is closed afterwards.
- A figure inside an explanation is shot once the question locks (with Question explanations).
- At 393 px, with the bar slid in (owner input, then a scroll up), the bar is hidden for every shot of a Stepper whose bottom sits under it, and shown again afterwards.
- An item that stays unrendered fails the case and exits 1, naming the item.

## Naming

`GLOSSARY.md` gains no entry: look is repo tooling, and "model answer", "explanation" and "Stepper" are already glossary or component vocabulary. No ADR: every decision here is cheap to reverse.

## Out of scope

- Shooting dark mode or print. Printed Steppers fixes print in the design system, and the catalog is where both are checked.
- Shooting plain code blocks, tables or questions.
- Checking fixed layers for overlap instead of hiding them.
- Shooting every option or example of a Stage: `pnpm check` runs them, as today.
