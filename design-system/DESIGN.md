---
name: artifactory design system
description: The technical standard. A study artifact reads like a norm you could cite, numbered clause by clause, in black ink on white with rules for structure.
colors:
  surface: "#fff"
  surface-subtle: "#f0f0f0"
  text: "#111"
  text-hover: "#3a3a3a"
  text-muted: "#5c5c5c"
  border: "#c8c8c8"
  veil: "rgb(17 17 17 / 45%)"
  surface-dark: "#121212"
  surface-subtle-dark: "#262626"
  text-dark: "#ededed"
  text-hover-dark: "#c4c4c4"
  text-muted-dark: "#a3a3a3"
  border-dark: "#474747"
  veil-dark: "rgb(0 0 0 / 65%)"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(2.375rem, 1.9rem + 1.9vw, 3.125rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.012em"
    fontVariation: "\"wdth\" 80"
  close:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(1.625rem, 1.45rem + 0.6vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.2
    fontVariation: "\"wdth\" 80"
  headline:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(1.5rem, 1.35rem + 0.6vw, 1.6875rem)"
    fontWeight: 700
    lineHeight: 1.2
    fontVariation: "\"wdth\" 88"
  title:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: 1.25
    fontVariation: "\"wdth\" 88"
  subject:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem)"
    fontWeight: 800
    lineHeight: 1.3
    fontVariation: "\"wdth\" 72"
  frame:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.3
    fontVariation: "\"wdth\" 88"
  frame-small:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.3
    fontVariation: "\"wdth\" 88"
  caption:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    fontVariation: "\"wdth\" 88"
  label:
    fontFamily: "Archivo Variable, Archivo, Arial Narrow, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: "0.08em"
    fontVariation: "\"wdth\" 88"
  body:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "clamp(1.125rem, 1.05rem + 0.3vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "Recursive Variable, ui-monospace, monospace"
    fontSize: "0.82em"
    fontWeight: 400
    lineHeight: 1.6
    fontVariation: "\"MONO\" 1"
  math:
    fontFamily: "STIX Two Math, math"
    fontSize: "1.1em"
    fontWeight: 400
rounded:
  none: "0"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "1rem"
  space-4: "1.5rem"
  space-5: "2.5rem"
  space-6: "4rem"
  inset: "0.625rem"
  gutter: "1.25rem"
  measure: "42.5rem"
  hang: "3.25rem"
  target: "2.75rem"
  sign-size: "1.25rem"
  block-clearance: "2.75rem"
  rule: "1px"
  stroke: "2px"
  rule-heavy: "4px"
  underline: "1.5px"
  underline-hover: "3px"
components:
  button-filled:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
    typography: "{typography.frame}"
    rounded: "{rounded.none}"
    padding: "0 1.125rem"
    height: "{spacing.target}"
  button-filled-hover:
    backgroundColor: "{colors.text-hover}"
    textColor: "{colors.surface}"
  button-filled-disabled:
    textColor: "{colors.text-muted}"
  button-outline:
    textColor: "{colors.text}"
    typography: "{typography.frame}"
    rounded: "{rounded.none}"
    padding: "0 1.125rem"
    height: "{spacing.target}"
  button-outline-hover:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
  text-action:
    textColor: "{colors.text}"
    typography: "{typography.frame}"
    height: "{spacing.target}"
  text-action-disabled:
    textColor: "{colors.text-muted}"
  section-row:
    textColor: "{colors.text}"
    typography: "{typography.frame}"
    padding: "0.375rem 0.625rem"
    height: "{spacing.target}"
  section-row-current:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
  question-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "1rem 1.375rem 1.25rem"
  option:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "0.25rem 0.5rem"
    height: "{spacing.target}"
  option-hover:
    backgroundColor: "{colors.surface-subtle}"
  choice-box:
    rounded: "{rounded.none}"
    size: "1.125rem"
  answer-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.625rem 0.875rem"
  numeric-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 0.875rem"
    height: "{spacing.target}"
    width: "16rem"
  state-notice:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    typography: "{typography.frame-small}"
    padding: "0.25rem 1rem"
  note-marker:
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "0 0.375rem"
  note-marker-open:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
  code-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.code}"
    padding: "1rem 0.625rem"
  inline-code:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    padding: "0.08em 0.3em"
  library-row:
    textColor: "{colors.text}"
    typography: "{typography.frame-small}"
    padding: "0.75rem 0.625rem 0.875rem"
  stage-option:
    textColor: "{colors.text}"
    typography: "{typography.frame}"
    rounded: "{rounded.none}"
    padding: "0 0.625rem"
    height: "{spacing.target}"
  stage-option-chosen:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
  stage-mark-reversed:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
  stage-mark-muted:
    textColor: "{colors.text-muted}"
  stage-part-hover:
    backgroundColor: "{colors.surface-subtle}"
  stage-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 0.625rem"
    height: "{spacing.target}"
  statement-label:
    textColor: "{colors.text}"
    typography: "{typography.frame}"
  proof-end:
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    size: "0.625rem"
---

# Design System: artifactory design system

Readers: platform agents building this package. Artifact agents never read this file; they read `COMPONENTS.md`. The frontmatter is normative and mirrors `src/tokens.css`. Every colour key without `-dark` is the light value of a `light-dark()` pair; its `-dark` sibling is the dark value of the same custom property (`surface` and `surface-dark` are both `--color-surface`). Archivo's `fontVariation` `"wdth"` is set in code with `font-stretch` (`--font-stretch-frame` 88%, `--font-stretch-title` 80%, `--font-stretch-subject` 72%). Use the custom properties in code, never the hex.

## Overview

**Creative North Star: "The Technical Standard"**

A study artifact is a technical standard: an ABNT or ISO norm, set in black on white, numbered clause by clause, with rules for structure. A running head sits over a heavy rule, the subject and date sit between thin rules, every section and paragraph carries its number in the margin, notes stand beside the line they annotate, equations and figures are numbered, and each question is a ruled form. The owner sees where they stopped as a position and leaves knowing what to revisit, never a score.

One ink on one ground. A narrow grotesque (Archivo, condensed by `font-stretch`) sets the frame: masthead, headings, numbers, labels, buttons. A book face with a matching math font (STIX Two Text and STIX Two Math) sets the copy. Structure is drawn only with straight rules at three weights and square boxes; nothing is rounded, nothing casts a shadow, and the only fills are the reversed current row, the filled button and the grey of what sits in the background.

The world refuses the docs-site page (sans throughout, a contents tree marked by a coloured left border, rounded cards), the SaaS course page and the blog article (see `PRODUCT.md`).

**Key Characteristics:**
- Ink #111 on white, no hue; grey only for what is unavailable or in the background.
- Archivo, condensed, sets the frame; STIX Two Text sets the copy; Recursive in mono mode sets code.
- Rules at 1px, 2px and 4px carry all structure; corners are square.
- Sections, clauses (statements among them), equations and figures are numbered by the page, in the margin or beside the formula.
- State is a line form or a drawn sign, never a hue.
- Every interactive cell is at least 44px; blocks stand 44px clear.

## Colors

One ink, one ground, one grey for what is unavailable. Light leads; print forces light. Dark mode was derived from the light rules (white ink on near-black, the same rules, no colour), and the owner has approved it. Every page follows the device's light or dark preference until the owner presses the eye in the running head: that choice overrides the device on this device only, until a press back or a change in the device's preference forgets it. Print still forces light, and the favicon keeps following the device.

### Primary
- **Standard Ink** (`text`, `text-dark`): every word, every rule, every box, the filled button, the reversed current row, the chosen box, focus outlines, caret, `accent-color`, text selection (reversed). 18.88:1 on white, 16.0:1 on near-black. Code keywords, functions, strings and constants are this ink too: the `--color-code-*` tokens are aliases, and only comments go grey.
- **Pressed Ink** (`text-hover`, `text-hover-dark`): the filled button's hover only, ink lifted one step. Never text on its own.

### Neutral
- **Sheet** (`surface`, `surface-dark`): the ground. Page, question boxes, code blocks, the phone bar, the contents sheet, the answer field, text on a filled button or reversed row.
- **Wiped Grey** (`surface-subtle`, `surface-subtle-dark`): the background fill. The state notice band, inline code, option hover, the outline button's hover, a Stage's clickable drawn part on hover, an unopened note marker's hover, figure `tint` and D2 light fills.
- **Unavailable Grey** (`text-muted`, `text-muted-dark`): what cannot be used now. Disabled buttons and text actions, code line numbers and comments. 6.69:1 on white (5.87:1 on the wiped grey), 7.43:1 on near-black, so it is still legible text.
- **Figure Grey** (`border`, `border-dark`): neutrals inside figures and D2 (`N4`, `N5`, `B3`). 1.67:1, so never text, never a control's edge, never a rule in the frame.
- **Veil** (`veil`, `veil-dark`): the backdrop under the contents sheet, the one layer that darkens.

### Named Rules
**The One Ink Rule.** Ink on paper, nothing else. No hue anywhere: not for links, state, emphasis, code or figures; the figure classes `fill-accent` and `stroke-accent` paint ink. A new colour is a token change the owner approves, never a component's choice.

**The One Grey Rule.** Grey means unavailable or background, and there is one grey for unavailable (`text-muted`). Don't stack fades: a muted element is not also faded. Nothing fades while it waits: the artifact page paints in ink from its first frame. Code lines outside a stepper's step are not a faded region: they take the one grey, comments and line numbers included. A Stage's `muted` mark is this grey's "unavailable": an edge that can no longer join, a row already settled.

**The Shape, Not Hue, Rule.** State is a line form or a drawn sign: dashed while saving or unavailable, dotted with "!" when not saved, a filled square for the choice, a tick for right, a cross for wrong. A state readable only by its colour is a bug, and with one ink there is no colour to fall back on. A Stage's `dashed` mark extends the dash from controls to content: dashed means not settled, so a candidate edge or a provisional key is dashed.

## Typography

**Display Font:** Archivo Variable (the frame; Arial Narrow fallback), condensed with `font-stretch`
**Body Font:** STIX Two Text Variable (Georgia fallback)
**Mono Font:** Recursive Variable with `"MONO" 1` (ui-monospace fallback)
**Math Font:** STIX Two Math, loaded with its full unicode range in `rich-content.css`

**Character:** The narrow grotesque of a standards body's masthead over the book face of a printed reference, so the frame reads as apparatus and the copy as text; prose and formulas share one hand.

### Hierarchy
- **Display** (700, `--font-size-heading-1`, 1.04, -0.012em, 80% wide): the artifact title and the Library's page heading only.
- **Close** (700, `--font-size-close`, 80% wide): the end of the page's heading ("Para revisar"; "To revisit" on the Library and the drafts page).
- **Subject** (800, `--font-size-subject`, 72% wide): the subject in the masthead's ident row, the one place the frame goes heaviest and narrowest. The contents sheet's heading uses 800 at 80%.
- **Headline** (700, `--font-size-heading-2`, 1.2, 88% wide): h2 section openers, numbered; 1.5rem on the phone. Library titles use this size at 80% wide.
- **Title** (700, `--font-size-heading-3`, 1.25): h3, numbered as a clause.
- **Body** (400, strong 600, `--font-size-body`, 1.6): prose, prompts, options, the answer field, within the 42.5rem measure. A note's text is 0.85em at 1.45.
- **Frame** (500, numbers 600, strong 700, 1rem / small 0.9375rem, 1.3): running head, ident row, contents rows, buttons, text actions, notices, history, the stepper counter, clause and equation numbers, option letters, a statement's, solution's or proof's run-in label.
- **Caption** (500, number 700, 0.875rem): figure and diagram captions, the answer fields' label (600), the model answer's heading and the right answer's label (700).
- **Label** (700, 0.8125rem, +0.08em, uppercase): the heading of a ruled list ("Sumário", "Suas tentativas") and a note's run-in "Nota" (0.06em).
- **Code** (400, 0.82em, 1.6): blocks and inline code.

Headings use `text-wrap: balance`. Numbers, counts and dates use `tabular-nums`.

### Named Rules
**The Frame and Copy Rule.** Archivo sets only the frame, at 500, 600, 700 or 800, never 400, always condensed (88% by default, 80% for titles, 72% for the subject). It never sets prose, prompts, options or what the owner types; those are STIX Two Text, with math in STIX Two Math.

**The One Number Size Rule.** Every number below a section (clause, equation, option letter, question, figure) is the same size, 1rem in the frame. A section number takes its heading's size and weight.

**The Even Link Rule.** Links and text actions are underlined at 1.5px (`--underline`) and thicken to 3px on hover. The underline is one unbroken rule just under the descenders, never broken around g, j, p, q, y or ç, 6% of the font size below them, so prose, frame text and the Library's titles keep the same clearance. Every underline follows that one rule; none sets its own position. A link is never bolder than the text around it.

## Layout

One reading column of `--measure` (42.5rem), centred on the screen, with `--gutter` (1.25rem) sides and the safe-area insets.

- **Desktop (`width >= 64rem`):** a three-track grid: the rail (12rem), a 5.5rem gap and the column. Section, clause and h3 numbers hang `--hang` (3.25rem) left of the column's text edge, on one edge, on their text's baseline. The rail is sticky under the notices, and its main button spans the rail.
- **Wide desktop (`width >= 80rem`):** five tracks, rail | gap | column | gap | notes, with the rail and notes column at `clamp(12.5rem, 15.8vw, 14.25rem)` and the gaps at `clamp(5rem, 6.1vw, 5.5rem)`, so the column stays centred and the margins grow, not the measure. Notes sit in the right column level with their paragraph's first line.
- **Phone (below 64rem):** numbers sit inline before their text at a 2.125rem minimum, so text starts on one edge. The contents fold into one line between 2px rules under the masthead ("Sumário · N seções" / "Abrir"). A bar fixed to the bottom (4px rule on top, sheet fill) slides in when the owner scrolls up with the masthead out of view, and out when they scroll down: contents and position on the left, Next question on the right. It moves only after the owner's first pointer, touch, wheel or key input, so a reload restoring the scroll position doesn't slide it in. The contents open as a bottom sheet (`dialog`, max `min(85dvh, 44rem)`) over the veil. Questions bleed to the screen edges and lose their side borders; adjacent questions share one rule. Primary actions sit on the right.
- **Library:** the column alone; a row's status drops under its meta below 40rem.
- **Print:** one column on white, whatever theme the owner chose; the rail, fold, bar, sheet, buttons, the eye, notices, a visitor's line and the end of the page, the Library's and the drafts page's included, don't print. Notes print open between rules.

Spacing steps are `--space-1` to `--space-6` (0.25, 0.5, 1, 1.5, 2.5, 4 rem). Sections open `--block-clearance` below what precedes them; the end of the page opens 4rem below the content.

### Named Rules
**The Inset Rule.** Text between two rules is inset `--inset` (0.625rem) from both ends: contents rows, masthead rows, history and revisit rows, the folded contents line, Library rows, code. Boxes (buttons, stepper arrows, question boxes) sit exactly on the rule's edge.

**The Text Edge Rule.** Every horizontal rule in the column runs from the text edge to the column's right edge. Nothing pokes into the gutter; a section's number hangs outside its rule. The one exception, used sparingly, is a Stage that opts in with `beside`, its drawing and tables side by side on a wide screen: the drawing's rules run from the text edge to its own width and the tables' from `--space-4` past it to the column's right edge, their top rules on one line.

**The Clearance Rule.** A block (stepper, figure, diagram) stands `--block-clearance` (2.75rem) clear of what is above and below, so its controls never read as part of an equation and each caption belongs to its own drawing.

**The 44 px Cell Rule.** Every link, button, option, row and toggle has a hit area of at least `--target` (2.75rem).

## Elevation & Depth

Flat. There are no shadows anywhere. Something that sits over the content (the phone bar, the contents sheet, the notice band) is a sheet-filled layer with a rule on the edge it shares with the content: 4px for the bar and sheet, 2px for the notice band. The veil under the sheet is the only layer that darkens.

### Named Rules
**The Flat Sheet Rule.** Nothing casts a shadow. A layer above the content draws a rule on its shared edge.

## Shapes

Square. No element has a radius; form controls are reset to `border-radius: 0`, and `InlineSvg` strips every `rx`/`ry`, so figures and D2's rectangles, squares and containers are square whatever `style.border-radius` says. Lines come in three weights: `--rule` (1px) between rows, above sections, around code, tables, figure stages and opened notes, and under a question's header; `--stroke` (2px) for boxes (questions, buttons, the choice box, the answer field, the select), the eye's drawing, the folded contents line, focus outlines and the right edge of a sideways scroller while more of it lies past that edge; `--rule-heavy` (4px) under the running head, above the end of the page (an artifact's, the Library's and the drafts page's), and on the bar's and sheet's top edges. The not-saved question draws a 3px dotted border, the one exception, because a 2px dot reads as a dash. Icons are inline SVG strokes at 2 with square caps, in `currentColor`; the status signs (saving squares, "!", tick, cross) are SVG masks at one height, `--sign-size` (1.25rem), never text glyphs; the tick is `--sign-tick`, which the numeric right-answer line draws too. A proof's end square is no status sign: a 0.625rem square of ink drawn as a border, smaller than the signs so it reads as punctuation. It is a filled mark, not a rule, so the Three Weights Rule doesn't govern its border. The eye in the running head is a drawing, not an icon: a 36 × 24 almond with a ring iris, a filled pinpoint pupil and free lashes, its curves not square, but in one ink, strokes at 2 and square caps; open for light, shut for dark (raised onto the open eye's centre, so both sit on the running head's line), and still readable as open or shut in forced colours. Its focus outline goes 3px out from the drawing rather than its 44px cell, so it stays clear of the 4px rule under the running head. The favicon (`public/favicon.svg`) is the same world at 16px: a square of ink on the ground, inset 3 of 16, ink and ground swapping with `prefers-color-scheme`.

### Named Rules
**The Square Corner Rule.** No radius, anywhere. A shape that needs to stand out is a 2px square box.

**The Three Weights Rule.** Rules are 1px, 2px or 4px, always in ink. A rule's weight says its rank: 4px opens and closes the page, 2px bounds a thing you act on, 1px divides.

## Components

### Buttons
Square boxes in ink: a control looks the same in every state except what the state changes.
- **Filled (Começar / Ir para a questão N, Next question, Verificar, Ver a resposta-modelo):** ink fill, sheet text, 2px ink border, Archivo 700 at 1rem, padding 0 1.125rem, at least 2.75rem square, icon 1.25rem with a 0.625rem gap. Hover lifts to `text-hover`. Focus is a 2px ink outline 3px out.
- **Outline (Acertei / Errei, stepper arrows):** the same box with no fill and ink text; hover fills the wiped grey.
- **Disabled (both):** the border turns dashed and grey, no fill, grey text, no hover.
- **Text action (Recomeçar, Mostrar todas, Fechar, notice actions):** ink text underlined at 1.5px, Archivo 500, no box, still 2.75rem high. Unavailable: grey, no underline. Recomeçar is a text action everywhere.

### Questions
A ruled form.
- **Box:** a 2px ink square box on the sheet, padding 1rem 1.375rem 1.25rem.
- **Header:** "Questão N" (700) on the left and the hint or status (500) on the right, the hint by kind ("Escolha uma" / "Choose one", "Calcule" / "Work it out", "Responda com suas palavras" / "Answer in your own words"), over a 1px rule that runs the box's full inner width while the text keeps the box's padding. The page numbers questions in order.
- **States:** saving dashes the box and shows three small squares; not saved draws the box dotted at 3px with a "!"; right shows a tick; wrong shows a cross in the header, crosses out the chosen box and, once the answer is locked, ticks the right option's box or, on a numeric question, adds the right answer. No strikethrough, no hue. An answered question locks at full ink. There is no loading or load-failed form: a question shows the answer this device last showed, or opens with its hint ("Escolha uma") when there's none, and so does the page's HTML before its script runs.
- **Actions:** below the prompt; on the phone they align right. Acertei and Errei stand alone with no label text.
- **Model answer:** a filled-button `summary`; opened, the answer sits under a 1px rule with a caption heading.
- **Right answer (numeric):** only once a wrong answer is locked (saved or answered elsewhere), never before and never on a right one. Under a 1px rule, `--space-3` below the field: the tick sign (`--sign-tick` at `--sign-size`), "Resposta certa:" / "Right answer:" in caption 700, then the agent's value in body type with tabular figures, kept on one line. The value follows the page's convention: `,` as the separator on a pt-BR page and `.` on an English one, `−` for the minus, a fraction as written, `e` notation as "6,02 × 10²³" with superscript digits. An absolute tolerance reads "9,81 ± 0,01 m/s²", a relative one "9,81 m/s² ± 1 %", and none, or zero, shows nothing. It never shows a score or how far off the answer was. The field's `aria-describedby` names it.

### Inputs / Fields
- **Single choice:** each option is a row at least 2.75rem high: a letter ("a)", Archivo 600), a 1.125rem square box in a 2px ink stroke, then the option in body type. Hover wipes the row grey. The chosen box fills with an ink square inset 3px, and the chosen option is set at 600 (its math in the bold of STIX Two Math). Every option stays visible.
- **Open answer:** a textarea in a 2px ink square box on the sheet, body type, at least 7.5rem; focus adds a 2px ink outline 3px out. Locked, it loses its box and reads as text. Its label is caption size, 600.
- **Numeric answer:** the open answer's label over a one-line field: a 2px ink square box on the sheet, 2.75rem high, body type with tabular figures, padding 0 0.875rem. From 64rem it is `min(100%, 16rem)` wide; below 64rem it grows to fill its row, so it ends on the box's right edge with Verificar under it. The unit sits beside it in body type, `--inset` clear, on its baseline, and is the field's description; on the phone a unit too long to sit beside a 16rem field drops under it, and the field takes the whole row. The full text keyboard on every question, with no autocorrect, autocapitalization or spellcheck, so the keyboard never hints at the answer's sign or form. Input that isn't a number gets the browser's validation bubble with the page's message ("Escreva um número, como 2,5; −3/4 ou 6,02e23."; for `2,500`, "2,500 pode ser milhar ou decimal: escreva 2500 ou 2,5000."), and an empty field "Escreva um número primeiro.", and the question stays open with the text. Locked, the field loses its box and reads as text, as typed, a word space from its unit, so the two read as one quantity ("18,85 cm²").
- **Select (Library filter):** a 2px ink square box, 2.75rem high, never wider than the column.

### Navigation
- **Running head:** one height on every page, an artifact's, the Library's and the drafts page's: 2.125rem (34px) to the foot of its 4px rule, one line of frame small text with `--inset` under it. Its links and the eye keep their 44px cells centred on that line, overhanging it above and onto the rule. It stands at the same place on every page too: `--space-4` (1.5rem) below the top of the page on the phone and tablet (`width < 64rem`), `--space-5` (2.5rem) from 64rem.
- **Masthead:** the running head (back link with an arrow, the eye that toggles the theme centred between it and the artifact's size on the right) over a 4px rule; the ident row (subject, date line) over a 1px rule; then the title. The date line reads "Publicado em 14 out. 2026" / "Published 14 Oct 2026", and on a draft "**Rascunho** · criado em 14 out. 2026" / "**Draft** · created 14 Oct 2026", with only the status word in Frame strong (700). The date line is the one place a draft's page says it is a draft: the back link to the drafts page doesn't repeat it, and the status still shows in print, where the back link is hidden. Before it, the page's first focusable is "Pular para o texto", shown only on keyboard focus as a filled band across the running head, standing on its 4px rule.
- **A public artifact's page:** one page in two forms, the owner's and a visitor's, both in its HTML; the head script picks one before the first paint (`data-viewer`), so nothing moves once painted, and with no viewer the page shows the owner's form. The owner's form is the page as above, with nothing marking it public. A visitor's running head has no back link, since it leads only to a sign-in: its place stays empty, so the eye and the size keep theirs. Under the date line, on the ident row's last line and in the same frame text, one line in the artifact's main language says the answers stay on the page: "Suas respostas ficam só nesta página e somem quando você sai." / "Your answers stay on this page and are gone when you leave." It is plain ink with no label, box or grey, shows only on artifacts with questions, and doesn't print. A visitor sees no saving or sign-in notice and no link to any other page.
- **Contents rail:** a "Sumário" label over 1px-ruled rows, each a number column (2.125rem, 600) and a title; hover underlines the title. The current section is reversed (ink fill, sheet text, 700), filling exactly the space between its two rules. Below: the position line ("Você parou na questão 5."), the full-width filled button and Recomeçar. They read from the answers this device last showed; with none, and in the page's HTML before its script runs, as a first visit ("5 questões.", "Começar pela questão 1", Recomeçar unavailable), always in ink.
- **Phone:** the folded contents line, the bar and the sheet (see Layout).
- **Library and drafts page:** a running head ("artifactory", the eye that toggles the theme centred between it and the link to the other list on the right, one line at the phone's width too) over a 4px rule, the Display heading, the subject filter with the count of rows it shows ("18 artifacts"), then rows between 1px rules: the title (Headline size, 80% wide, 700) with the whole row as its hit area, the subject and date beneath, and a status on the right. Each " · " in that meta line stays on the line of the item before it, as a notice's does. A public artifact's row ends its meta line with "Public", after the date, with only the word in Frame strong (700), as a draft's date line sets its status word: no box, fill or grey, and it prints. It is English on every row, a pt-BR artifact's included, as the rest of the Library's chrome is, and the drafts page never shows it, since a draft can't be public. The filter shows only when the list holds more than one subject. A word too long for the column wraps inside its row. A subject is set in the language most of its artifacts have. A row shows a status only once its artifact has an attempt with answers ("In progress · N of M answered" or "Finished"); an artifact with no questions shows no status yet. The statuses this device last loaded paint with the rows, and the load corrects them in place, so the rows don't move once painted. With nothing to list, one line says what the page lists and how an artifact gets there. The page ends as an artifact page does: after a 4px rule and 4rem of space, the Close heading "To revisit" (English only), then one group per artifact whose latest attempt marked a question wrong, in the list's order. A group is the artifact's title as a plain heading, not a link (700, the Title size, 80% wide, in the artifact's language), 0.5rem over its rows, and groups stand 1.5rem apart. The rows are the artifact page's "Para revisar" rows: "Question N" as the link to the question on the artifact page, then its section in the artifact's language, math read as on that page. The group's list is named by its title. No lead-in, count, score or prompt. The subject filter narrows the section with the list, and the count beside the filter counts the list's rows only. Like the statuses, the section paints with the rows from what this device last loaded, and the load corrects it in place; with nothing to revisit in the subject shown, there is no rule and no heading.

### Notes (signature)
Marginal notes as in a standard. On a wide desktop the note stands in the right column level with its paragraph, the uppercase "Nota" label run in. Narrower, a small 1px-boxed "NOTA" marker stays on the line with the paragraph's last word; open, it reverses and the note shows under the paragraph between two 1px rules.

### Numbering (signature)
The page numbers everything with CSS counters, so an artifact never writes a number: sections (1), clauses (1.1), which a section's paragraphs, h3s and statements share in one series, equations on their own series ("(1)", right of the formula, on its baseline, with the formula centred on the column axis), figures and diagrams by section ("Figura 4.1", "Diagrama 4.1"), questions in order. A proof is never numbered, nor are its paragraphs; an example's solution is part of the example's clause, so its paragraphs aren't numbered either, while its equations and figures keep their series. A citation (`Ref`) prints its statement's label and number, "Teorema 2.1", with no script: the build counts the same elements the clause counter does.

### Statements
Definitions, theorems, lemmas, corollaries and worked examples are clauses, not boxes. The number stands in the margin as a paragraph's does, and the label runs in at the start of the first line, upright whatever the body: the kind in Frame strong (700), the name in parentheses at 500, then a full stop, all at the frame size. Theorem, lemma and corollary bodies are italic; definitions and examples stay upright, with a definition's defined term in bold. Equations and code inside stay upright, and equations keep the page's series. A statement stands 1.375rem clear of the paragraphs around it, with no box, fill or rule, and, unless it is an example, doesn't break across a printed page. Its anchor is `#S-<id>`, uppercase so it can never equal a heading's slugged ID. It is a group named by its kind, number and name ("Teorema 2.1 (Valor médio)"); the margin number has empty alt text, so the number is read once. A citation is an ordinary link, its label and number joined by a no-break space.

A proof (`Proof`) right after the theorem, lemma or corollary it proves stands 0.875rem below it, as a paragraph follows another, and 1.375rem clear of what comes after. Only the build knows that a proof follows its own statement, and it marks that proof; every other proof, one right after a different statement included, stands 1.375rem clear on both sides. It has no number, and its body is upright. Its label runs in like a statement's: "Demonstração" / "Proof" in Frame strong (700), then a full stop. A proof that doesn't follow its statement at once says what it proves, " do Teorema 2.1" / " of Theorem 2.1" at 500, the label and number a link in the frame face, joined by a no-break space. A proof that opens with an equation or a list sets its label alone on its first line, and in print that label stays on the page of what it opens; the rest of a long proof breaks across pages as prose does. Its last line ends with the end square: 0.625rem of ink at the column's right edge, sitting on the line's baseline, drawn as a 5px border so forced colours and print keep it. After a closing list, the last item's last line carries it. After a closing equation it stands alone on the next line, at the right edge, since the equation's number holds the end of the formula's line. Screen readers hear it as "Fim da demonstração." / "End of proof.".

A worked example (a statement of kind `example`) shows its solution openly, never behind a reveal: an example teaches, a question tests. The solution starts a new paragraph inside the example's group, 0.875rem below the problem as a paragraph follows another, with its label run in like a statement's: "Solução" / "Solution" in Frame strong (700), then a full stop. A solution that opens with an equation, a list or a table sets its label alone on its first line. Equations, tables and figures sit in the column as anywhere else on the page and keep their series. An example may break across a printed page, since a worked solution can run long, but a label set alone stays on the page of what it opens.

### The end of the page
After a 4px rule and 4rem of space: "Para revisar" with the questions marked wrong as 1px-ruled links (number and section; a row is at least 2.75rem, and a section that wraps keeps 0.375rem clear of both rules), Recomeçar, then "Suas tentativas": each attempt's date and its status ("esta tentativa", "concluída" or "não concluída"), newest first, 5 shown and the rest behind Mostrar todas. No score anywhere. The Library and the drafts page end with the same rule, heading and rows, grouped by artifact (see Navigation).

### Stepper
Code, figures or boards that change by step. The controls sit above the stage: the counter (700) and the step's caption on the left, two outline arrow buttons (2.75rem square) on the right, in that order in the markup too, so the caption is read before the arrows; on the phone the caption drops under the counter. The stage sits between 1px rules. Code lines outside the step turn grey (`text-muted`), and the step's line numbers are set in ink at 700, so the step still shows in forced colours and when a step's line is only a comment. A D2 stepper draws every board in one frame, the union of their boards, so a part keeps its place and size across steps and the stage keeps one height. When motion is allowed, code lines change colour, a figure's parts cross-fade and a new board fades in, over 0.2s. In print a stepper drops its controls and counter and prints every step: each board, whole and cut back to its own size, under "N." and its caption; code in ink, with the steps listed under it as "N (lines 3–4): caption"; a figure once, at its last step, with its captions listed under it.

### Stage
The block a custom build runs in: a figure in the figure's frame, numbered on the figures' series ("Figura 4.1") whether or not it has a drawing, standing clear like any block. Controls sit above the content, all the Stage's own, in the frame's type: the label (frame small, 700) over a row of square options, each the outline button's 2px box at least 2.75rem square with its name in Archivo 700, the chosen one filled with ink (native radios, so the arrow keys move the choice and focus draws the 2px outline 3px out); then the Stepper's row: the counter (700) and the step's line on the left, the two outline arrows on the right, the line dropping under the counter on the phone. With typed input, the options' place holds a row of whole-number fields under the label: each field's name in Archivo 700 at frame size, `--space-2` from its box, the numeric answer's 2px ink box at 2.75rem high in body type with tabular figures set right, as wide as its longest bound and one digit more, `--space-3` between fields; then the filled Começar / Start button. The fields open with the first example's numbers, and the content as written is that example's result. A number that isn't whole or is out of bounds is refused: its field's box turns dashed (the Shape, Not Hue Rule's "not settled"), the step's line says what to type, from which bounds, the field takes focus back and its description names the reason. Before a choice the line holds the prompt and the counter is hidden. The drawing sits on a stage between 1px rules, and a table straight under it shares its lower rule. A Stage that opts in with `beside`, which its builder sets sparingly, only where a step's marks and its rows must be seen together, and whose content is a drawing and only tables, sets the tables beside the drawing on a wide screen (`width >= 64rem`, where the step's line stops dropping under the counter) when both fit at their own widths inside the text column, never past it: the drawing at its own width on the text edge, `--space-4` clear, the tables filling the rest to the column's right edge, the drawing's rules and the table's top rule on one line, and a table that grows hanging down beside the drawing while the drawing and controls stay put. Without `beside`, below 64rem, in print, and where they don't fit, the tables sit under the drawing and share its lower rule; `beside` without a drawing fails the build. A step whose cells come out wider than their room, as `body` or typed input can make them, sets the tables under the drawing for that step, the drawing taking the column's width. Code is never a drawing: a Stage with a code block, or with prose among its tables, keeps one column, since code needs the column's width and prose its measure. A drawn part named like an option chooses it on click, through a transparent hit area of at least 44px at the drawing's smallest scale, for the pointer only: the options stay the one way in for the keyboard and screen readers. On a device that can hover, the part under the pointer takes the wiped grey where it is drawn in the ground (its `-surface` fills), as an option's box does; never in forced colours, where the system's colours stand, and never on the reversed part, which is already filled. Each step is announced as "Passo N de M. …". A refusal (a typed number, more than 200 steps, a build that fails or throws on the numbers typed) takes the step's line, with the content back as written. Without JavaScript, and in print even mid-run, the Stage shows the content as written and no controls. With typed input the content as written is the first example's result, so the controls' place holds one line naming that example: the input's label in the legend's type (frame small, 700), then, `--space-2` on, each field's name and number in the fields' order at 500 with tabular figures ("Calcular mdc(a, b) a = 48, b = 18"), `--space-2` above the content. The label is the builder's own, so the line needs no wording of its own in either language. With `choose` the content as written is the starting state, no option, so nothing is named.

The marks, the same on drawings, tables and code, each a change of form, not only of colour:
- **`strong`** (settled or just changed): a drawn line at 4, labels, cells and code lines at 600, a code line's number in ink.
- **`dashed`** (provisional): a drawn line dashed 6 4, a cell or code line in a 2px dashed box inside its edges (the Shape, Not Hue Rule).
- **`muted`** (no longer available, such as a branch not taken): the one grey, never a fade (the One Grey Rule); a code line greys whole, its tokens and number included.
- **`reversed`** (the one current thing): an ink fill with ground text at 600, like the current contents row; a drawn shape fills with ink and its label turns to the ground; the running code line is a bar of ink, its tokens and number in the ground, the full width of the code block and, where a long line scrolls sideways, of everything the block scrolls through, so scrolling never leaves the bar behind.
A Stage holds at most one code block, highlighted and numbered as anywhere else; each of its lines is a row as wide as the longest, the block's inset moved into the rows so a mark reaches the block's edges. Only the line marked `reversed` is announced, as "Passo N de M. Linha L. …".
A step's `body` rewrites the rows of the Stage's one table, so a teste de mesa grows a row per pass: each row it adds is a copy of the last row as written, keeping its alignment, type, figures and 1px rules, so a new row reads as one of the table's own and takes the marks like any other. No row is marked for being new; the build marks what the step just wrote, `strong` as anywhere. The rows as written stay in the table, hidden on screen, so print and the page without JavaScript show them, and a step back shows only the rows that step had.
In a drawing each mark acts on the colour classes, on the part and inside it: `strong` and `dashed` on shapes with a `stroke-` class (`strong` sets labels at 700 too), `muted` and `reversed` on what paints in `-text`, `-accent` or, for `reversed`, `-surface`, and on labels with no fill of their own. A part drawn another way, such as a `fill-muted` vertex, stays as drawn, and the check fails a mark on a part it can't change. The marks exist only on screen: print shows the content as written from the stylesheet alone, whether or not the browser fires `beforeprint`, and a cell whose text a step changed keeps its written text beside the step's for print.
In forced colours the drawing, the marked cells and the marked code lines paint with the system's CanvasText, Canvas and GrayText, so `reversed` stays filled and `muted` stays grey. A code block in a Stage prints as written, with no marks and wrapping as any code block does. When motion is allowed, marks change over 0.2s.

### State notices
A sticky band at the top: the wiped grey, a 2px ink rule on the bottom edge, centred Archivo 500 at the small frame size, actions as text actions. Hidden in print. The artifact page and the Library show the same band, each with its own notices. The " · " between a notice's text and its action sits evenly between them, `--space-2` clear on each side, kept on the line of the text before it, and clear of the action's 44 px box and ring. When the page's script fails before the answers can load (it threw, or it never arrived), the band says "Esta página não pôde começar · Recarregar" instead of the page loading for ever. The signed-out notice's action reloads the page ("Sessão encerrada · Recarregue para entrar"), except on a public artifact's page, which no sign-in guards: there it is a link to the Library, "Sessão encerrada · Entrar pela Biblioteca" / "Signed out · Sign in from the Library", set as the other notice actions are.

The artifact page shows the answers this device last showed, as the Library shows the statuses it last loaded: the questions, the rail, the bar, the end of the page and the attempts paint from them, and the first load only checks them against the server. When the server agrees, nothing changes; when it differs, the page changes once to the server's answers, with no notice. When the check fails, the page stays as it is and usable, and the band says "Não foi possível conferir suas respostas · Tentar de novo" ("Couldn't check your answers · Try again"). Signing out forgets the device's answers.

### Code, math and figures
- **Code block:** sheet fill, a 1px ink rule above and below, padding 1rem by the inset, Recursive in mono mode, grey line numbers in a 2.4em gutter. No syntax colour: only comments go grey.
- **Inline code:** the wiped grey, 0.08em by 0.3em padding.
- **Table:** data with short cells, never rows of sentences. It runs the column's full width between 1px ink rules, with a 1px ink rule between rows and under the header, and the text inset by `--inset` from both ends of every cell. The header is Archivo 700 at the frame size, starting at the cell's start and sitting on its bottom; cells are copy at the caption line height, aligned on their first baseline so a row reads across, with tabular numbers. A column the Markdown marks `---:` aligns right. No fills, no vertical rules, no striped rows. A table too wide for the column scrolls sideways inside its rules, in a group named "Table" or "Tabela" in the artifact's main language, so Tab reaches it and the arrow keys scroll it; a table that fits looks the same as one that never could scroll. In print it doesn't scroll: a wide table runs past the column.
- **Math:** MathML from Temml in STIX Two Math; display equations at 1.1em.
- **Figures and diagrams:** the drawing centred on a stage between 1px rules, the caption under it in Archivo with its number at 700. Hand-written SVG is painted only with the `fill-*` and `stroke-*` classes in `figure-colours.css`; its labels are Archivo.
- **Sideways scrolling:** a code block, display equation, figure stage, stepper stage or table too wide for the column scrolls sideways, and draws a 2px ink rule on its right edge while more of it lies past that edge; scrolled to the end, or with nothing to scroll, the rule is gone. It is a border image tied to a scroll timeline in `rich-content.css`, so the 1px rules keep square corners and the layout never moves. A table's scroller has no border of its own, so the table keeps the column's full width and the rule is drawn over its last 2px. Browsers without scroll-driven animations, and forced colours, show no rule.
- **D2:** `d2-tokens.ts` maps D2's theme colours to the tokens and paints code labels in ink with grey comments, and `d2-board.ts` joins shape outlines square (`InlineSvg` strips every `rx`/`ry`). Labels are Archivo at the frame's 88% width (`diagram-fonts.ts`, static TTF instances because D2 measures and embeds TTF): D2's regular is set at 500 and its semibold at 700, so the frame is never 400. Mono labels are D2's own monospace, because D2 takes no mono font.

### Motion
Small and optional. The phone bar slides 0.24s on `cubic-bezier(0.16, 1, 0.3, 1)`, stepper steps cross-fade over 0.2s, and a Stage's marks change over 0.2s, all only under `prefers-reduced-motion: no-preference`. Everything else changes state at once, except the eye.

The eye in the running head is the one place with ambient motion and the one place the lid eases, all of it only under `prefers-reduced-motion: no-preference`:

- **Blinking and peeking.** Open, it blinks every 2.5 to 7.5s at random. Shut, it peeks every 6 to 14s, opening about two-thirds of the way for 0.9s with its pupil still following. A blink or a peek never moves the lift, so the eye stays on the running head's line.
- **Following.** The pupil looks toward the last pointer position anywhere on the page, or the last tap on a phone, all the way at 160px from the eye. A touch that scrolls or drags isn't a tap, so scrolling a phone doesn't move the look.
- **Hover**, on a device that hovers, widens an open eye and shrinks its pupil, or opens a shut eye a crack. While the eye is hovered it doesn't blink or peek: one that falls due waits for the next interval. After a press, hover waits until the pointer leaves, so a press always goes all the way.
- **Easing.** Every value of the pose eases exponentially toward its target from wherever it is, with time constants of 22 to 110ms, so a new target midway through a blink, a hover or a press never jumps. A press eases the lid and the lift to the other pose while the page's colours change at once.
- **Frame work.** None while the eye is scrolled out of view or the tab is hidden, and none while it's at rest between blinks.

Under `prefers-reduced-motion: reduce` the eye rests with its pupil centred and changes pose at once.

## Do's and Don'ts

### Do:
- **Do** take every colour, size, space and rule from `tokens.css` custom properties, and check both themes and print.
- **Do** carry every state in a line form or a drawn sign (dashed, dotted with "!", filled square, tick, cross).
- **Do** set the frame in Archivo at 500 to 800, condensed by the `--font-stretch-*` tokens, and the copy in STIX Two Text.
- **Do** inset text between two rules by `--inset` (0.625rem) and set boxes flush on the rule's edge.
- **Do** run every rule in the column from the text edge to the column's right edge, except a Stage that opts in with `beside` to set its drawing and tables side by side, used sparingly (the Text Edge Rule).
- **Do** give every interactive cell at least `--target` (2.75rem) and a 2px ink focus outline.
- **Do** let the page number sections, clauses, equations and figures; never write a number into content.
- **Do** draw icons as inline SVG strokes at 2 with square caps, in `currentColor`.
- **Do** write labels in both languages (`data-lang="en"` and `data-lang="pt"`), following the artifact's main language. `page.css` hides the half that doesn't match, so a component adds no rule of its own.

### Don't:
- **Don't** add a hue, including purple, pink or magenta, for any reason.
- **Don't** show a count or tally of right and wrong answers, or a score, anywhere: rail, history, end of the page or Library. The Library may say how many are answered.
- **Don't** add shadows, gradients or a radius of any size.
- **Don't** fill a container. Fill is for the filled button, the reversed current row, the chosen box, an open note marker, and the wiped grey of the notice band, inline code and hover.
- **Don't** stack fades or use a second grey for unavailable.
- **Don't** set prose, prompts, options or typed answers in Archivo, or set Archivo at 400.
- **Don't** mark the current section with a coloured left border; reverse its row.
- **Don't** use text glyphs (✓, ✗, !) or icon fonts for states.
- **Don't** add label text where the controls speak for themselves.
- **Don't** put a small label above a heading. The uppercase label heads a ruled list or runs into a note; it is never a kicker.
