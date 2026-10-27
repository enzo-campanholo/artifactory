# Shared parts

`tokens.css`, `page.css`, `math.css`, `rich-content.css`, `SvgImage.astro`, `InlineSvg.astro`, `figure.css`, `figure-colours.css`, `StepControls.astro`, `statement-blocks.css` and `d2-board.ts` each reach more than one component, so a fix to one follows the shared-part rule in `CODING_STANDARDS.md` › Code. Among them:

- `SvgImage.astro` sizes both `Figure` and `Diagram`.
- `page.css` draws the end of the page, rule, heading and revisit rows, for both the artifact page and the Library.
- `math.css` sets math for rich content and the Library's revisit rows.
- `figure.css` frames `Figure`, `Diagram` and `Stage`.
- `StepControls.astro` and `page.css`'s `step-` row draw the `Stepper`'s and the `Stage`'s counter and arrows.
- `statement-blocks.css` spaces both `Statement` and `Proof`.
- `d2-board.ts` draws both `Diagram` and diagram `Stepper` boards.
