# D2 for diagrams, not Mermaid

Systems and process diagrams are written in D2 and rendered at build time. Scientific figures are hand-written SVG coloured with design-system tokens.

Agents know Mermaid best, and it covers more diagram types, but it has three problems for us:

- Rendering it at build time needs headless Chromium in every build.
- It only takes hex colours, so dark mode means rendering each diagram twice.
- Its math depends on the viewer's fonts.

D2 avoids all three:

- It runs without a browser.
- It paints with classes that the design system maps to tokens.
- It has native steps for mechanisms.
- It draws LaTeX into the SVG itself.

In a trial, D2 failed 2 of 10 diagrams on the first compile and Mermaid failed none. Both D2 errors gave a line number, and each was fixed in one or two tries.

## Consequences

- Every artifact's diagrams are D2 source, so switching tools later means rewriting them.
- The build must run the full `d2` compile, because `d2 validate` missed a reserved-word error in the trial.
- Diagram types that D2 lacks (gantt, timeline, mindmap) are hand-written SVG until a real artifact justifies adding Mermaid.
