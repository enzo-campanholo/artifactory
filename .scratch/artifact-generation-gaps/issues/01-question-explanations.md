# 01: Question explanations

Type: grilling

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
