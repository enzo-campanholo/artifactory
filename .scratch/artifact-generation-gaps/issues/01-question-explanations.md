# 01: Question explanations

Type: grilling
Status: resolved

## Question

How should an auto-checked question show an explanation once its answer is saved, and what happens to figures inside a hidden model answer?

## What the agents reported

- `SingleChoice` and `NumericQuestion` have nowhere to put an explanation. This came up in six of the seven compilers and graph-theory artifacts. The briefs gave a reason for each wrong option and a worked explanation for each numeric answer. The agents either dropped them or moved them into a paragraph after the question. That paragraph is visible before the owner answers, so it can give the answer away. In one artifact, two facts lived only in explanations and were lost.
- A figure inside an `OpenQuestion`'s model answer gets no figure number. A graph-colouring artifact put its solution drawing there, unnumbered.

## To decide

- One explanation per question, or one per option? Shown only after the answer is saved, and also for a right answer?
- Does an explanation change anything ADR 0001 governs? It must not be stored as artifact state.
- How the explanation reads with no JavaScript and in print.
- Whether figures in a hidden model answer are numbered, and in which series.

## Answer

Decided with the owner on 2026-11-08 (grilling session, rounds 1 and 2, every recommendation accepted). The build is specified in [Question explanations](../../question-explanations/spec.md).

- **Explanation** is the term, added to `GLOSSARY.md`: the reasoning an auto-checked question shows once the owner's answer locks.
- One explanation per question, never one per option; reasons for wrong options go in its prose. It is optional in `SingleChoice` and `NumericQuestion`, written after `---` between blank lines, as `OpenQuestion` separates its model answer.
- It shows on every locked answer, right or wrong, saved on this device or loaded from another, and is absent before then: no disabled button. Starting over hides it again.
- It is content of the artifact's current version, never artifact state, so it is consistent with ADR 0001: nothing records that it was seen, and a corrected explanation shows on earlier attempts.
- Without JavaScript it stays hidden; in print it shows only under a locked answer, as an opened model answer does.
- It reads like an opened model answer: under a 1px rule with a caption heading ("Explicação" / "Explanation"), shown directly, after the ticked right option or the numeric right answer. Focus doesn't move.
- The `artifact` skill and the components' doc comments tell agents to write one whenever the brief or source gives a reason or a worked solution, and that an explanation never teaches a fact for the first time.
- A figure inside a model answer or an explanation is deliberately unnumbered and keeps its caption, as equations inside a question already are; this is documented in `COMPONENTS.md`. Figures in a question's prompt stay numbered. Numbering hidden figures would leave a visible gap before the reveal and need a build-time count.
- No ADR: every part is cheap to reverse.
