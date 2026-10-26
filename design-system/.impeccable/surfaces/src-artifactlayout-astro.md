---
version: 1
slug: "src-artifactlayout-astro"
primary_target: "src/ArtifactLayout.astro"
related_targets: []
---

# Artifact page

Shaped and approved by the owner, in the technical standard.

## Scope and mode

- **Mode:** Read, with Operate moments at the questions and attempts.
- **In:** the whole visual world: `src/tokens.css`, `ArtifactLayout` and its parts (masthead, contents rail, phone bar and contents sheet, the end of the page with the attempts history), `LibraryLayout`, `StateNotices`, the questions (`SingleChoice`, `OpenQuestion`, `Question`), `Stepper`, `Diagram` and `Figure` framing, D2 and figure token maps, code and math styling, the catalog pages, and `DESIGN.md` with `.impeccable/design.json` at finish.
- **Untouched:** the artifact contract (what an artifact may import and write), the state store and transports, scoring, routes, and the artifact content model.
- **Fidelity:** production-ready, both themes and print.

## Audience and job

The owner studies alone on the devices in `PRODUCT.md`, in either theme, in an artifact whose main language is pt-BR or English. They come in three ways, all on one page: a first pass (top to bottom, answering each question on reaching it), practice again (start over, then question to question) and looking something up (straight to a section). Artifacts run from a few screens to a chapter.

**Success:**

- Reading starts in the first viewport at both sizes.
- Where the owner stopped is visible without scrolling, as a position ("Você parou na questão 5"), never as a score.
- Any section, and the next unanswered question, is one action away on both devices.
- Start over is reachable from the top as well as the end.

## Layout and interaction

- **Desktop (1440):** grid `64 | 228 rail | 88 | 680 column | 88 | 228 notes | 64`, so the reading column is centred on the screen with equal margins. The rail is sticky. Section and clause numbers hang in the left gutter on one left edge (column edge − 52px), on their text's baseline. Notes sit in the right column, level with their paragraph's first line, label run in ("NOTA" then the text). The rail's main button spans the rail's width.
- **Phone (393):** 20px side padding; numbers go inline before their text (min-width 34px so text starts on one edge). The contents fold into one ruled line under the title ("Sumário · N seções" / "Abrir"). A bottom bar appears on scroll: "Sumário · 3 de 4" on the left, the next-question button on the right. The contents open as a sheet over a 45% veil. Notes fold behind a small "NOTA" marker kept on the line with the paragraph's last word; tapping opens the note under the paragraph between two rules. Primary actions sit on the right (Verificar, Ver a resposta-modelo, Acertei/Errei, stepper arrows, the sheet's button with Recomeçar on the left). Questions bleed to the screen edges.
- **Next question:** goes to the first unanswered question after the reading position, then wraps, then to the end of the page once none is left. It moves focus to the question and sets `#q-<id>`.
- **The end of the page:** "Para revisar", the questions marked wrong as links (number and section), Recomeçar, then "Suas tentativas" with each attempt's date and status ("esta tentativa", "concluída" or "não concluída") and "Mostrar todas". No score anywhere.
- **Labels:** every chrome label follows the artifact's main language.

## The owner's standing rules

These came out of the owner's notes on rounds 5–7. Each is a rule for every component, not a fix for one.

1. No colour: ink #111 on white. Grey only for what is unavailable or in the background (disabled controls, the wiped fill of a notice band and inline code, stepper lines outside the step). One grey for unavailable, never stacked fades. No purple, pink or magenta.
2. No count of right or wrong answers anywhere: not in the rail, the history, the end of the page or the Library (the Library may say how many are answered).
3. Every horizontal rule in the column runs from the text edge to the column's right edge, except a Stage that opts in to set its drawing and tables side by side, used sparingly; nothing pokes into the gutter. Section rules start at the text edge and the number hangs outside them.
4. Text between two rules is inset 10px from both ends (contents rows, masthead rows, history and revisit rows, folded contents line, Library rows, code). Boxes (buttons, stepper arrows, question boxes) sit exactly on the rule's edge. A question's header rule runs to the box border; its text keeps the box's padding.
5. All numbers below a section are the same size (16px); section numbers match their heading's size and weight.
6. The current section is a reversed row filling exactly the space between its two rules, text inset; nothing spills past rules.
7. A control looks the same in every state except what the state changes. Recomeçar is a text link everywhere; unavailable = grey, no underline.
8. Links are underlined at the weight of the surrounding text, never bolder.
9. State is a shape, never a hue: dashed box while saving, dotted box with "!" when not saved, filled square for the choice, tick for right, crossed box for wrong (no strikethrough). Icons share one height ("!" no taller than the tick and cross).
10. No label text where the controls speak for themselves (Acertei / Errei stand alone).
11. Blocks (stepper, figure, diagram) stand 44px clear of what is above and below, so controls never read as part of an equation and each caption belongs to its own drawing.
12. Equations are numbered on their own series, (1), (2), centred on the column axis with the number on the formula's baseline. Figures and diagrams are numbered by section (Figura 4.1).

## States and ranges

- **No questions:** a short artifact shows the masthead and content only. A long one adds the contents, but no "where you stopped", next-question control or end-of-page review.
- **Questions:** from 1 to 30 or more. A question is unanswered, chosen, saving, not saved, right or wrong; an open question is empty, typing, model answer shown, marked right or marked wrong. A self-checked question with its model answer revealed but not yet marked counts as unanswered.
- **The rail:** before any answer ("Seis questões." / "Começar pela questão 1"), in progress ("Você parou na questão 5." / "Ir para a questão 5"), all answered ("Todas as questões respondidas." / "Ver o que revisar").
- **Before the answers are checked:** the page shows the answers this device last showed, in ink, from the first frame; with none, it reads as a first visit. The check changes the page only when the server differs. A failed check leaves the page usable under the band's "Não foi possível conferir suas respostas · Tentar de novo".
- **History:** from none to dozens of attempts, newest first, 5 shown and the rest behind "Mostrar todas".
- **Long titles and headings:** pt-BR titles and headings wrap in the masthead and the rail, and nothing truncates.
- **Print:** one column on white; the rail, bar, sheet, buttons and notices don't print.

## Constraints

- Static Astro, custom elements and plain CSS, with no islands. Whatever can render at build time does.
- WCAG 2.2 AA, 44px targets, both themes and print.
- The same commit gives changed parts their catalog pages, and updates the `artifact` skill if the authoring rules change.

## Anti-goals

- Streaks, badges, confetti, scores, tallies of right and wrong, or a dashboard of the history.
- A hamburger menu.
- Contents on a two-section artifact.
- Anything shown before the prose, such as a splash or an attempt picker.
- Chrome an agent could vary per artifact.

## Open

- Dark mode for the technical standard was derived from the light rules (white on near-black, same rules, no colour), and the owner has approved it (`DESIGN.md`, Colors).

## Direction contract

**THESIS:** A study artifact is a technical standard: an ABNT or ISO norm, numbered clause by clause, set in black on white with rules for structure. It refuses the docs site (sans throughout, a contents tree with a coloured left border, rounded cards), the SaaS course page and the blog article.

**OWN-WORLD:** Ink #111 on white, no colour; grey only for what is unavailable or in the background. Archivo (font-stretch 80–88%) sets the frame: masthead, headings, numbers, labels, buttons. STIX Two Text sets the reading copy at 19px with STIX Two Math; Recursive in mono mode sets code. Structure comes from rules: a 4px rule under the running head, 1px rules between rows and above sections, 2px boxes for questions and buttons, square corners, no shadows, no fills except the reversed current row and the filled button.

**STORY:** The owner opens a page that reads like a norm they could cite: every section and paragraph numbered in the margin, notes beside the text, questions as ruled forms. They see where they stopped as a position, answer, and leave knowing what to revisit, never a score.

**FIRST VIEWPORT:** On 1440, the rail at the left (x 64–292): "SUMÁRIO" over ruled rows with the current section reversed, "Você parou na questão N." and a full-width black button, Recomeçar as a text link. The centred 680px column: a running head (← Biblioteca / N seções · N questões) over a 4px rule, the subject (Archivo 800, 72%) and published date between 1px rules, the title in Archivo 700 at 50px, the lede, then section 1 under its rule with "1" hanging at x 328. Notes in the right column level with their paragraph. On the phone, the same masthead, the folded contents line, and the bottom bar on scroll.

**FORM:** The technical standard: grounded candidate 5 of 7 on the round-5 list, assigned by the roll and chosen by the owner, then refined over rounds 6 and 7 (no colour chosen). seed: none (unavailable). Raises: the measure holds while margins grow (expedition press); a note sits level with the line it annotates (daylight section); every option stays visible and the chosen one is set heavier (cathode numeral stack); state is carried by line form, not colour (spectrograph rail); every size steps on one grid (Swiss poster wall); every Library row uses one label layout (sneaker box wall).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
