# Question explanations

Source: [Question explanations](../artifact-generation-gaps/issues/01-question-explanations.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them.

## Problem

`SingleChoice` and `NumericQuestion` have nowhere to put an **explanation** (`GLOSSARY.md`), so agents either dropped the reasons their briefs gave or wrote them in a paragraph after the question, where they give the answer away before the owner answers. In one artifact, two facts lived only in those reasons and were lost. Separately, a figure inside an `OpenQuestion`'s model answer shows no number, and nothing documents whether that is intended.

## Behaviour

### Writing one

- `SingleChoice` and `NumericQuestion` each take an optional explanation: after the question's content (after the options list in `SingleChoice`), a blank line, `---`, a blank line, then the explanation. It can hold what a model answer can: paragraphs, math, code, lists and figures. `OpenQuestion` is unchanged: its model answer already plays this part.
- One explanation per question. Reasons for individual wrong options are written in its prose ("b) confunde …").
- A question with no `---` builds as it does today. A `---` with nothing after it fails the build with a component error naming the component, as `OpenQuestion` does for an empty model answer.

### When it shows

- It shows once the question's answer locks, right or wrong, however the answer got there: checked on this device, or loaded from the device copy or the server. Before that, the page shows nothing of it: no heading, no disabled button.
- Starting over clears the answer and hides the explanation again.
- A visitor's page behaves the same, on throwaway state.
- It is content of the artifact's current version and never artifact state, consistent with [ADR 0001](../../docs/adr/0001-artifact-state-stores-answers-only.md): nothing records that it was seen, and when an agent corrects an explanation, earlier attempts show the corrected text.

### How it looks

- Like an opened model answer (`DESIGN.md` › Questions › Model answer): the explanation sits under a 1px rule, with a caption heading, "Explicação" / "Explanation" in the artifact's main language.
- It comes after everything the lock already shows: after the options, the right one ticked on a wrong answer, in `SingleChoice`; after the "Resposta certa" line on a wrong answer in `NumericQuestion`, or after the locked field on a right one.
- Focus doesn't move when it appears. The status still announces right or wrong, and the explanation is next in reading order.
- Without JavaScript the question is inert and the explanation stays hidden. In print it shows only under a locked answer, as an opened model answer does.

### Figures inside a question

- A figure inside a model answer or an explanation is unnumbered and keeps its caption, and so is a diagram, which shares the figure's numbering rules. Equations inside a question are already unnumbered. Numbering a hidden figure would leave a visible gap in the section's series before the reveal ("Figura 3.1", "Figura 3.3") and would need a count at build time, since CSS can't count what a closed `<details>` hides.
- A figure in a question's prompt stays numbered on its section's series, as today.
- The figure counter must skip the hidden parts on screen and in print alike, so that opening a model answer or locking an answer never renumbers the figures after it.

## Documentation

- `DESIGN.md` › Questions: the explanation's look and when it shows, and the unnumbered figures inside a model answer or explanation; the numbering paragraph ("The page numbers everything with CSS counters…") names the exception.
- The doc comments of `SingleChoice` and `NumericQuestion` (and so `COMPONENTS.md`, via `pnpm components`): how to write the explanation, that it shows once the answer locks, and that it reasons about the answer but never teaches a fact for the first time, since an owner who skips the question never reads it. `OpenQuestion`'s and `Figure`'s doc comments say a figure in a model answer or explanation is unnumbered.
- The `artifact` skill (`.claude/skills/artifact/SKILL.md`, "Ask questions that test understanding"): write an explanation whenever the brief or source material gives a reason for an option or a worked solution for a numeric answer, and put every fact the owner must learn in the text too. Reword "Explanations stay in paragraphs." in "State definitions and results as statements", which uses the word for ordinary prose, so the skill uses **explanation** only in the glossary's sense.
- The catalog's questions page shows each component with an explanation, unanswered, right and wrong, and an `OpenQuestion` whose model answer holds a figure.

## Shared parts

`Question.astro` renders all three question components and `split-at-rule.ts` is shared with `OpenQuestion`, so a change to either reaches `OpenQuestion` too: check its catalog states with the same evidence as the two changed components. The figure counter lives in `ArtifactFrame.astro` and reaches `Figure`, `Diagram`, `Stepper` and `Stage` figures: check a numbered figure after a question in the catalog.

## Out of scope

- One reason per option, shown for the chosen one.
- An explanation on `OpenQuestion`.
- Numbering figures inside questions on any series.

## Comments

### 2026-11-08: owner decisions at ticketing

Owner, /to-tickets review in the Artifact generation gaps session, 2026-11-08, every recommendation accepted. Each bullet amends this spec or fills a gap in it; the tickets in `issues/` carry the detail.

- **When it shows** (02, 03), filling what "locks" means: an explanation shows when the answer is locked in the code's and `DESIGN.md`'s sense, saved or answered elsewhere. It stays hidden while the answer is saving, not saved, or lost to a sign-out, exactly as the right option's tick does. `GLOSSARY.md` › Answer already says this.

### 2026-11-09: owner authorizes the design-system pass

Owner, impeccable-gaps-implementation session, 2026-11-09, the `/implement-spec` request that follows the first implementation pass (thread 3bbd72a3-5eba-484c-95f1-b5d71456b860, which left design-system tickets undone at the owner's choice). This supersedes that deferral for this spec's tickets.

- **Approved:** implementing every unresolved, non-`wontfix` ticket here, design-system work included, through impeccable in a local session (`design-system/CLAUDE.md`); agents decide open implementation questions autonomously without asking, preserving every decision recorded above; and the first pass's and this pass's work are pushed and merged into `main` once the required checks and review pass.
