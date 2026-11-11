# Writing rules

Every rule an artifact's files follow, one section per kind. A `pnpm check` failure ends `(artifact skill: <section>)`, naming one of these sections; each holds every rule of its kind, or points to the sibling file that does.

## Frontmatter

`pnpm new` writes the frontmatter. Rules `frontmatter`, `artifact-id`, `subject` and `public`.

- `id`: the permanent artifact ID, which the owner's answers belong to. Leave it exactly as `pnpm new` wrote it, quotes included.
- **Never copy an artifact folder**, not even one from git history: the copy carries the original's ID, and `artifact-id` fails on both. Create every artifact with `pnpm new`. If a copy exists, recreate it with `pnpm new`, move its content over, and keep the original's ID.
- `title`: plain text in the main language, with its accents. Math, code and Markdown don't render in it, so write a symbol in Unicode (xⁿ, π, √2) or in words, and keep formulas for the text. A backtick or two `$` fail with "`title` is plain text"; a single `$` (R$ 10) passes.
- `subject`: exactly one, spelled exactly as other artifacts on that topic spell it. `pnpm new` prints the subjects in use. `subject` fails when two spellings differ only in case or accents; change the new artifact's spelling to the existing one.
- `lang`: the main language, `pt-BR` or `en`.
- `published`: the published date, unquoted (`2026-10-15`), the São Paulo date of the day it first appeared. Only publishing a draft changes it.
- `draft`: `true` keeps the artifact out of the Library.
- `public`: `true` opens the artifact to anyone with its link, and `false`, the default, keeps it behind the owner's sign-in. Set or remove it only as in [Make public](lifecycle.md#make-public) and [Make private](lifecycle.md#make-private). A draft can't be public: `frontmatter` fails at the `public` line ("`public` can't be true on a draft"). Remove `public`, unless the owner asked for this artifact to be public: then follow [Make public](lifecycle.md#make-public).
- One Access app opens at most 50 paths: two for each public artifact and for each of its former slugs, plus two shared by all. When the public artifacts need more, `public` fails at every public artifact. Never choose which to make private: list the public artifacts to the owner by slug and title, and wait.
- `formerSlugs`: written only by `pnpm rename`.

## Slugs

Rule `slug`. The slug is the folder name and the URL.

- Lowercase ASCII kebab-case in the main language, with accents removed: `ciclo-de-krebs`.
- Platform routes are reserved: `404`, `api`, `catalog`, `cdn-cgi` and `drafts`.
- A slug can't be another artifact's slug or former slug, or a former slug of its own artifact.
- `pnpm new` and `pnpm rename` refuse every slug while any artifact's `id` or `formerSlugs` fails [Frontmatter](#frontmatter), because the slugs and IDs in use aren't known until then. Fix the field the refusal names, then run the command again.

## Links

Rule `link`. The build fails on a broken internal link, so [HTML](#html) failures show up only after links are fixed. External links aren't checked.

- Link to another artifact at its current slug: `/ciclo-de-krebs/`. A link to a former slug fails, and the failure names the current one.
- Cite a statement with `Ref`, not a link. Link to a question with `#q-<id>`, and to a heading with its ID: the heading text in lowercase, spaces as hyphens, punctuation dropped and accents kept (`## Função e área` is `#função-e-área`).
- Failures read "leads to no page", "leads to no page or file", "leads to no element with ID …" or "uses a former slug". Fix the link, or reword the passage when its target is gone.

## Artifact files

Rules `artifact-file` and `artifact-page`.

- The entry is `index.mdx`. Beside it go only `.d2` diagrams, `.svg` figures, images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.avif`) and custom builds (`<build>.build.ts`), with no subfolders.
- Each `<build>.build.ts` is the build of exactly one `Stage` in the entry, the one with `build="<build>"`. Failures read "is a custom build that no Stage in the entry names" (delete the file or add its Stage) and "is the build of 2 Stages; give each Stage its own build". While the entry's MDX doesn't compile, this rule waits: fix the build failure first.
- Nothing goes loose in `artifacts/` itself: every file belongs to an artifact folder.

## Content only

Rules `import` and `content-only`. An artifact holds prose, components and data.

- **Imports:** only components listed in `COMPONENTS.md`, `./x.d2`, `./x.d2?steps` and `./x.svg?raw`. Show an image with Markdown: `![What the photo shows](./foto.png)`. The entry never imports a build or `stage-build`: a Stage finds its build by name.
- **Props are data:** strings, numbers, `true`/`false`, imported names, and lists and objects of them.
- **MDX is JavaScript-free:** no `export`, no `{…}` expressions in prose (comments `{/* … */}` are fine), no `<style>` or `<script>`, no `style` or `on…` attributes and no `{...spread}`.
- **Literal braces and angle brackets** in prose start an expression or a tag. Write them inside code or math, or escaped as `\{`, `\}` and `\<`.
- **Figures** have no `<script>`, `<style>`, `on…` attributes or links (`<a>`).
- Write Markdown wherever it has a syntax. HTML elements such as `<span lang>`, `<sub>` or `<kbd>` are content and fine where it doesn't.
- **Behaviour goes only in a custom build**, under [Custom builds](#custom-builds). Everything else in the folder stays content.

## Languages

No check sees this rule, so it's yours to keep. Mark every passage in the other language with `lang`, so screen readers pronounce it in that language: `<span lang="en">…</span>` inside a sentence, `<p lang="en">…</p>` for a whole paragraph (`pt-BR` for Portuguese in an English artifact).

## Math

Rule `math`. Before writing math, read [math.md](math.md).

- Inline math is `$…$`. Display math is `$$` on its own line, the formula, then `$$` on its own line.
- A literal dollar sign is `\$` (`R\$ 50`), or it starts math.
- Math is strict LaTeX rendered by Temml. Put words, especially accented ones, in `\text{…}`: `$v_{\text{média}}$`.
- A failure reads "Temml can't render this math: …" at the formula.

## Code blocks

Rules `code-language`, `code-start` and `code-marks`.

- Give each fence its language in lowercase, as Shiki names it: ` ```ts `, ` ```python `, ` ```bash `, or ` ```text ` for plain text. A language Shiki doesn't know fails.
- Lines are numbered from 1. When the source numbers its lines from something else, such as a listing whose addresses start at 0, give the fence `start` after the language, ` ```pascal start=0 `, and keep the source's numbers: never renumber the listing, and never write the numbers into the code. `start` takes a whole number from 0; anything else (`start=-1`, `start=x`, `start=1.5`, `start=01`, a bare `start`) fails at the fence as `code-start`.
- Every line reference counts the number the page shows, from `start`: a one-block Stepper's `lines` and a Stage step's `lines` both name the block's first line `0` under `start=0`.
- To point at some lines of a plain block, mark them with `{…}` in the fence, after the language and beside any `start`: ` ```ts {3, 5-6} `, ` ```pascal start=0 {0-2} `. It takes the Stepper `lines` grammar, `3`, `3-5`, `3-` (to the end) or `1-2, 6`, and counts the number the page shows, from `start`. The marked lines stay in ink and the rest turn grey, on screen and in print. The marks are visual only, and screen readers hear the block as without them, so the prose around the block names the lines it points at ("lines 3, 5 and 6 …"). A line the block doesn't have, counted from its `start`, or a list the grammar refuses, fails at the fence as `code-marks`.
- `{…}` is for a plain block, and for each block of a Stepper with one code block per step, where it marks that step's lines. A one-block `<Stepper lines>` and a Stage mark their code's lines themselves, step by step, so a fence inside either with `{…}` fails as that component's own rule, `component-rule`.
- **Code that changes between steps** (a rewrite, an optimisation, a program growing) is a `Stepper` with one code block per step: no `diagram`, `figure` or `lines`, two or more fences inside it with blank lines around each, and `captions` with one caption per block. Each block keeps its own language, `start` and `{…}`; mark the lines that changed, or, before a deletion, the line about to go in the step before. Never redraw code as an SVG figure Stepper, which loses its text, highlighting and copying. When the code stays the same and only the lines in play change, use one block with `lines`. `lines` with several blocks, or this form with one block, fails as a `Stepper: …` `component-rule`.
- Math is never a fence: write ` ```math ` blocks as `$$…$$`.

## Diagrams and figures

Rule `d2`, and `TS2322` for a missing `alt` (see [Components](#components)). `COMPONENTS.md` has the import forms, props, colour classes and the stepper's `data-step` grammar. Before writing a `.d2` file or fixing a `d2` failure, read [d2.md](d2.md); before writing an `.svg`, read [figures.md](figures.md).

- **Real `alt`:** say what the drawing shows and what it means, in the main language. The check requires `alt` but accepts `alt=""`, which leaves screen readers with nothing: always write a real description.
- **Colours and style come from the design system.** Write no colours in a `.d2` file, and none of the styles [d2.md](d2.md) lists under "The design system's style". In an `.svg`, colour only with the `fill-` and `stroke-` classes.
- **One file, one place:** show each `.d2` file at most once per page, because a second rendering repeats its SVG IDs. Use a second file instead.
- **Captions:** give a `Diagram` or `Figure` a `caption` saying what to look for, unless the paragraph before already says it. The page writes its number before the caption.
- **Steppers:** give a stepper `captions` unless the prose around it explains each step. A `.d2?steps` file with fewer than two boards fails; `COMPONENTS.md` says how boards count. A figure Stepper is never for code: code that changes between steps is a Stepper with one code block per step ([Code blocks](#code-blocks)).

## Components

Rules `TS…` (type errors), `component-rule`, `question-id`, `statement-id`, `statement-section`, `statement-solution`, `citation-target` and `proof-target`. `COMPONENTS.md` is the reference for every component.

- **Type errors** name the prop: `Property 'alt' is missing …` means a required prop is missing, and `Type 'string' is not assignable to type 'number'` means a number was written as a string (`answer={2}`, not `answer="2"`). `NumericQuestion` is the exception: its `answer` is a string (`answer="9.81"`), so it keeps fractions and large numbers exact, while its `tolerance` and `relativeTolerance` are numbers (`tolerance={0.01}`).
- **Question IDs:** readable lowercase kebab-case (`ciclo-de-krebs-atp`), unique within the artifact. Write `id` as a plain string, `id="…"`, so failures point at the right line. The same ID in two different artifacts is fine. Failures read "the question ID `x` is already used at line N …" or "… isn't lowercase kebab-case". Each item of a `Matching` is a question, and its key in `answers` is its question ID under the same rules. Write each key as a plain string, `answers={{ "pilha": 3 }}`, so failures point at the right line, the key's.
- **The question ID rule** for revisions: keep a question's ID when earlier answers would still be valid answers to the revised question (fixing a typo, clarifying the wording, correcting the answer key). Correcting a `NumericQuestion`'s `answer`, `tolerance` or `relativeTolerance` keeps its ID too: past answers are marked again against the corrected key. Give it a new ID when it asks something different, or when changed options would make an old choice mean something else. Never reuse a removed question's ID for a different question: its old answers come back with it. The rule applies to each item of a `Matching` on its own. Its items share its options, so changing, reordering or removing an option can change what every item's old choice means: give each item whose old choices no longer mean the same a new ID. Adding an item reopens a finished attempt with only that item open.
- **Statements, proofs and citations:** [statements.md](statements.md) holds their rules and what each of their failures means.
- **A component's own rules** fail as `component-rule`, at the component's tag, with the message naming it first: `Stepper: …`, `Stage: …`, `SingleChoice: …`, `Matching: …`, `OpenQuestion: …`, `NumericQuestion: …`, `Figure: …` or `Figure or Stepper: …`, such as `Stepper: it has 1 step; give it at least two`. Every broken component is reported in one run, each at its own tag, found by the name the entry imports it as. A broken component renders nothing of itself, so a broken question is in no attempt. A Stage, a Matching and a Figure name every rule they break in one line. Fix each as its message says; `COMPONENTS.md` shows the shape each one expects.
  - `Figure: …` about a label or a swatch means a colouring breaks the label rule ([figures.md](figures.md), **Colourings**), and so does a `Stage: …` naming one, for a Stage's drawing: a label whose text isn't its colour's name, a `<g>` with a `fill-swatch-N` shape and no label or a label of another colour, a label without `x` and `y`, a swatch past the names `colours` gives, more than six names or a name longer than two characters; each part of the message says what to write instead. A `Stepper: …` about swatches means a figure Stepper drew some: draw the colouring as a `Figure`.
  - `Figure or Stepper: …` means the imported SVG file has no `<svg>` root or no `viewBox` ([figures.md](figures.md), **Root**). It points at the `Figure`, figure `Stepper` or `Stage` that draws the file.
  - `NumericQuestion: …` means its key can't work (an `answer` that isn't a number or uses `,`, so write `"9.81"`; both tolerances; a negative one; or a `relativeTolerance` on a zero `answer`); that it has no question inside it, before any `---`; or that a `---` has no explanation after it, so write one or leave the `---` out.
  - `SingleChoice: …` means its options aren't one numbered list ending the question, before any `---`; an option holds more than one paragraph; it has fewer than two options; its `answer` isn't one of their numbers; or a `---` has no explanation after it, so write one or leave the `---` out.
  - `Matching: …` means it isn't the prompt, its options as one numbered list, `---` between blank lines and its items as one bulleted list; something other than a second `---` and its explanation follows the items' list; a second `---` has no explanation after it, so write one or leave that `---` out; an option or item holds more than one paragraph or a list; it has fewer than two options or two items; `answers` doesn't give one answer per item; or an answer isn't one of the options' numbers.
  - A component inside a broken one isn't rendered, so while the outer one is broken, the entry's tags and the page's components of the inner one's kind may not count the same: then the line points at `1:1`, so search the entry for the component the message describes.
  - An artifact with a `component-rule` failure skips its other checks of the built page (question IDs, statements, links, first paint, HTML and its custom builds' runs) until it's fixed, and every other artifact is checked in full.
  - A `component-rule` at `astro.config.ts:1:1` names a page that isn't an artifact's, such as the catalog's, and falls under [Platform changes](#platform-changes).

## Custom builds

Rules `build-import`, `build-input`, `TS…` in a `.build.ts` file and `stage-run`. A custom build is the behaviour of one `Stage`: a `<build>.build.ts` file beside the entry whose default export is `defineBuild({ steps(choice) { … } })` for a Stage with `choose`, `defineBuild<{ inicio: string; busca: string }>({ steps(chosen) { … } })` for one whose `choose` is a list of groups, by the groups' names, or `defineBuild<{ a: number; b: number }>({ steps(input) { … } })` for one with `input`, or `trace(machine, notes)` for a machine the design system holds. `COMPONENTS.md`'s Stage entry is its whole reference.

- **Write one only when no component can do the job.** A fixed sequence of steps is a `Stepper`. Anything that asks the owner something and records the answer is a question component, next to the Stage if need be: a build never records answers and keeps nothing after a reload.
- **A machine the design system has is traced.** A build that runs a machine the design system holds, such as MEPA, is `trace(machine, notes)`, as [stage.md](stage.md) says, never a copy of the machine's instructions.
- **The second time, propose a component or a machine.** Before writing a build that does the same job as one already in `artifacts/` (the same job by what the owner does with it, not the same topic), stop and propose a design system component to the owner instead, or a machine when the job is running a program on an abstract machine, showing what the two builds share and how they differ. If the owner says "not yet", write the build, and put a comment at the top of both builds saying so, each linking the other, so the next agent proposes again with three cases.
- **Missing a control or a mark?** Propose the Stage addition to the owner rather than working around it: no fake options, no code in a table, no marks drawn into the SVG by hand. The Stage today takes `choose`, one row of options or several choice groups, or typed whole numbers and text (`input`), and marks the drawing's parts, the tables' rows and cells, and the code block's lines, colours the drawing's parts with its colouring's swatches (`colours`), and rewrites the rows of its one table (`body`). It hands its build the content as written, the code block's lines and the tables' rows, and the artifact's main language, so the build reads a program from the content rather than repeating it. With `beside` it sets its tables beside its drawing on a wide screen: set it sparingly, only where a step's marks and its rows must be seen together, as `COMPONENTS.md`'s "Beside the drawing" says.
- **Before writing a build, read [stage.md](stage.md):** its imports, types, typed input, code lines, table rows, marks and every failure the check gives a build.

## HTML

Rules `html-validate/…`, checked on the built page and mapped back to the entry by its text, so the line can be off: search the entry for the element the message describes.

- **Headings:** the title is the page's `h1`, so the entry's first heading is `##`, and levels go down one at a time (`heading-level`).
- **IDs are unique on the page** (`no-dup-id`): no two headings with the same text, and no heading whose ID equals `q-<question id>`, `artifact-attempts-heading` or `artifact-contents-heading`. SVG IDs in figures count too.
- **Links have text** (`wcag/h30`).

## Build failures

Rules `build`, `build-warning` and `build-warning/…`. The build stopped, so checks of the built pages are skipped until it passes.

- MDX syntax, such as an unclosed tag, fails at its line in the entry.
- Any other error Astro stops on fails at the position Astro gives, or at `astro.config.ts:1:1` when it gives none.

## Platform changes

These failures are in files outside `artifacts/`: the platform, the design system or their tooling. In an artifact session, tell the owner what fails and change those files only after they confirm. In a platform session, fix them under `CODING_STANDARDS.md`, which covers `component-reference` too.

`first-paint` means the build couldn't move an artifact page's module scripts into its `<head>` to hold its first paint (`src/first-paint.ts`).

`component-rule` at `astro.config.ts:1:1` means a design system component on a page that isn't an artifact's, such as the catalog's, breaks its own rule. The message is the component's, as [Components](#components) reads it, followed by the page's route: `Stepper: it has 1 step; give it at least two; on /catalog/, which isn't an artifact's page`.
