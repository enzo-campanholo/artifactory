# 07: Find out what `pnpm look` misses

Type: task

## Question

Why does `pnpm look` miss some parts of an artifact, and is the phone-width overlap it showed a real page bug?

## What the agents reported

- **Code-highlight Steppers aren't captured.** In a stack-machine artifact, a Stepper that highlights one line at a time was never seen rendered; only the check passed.
- **Content inside a hidden model answer isn't captured.** A graph-colouring artifact's solution drawing sits inside an `OpenQuestion`'s model answer. To look at it, the agent moved it out temporarily and then moved it back.
- **At 393 px, the sticky bar covered the bottom of a figure Stepper** in the screenshots of an intermediate-code artifact. The agent moved the Stepper's output line above the drawing to work around it. It's unknown whether a real phone shows the same overlap.

## To do (AFK)

Read the look script and run it on the public sample, or on a throwaway fixture artifact that isn't committed, to record: which components it shoots and how, why it skips the two cases above, and whether the sticky-bar overlap reproduces in a real 393 px page scrolled to the figure. Record the facts in the answer. The decision about what look should capture goes to a later ticket ("Not yet specified" on the map).
