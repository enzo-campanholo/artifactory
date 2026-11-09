# Artifact generation gaps

Type: map

## Destination

A spec in `.scratch/<feature-slug>/spec.md` for each group of gaps below, ready for `/to-tickets`. Nothing is built inside this map. For a gap whose behaviour turns out to be deliberate, "keep it and document the workaround in `design-system/COMPONENTS.md` or the `artifact` skill" counts as a resolution, just as a design change does.

## Notes

- **Origin:** between 2026-10-29 and 2026-11-05, the agents that wrote study artifacts in the owner's private copy reported gaps in their final reports: places where the design system, `pnpm look` or the workflow made them drop, approximate or work around something the brief asked for. The owner judged every gap worth fixing. Each ticket restates the gaps it covers and what the agents did instead.
- **Public repo:** name only public artifacts here. The private artifacts the gaps came from are described by subject only ("a graph-colouring artifact").
- **Skills:** every grilling ticket calls the Skill tool for `grilling` and `domain-modeling`. Before deciding anything about the design system, read `CODING_STANDARDS.md`, `design-system/CLAUDE.md`, `design-system/DESIGN.md` and `design-system/COMPONENTS.md`. Name concepts as `GLOSSARY.md` does.
- **ADRs in play:** [0001](../../docs/adr/0001-artifact-state-stores-answers-only.md) (artifact state stores answers only) and [0007](../../docs/adr/0007-artifacts-contain-content-data-and-staged-behaviour.md) (custom builds inside a Stage, and the proposal to promote a build at the second need). Say so explicitly when a decision contradicts one.

## Decisions so far

<!-- one line per resolved ticket: [title](issues/NN-slug.md): gist -->

- [Question explanations](issues/01-question-explanations.md): one optional explanation per auto-checked question, after `---`, shown once the answer locks, right or wrong, never stored; figures in a model answer or explanation stay unnumbered. Spec: [Question explanations](../question-explanations/spec.md).
- [Code display](issues/02-code-display.md): fences take `start=N` and a `{…}` line highlight, every line reference counts the shown number, a Stepper can hold one code block per step, and `font-code` sets SVG text in the code face. Spec: [Code display](../code-display/spec.md).
- [Stage controls and drawing](issues/03-stage-controls-and-drawing.md): `choose` takes several named choice groups, and the run starts once each has a choice. A per-run drawn structure is "not yet" under ADR 0007, the four marks stay (static figures use the Stage's mark), and `say` stays one text for eye and ear. Spec: [Stage choice groups](../stage-choice-groups/spec.md).
- [Machine-trace component](issues/04-machine-trace-component.md): promote now, generally. A subject-neutral machine trace runs machine definitions from the design system inside the Stage (MEPA first, ADR 0008), the Stage hands builds their content so a program is written once, and narration comes in both languages. Spec: [Machine trace](../machine-trace/spec.md).
- [Content types](issues/05-content-types.md): `Statement` gains `proposition`, a claim, and nothing else (asides stay in `Note`). A matching is a set of auto-checked questions, one per item, sharing one lettered option list and one Check, so artifact state and scoring don't change. Spec: [Content types](../content-types/spec.md).
- [Colour where colour is the subject](issues/06-colour-where-colour-is-the-subject.md): the One Ink Rule stands. A colouring is drawn with swatches: six ink hatchings, with ground as uncoloured, and every coloured part's label names its colour (edges by label alone). Steps can colour parts, all four marks still apply, no legend, not in D2 (ADR 0009). Spec: [Swatches](../swatches/spec.md).

- [Find out what `pnpm look` misses](issues/07-find-out-what-pnpm-look-misses.md): look's selector skips code Steppers without a word. A figure inside a closed model answer is shot at its unrendered rect, so the shot shows something else under the figure's `alt`. The 393 px bar overlap is a look artifact that depends on timing (look's scroll back up after a shot shows the fixed bar), not a page bug: on a phone the bar covers content only after the reader scrolls up, as designed. What to change goes to [What `pnpm look` captures](issues/11-what-pnpm-look-captures.md).
- [Printed Steppers](issues/08-printed-steppers.md): the drawing decides. A figure whose parts all stay to the last step prints once, at that step, with its captions, as today. A figure with a part that leaves prints every step under "N." and its caption, in the full frame. The reported code rewrite is Code display's. Spec: [Printed Steppers](../printed-steppers/spec.md).
- [Agent workflow in a private copy](issues/09-agent-workflow-in-a-private-copy.md): the skill sets `gh`'s default repo to `origin` in a private copy, a delegator accepts a child's check only on `current` local evidence, CI's Probe stays the only deploy confirmation ("pushed, deploy unverified" otherwise), and the Reply step tells an unset domain from an unreadable one. Spec: [Private copy workflow](../private-copy-workflow/spec.md).
- [Typed words in a Stage](issues/10-typed-words-in-a-stage.md): a text field is a `kind: "text"` field in `input.fields`, mixing with number fields, with an optional one-code-point `alphabet`, `maxLength` (required) and `minLength` (default 0, so ε counts). It is set in the code face, refused with its whole rule and never truncated, and shown bare (`ε` when empty) in print. Supersedes Stage controls and drawing's "whole numbers only". Spec: [Stage text input](../stage-text-input/spec.md).
- [What `pnpm look` captures](issues/11-what-pnpm-look-captures.md): look shoots every `Diagram`, `Figure`, `Stepper` (code Steppers included, every step) and `Stage`, never plain code, tables or questions. It reveals an item inside a model answer or explanation as the owner would, hides fixed and sticky layers during each shot, and fails the case on anything it selected but can't shoot. Spec: [What `pnpm look` captures](../look-captures/spec.md).

## Not yet specified

Nothing right now.

## Out of scope

- **Definitions for machines other than MEPA** (register machine, JVM-style, three-address code, Turing machine, finite automaton). Each joins the design system by proposal when an artifact needs it, beyond this map's specs. [Machine trace](../machine-trace/spec.md)'s paper check shows they fit.
- **Statement kinds beyond the proposition** (remark, notation, axiom, conjecture). Each joins by proposal when an artifact needs it; [Content types](issues/05-content-types.md) sends asides to `Note`.
- **Hue as the subject's fact** (optics, colour models, flame tests). It would need a new rule, not swatches, and joins by proposal when an artifact needs it. See [Colour where colour is the subject](issues/06-colour-where-colour-is-the-subject.md).
- **The private copy's GitHub token can't read Actions, checks, statuses or variables (HTTP 403 since about 2026-11-01).** This is a setting in the owner's account, not a platform decision. The owner fixes it directly, and reports it fixed on 2026-11-08.
- **Renaming the Stage's `input.examples`.** The word clashes with the glossary's **Example** (a statement), but renaming a shipped prop across the design system, the skill and the private copy is its own change, and no spec here depends on it. Raised in [Typed words in a Stage](issues/10-typed-words-in-a-stage.md).
- **Look shooting dark mode or print.** Nobody reported a gap there. Printed Steppers fixes print in the design system, and the catalog checks both. See [What `pnpm look` captures](issues/11-what-pnpm-look-captures.md).
- **Leftover agent worktrees and briefs in the private copy.** Housekeeping, already done on 2026-11-08.
