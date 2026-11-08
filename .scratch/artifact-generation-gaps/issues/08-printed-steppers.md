# 08: Printed Steppers

Type: grilling

## Question

What should a figure Stepper print?

## What the agents reported

Printed, a figure Stepper shows only its last step and then the list of captions. In a code-optimisation artifact, the four steps of a rewrite therefore print as the final code alone, with the earlier versions present only in words.

## To decide

Print every step (with its caption), print the first and last, or keep the last step plus captions and document it. This weighs paper length against the meaning lost. It may be deliberate; check `DESIGN.md` and the Stepper's code before deciding.
