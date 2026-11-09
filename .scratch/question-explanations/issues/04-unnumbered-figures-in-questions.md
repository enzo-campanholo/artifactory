# 04: Figures inside a model answer or an explanation are unnumbered

Status: ready-for-agent
Blocked by: 02

Spec: [Question explanations](../spec.md), section Figures inside a question. The decisions are in the map ticket's `## Answer` (`artifact-generation-gaps` 01); don't reopen them. Needs 02 only so that a figure inside an explanation can be shown; it can run beside 03.

**What to build:** A `Figure`, a `Diagram` or a `Stage` (which is numbered on the figures' series) inside a question's revealed part, a model answer or an explanation, shows no number and keeps its caption: no "Figura" label and no gap where a number would be. Equations inside a question are already unnumbered, so the rule is now the same for both. A figure in a question's prompt stays numbered on its section's series, as today. The figure and diagram counters skip every question's revealed parts on screen and in print alike, whether they are closed, open or hidden, so opening a model answer or locking an answer never renumbers the figures after the question, and a hidden figure never leaves a gap in the series ("Figura 3.1", "Figura 3.3"). Key the rule on the revealed part from 01, so that any revealed part a question gains later is covered too.

Design-system work: run it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] A figure, a diagram and a Stage inside a model answer or an explanation show their caption without number or label, and one with no caption leaves no empty caption line; screen readers hear no number for them.
- [ ] A figure in a question's prompt keeps its number on its section's series.
- [ ] The first numbered figure after a question with a figure in its model answer or explanation carries the same number with the model answer closed and open, the question unanswered and locked, on screen and in print.
- [ ] `DESIGN.md` › Questions says a figure inside a model answer or explanation is unnumbered and keeps its caption, and › Numbering's paragraph ("The page numbers everything with CSS counters…") names the exception.
- [ ] `OpenQuestion`'s and `Figure`'s doc comments say a figure in a model answer or explanation is unnumbered; `pnpm components` regenerates `COMPONENTS.md`.
- [ ] The `artifact` skill, in the same commit: its line on what the page numbers ("Write paragraphs that can be cited") says a figure inside a model answer or explanation is unnumbered, so an agent never cites one by number.
- [ ] The catalog's questions page shows an `OpenQuestion` whose model answer holds a figure, a figure inside the `SingleChoice`'s or `NumericQuestion`'s explanation, and a numbered figure after those questions, checked closed and open, unanswered, right and wrong, in both languages and in print.
- [ ] Shared parts: the figure counter in the artifact page's frame reaches `Figure`, `Diagram`, `Stage` and `Stepper` figures; check a numbered figure and a numbered diagram elsewhere on the catalog (the components page) keep their numbers, with the same evidence. If `figure.css` or `SvgImage.astro` change, they reach `Figure`, `Diagram` and `Stage`: check each on its catalog page.
- [ ] Figure numbers are CSS and not tested automatically (`docs/agents/test-seams.md` › Not tested automatically): the evidence is the catalog captures above, and no test is added.

## Comments

### 2026-11-09: from 01

Implementer of [01](01-question-revealed-part.md#comments). Key the rule on `.question-revealed` (`design-system/src/RevealedPart.astro`): it wraps the model answer today and every explanation 02 and 03 add, open, closed or hidden alike. The model answer's part sits inside its closed `<details>`, so CSS on it can't count what the browser doesn't render; skip the counters there with `counter-increment: none` on the figures inside it, not by counting.
