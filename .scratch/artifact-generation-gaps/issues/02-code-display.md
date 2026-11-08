# 02: Code display

Type: grilling

## Question

What should code blocks, code Steppers and code inside figures be able to do that they can't today?

## What the agents reported

- **Line numbers always start at 1.** A stack-machine artifact's program addresses start at 0, so its listing shows two numbers per line, and a sentence explains the difference. In two graph artifacts, the line numbers the briefs wrote were removed and every reference to a line shifted by one.
- **A plain code block can't highlight lines, and a `lines` Stepper can't change the code between steps.** A code-optimisation artifact needed to show the code being rewritten step by step, so it redrew all the code as an SVG Figure Stepper, with an ink bar marking the changed line.
- **The code font can't be used in an SVG figure,** so that redrawn code is set in the heading face.

## To decide

- A starting number for line numbers, or a way to turn them off, or code-provided labels (addresses)?
- Highlighted lines in a static block?
- A code Stepper whose code changes from step to step, versus documenting the SVG workaround.
- A class that sets figure text in the code face.
