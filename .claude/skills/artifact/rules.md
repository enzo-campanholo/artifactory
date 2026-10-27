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

Rule `code-language`.

- Give each fence its language in lowercase, as Shiki names it: ` ```ts `, ` ```python `, ` ```bash `, or ` ```text ` for plain text. A language Shiki doesn't know fails.
- Math is never a fence: write ` ```math ` blocks as `$$…$$`.

## Diagrams and figures

Rule `d2`, and `TS2322` for a missing `alt` (see [Components](#components)). `COMPONENTS.md` has the import forms, props, colour classes and the stepper's `data-step` grammar. Before writing a `.d2` file or fixing a `d2` failure, read [d2.md](d2.md); before writing an `.svg`, read [figures.md](figures.md).

- **Real `alt`:** say what the drawing shows and what it means, in the main language. The check requires `alt` but accepts `alt=""`, which leaves screen readers with nothing: always write a real description.
- **Colours and style come from the design system.** Write no colours in a `.d2` file, and none of the styles [d2.md](d2.md) lists under "The design system's style". In an `.svg`, colour only with the `fill-` and `stroke-` classes.
- **One file, one place:** show each `.d2` file at most once per page, because a second rendering repeats its SVG IDs. Use a second file instead.
- **Captions:** give a `Diagram` or `Figure` a `caption` saying what to look for, unless the paragraph before already says it. The page writes its number before the caption.
- **Steppers:** give a stepper `captions` unless the prose around it explains each step. A `.d2?steps` file with fewer than two boards fails; `COMPONENTS.md` says how boards count.

## Components

Rules `TS…` (type errors), `question-id`, `statement-id`, `statement-section`, `statement-solution`, `citation-target` and `proof-target`. `COMPONENTS.md` is the reference for every component.

- **Type errors** name the prop: `Property 'alt' is missing …` means a required prop is missing, and `Type 'string' is not assignable to type 'number'` means a number was written as a string (`answer={2}`, not `answer="2"`). `NumericQuestion` is the exception: its `answer` is a string (`answer="9.81"`), so it keeps fractions and large numbers exact, while its `tolerance` and `relativeTolerance` are numbers (`tolerance={0.01}`).
- **Question IDs:** readable lowercase kebab-case (`ciclo-de-krebs-atp`), unique within the artifact. Write `id` as a plain string, `id="…"`, so failures point at the right line. The same ID in two different artifacts is fine. Failures read "the question ID `x` is already used at line N …" or "… isn't lowercase kebab-case".
- **The question ID rule** for revisions: keep a question's ID when earlier answers would still be valid answers to the revised question (fixing a typo, clarifying the wording, correcting the answer key). Correcting a `NumericQuestion`'s `answer`, `tolerance` or `relativeTolerance` keeps its ID too: past answers are marked again against the corrected key. Give it a new ID when it asks something different, or when changed options would make an old choice mean something else. Never reuse a removed question's ID for a different question: its old answers come back with it.
- **Statements, proofs and citations:** [statements.md](statements.md) holds their rules and what each of their failures means.
- A component's own rule, such as a `SingleChoice` without a numbered list, fails as `build` (see [Build failures](#build-failures)).

## Custom builds

Rules `build-import`, `build-input`, `TS…` in a `.build.ts` file and `stage-run`. A custom build is the behaviour of one `Stage`: a `<build>.build.ts` file beside the entry whose default export is `defineBuild({ steps(choice) { … } })` for a Stage with `choose`, or `defineBuild<{ a: number; b: number }>({ steps(input) { … } })` for one with `input`. `COMPONENTS.md`'s Stage entry is its whole reference.

- **Write one only when no component can do the job.** A fixed sequence of steps is a `Stepper`. Anything that asks the owner something and records the answer is a question component, next to the Stage if need be: a build never records answers and keeps nothing after a reload.
- **The second time, propose a component.** Before writing a build that does the same job as one already in `artifacts/` (the same job by what the owner does with it, not the same topic), stop and propose a design system component to the owner instead, showing what the two builds share and how they differ. If the owner says "not yet", write the build, and put a comment at the top of both builds saying so, each linking the other, so the next agent proposes again with three cases.
- **Missing a control or a mark?** Propose the Stage addition to the owner rather than working around it: no fake options, no code in a table, no marks drawn into the SVG by hand. The Stage today takes `choose` or typed whole numbers (`input`), and marks the drawing's parts, the tables' rows and cells, and the code block's lines, and rewrites the rows of its one table (`body`). With `beside` it sets its tables beside its drawing on a wide screen: set it sparingly, only where a step's marks and its rows must be seen together, as `COMPONENTS.md`'s "Beside the drawing" says.
- **Before writing a build, read [stage.md](stage.md):** its imports, types, typed input, code lines, table rows, marks and every failure the check gives a build.

## HTML

Rules `html-validate/…`, checked on the built page and mapped back to the entry by its text, so the line can be off: search the entry for the element the message describes.

- **Headings:** the title is the page's `h1`, so the entry's first heading is `##`, and levels go down one at a time (`heading-level`).
- **IDs are unique on the page** (`no-dup-id`): no two headings with the same text, and no heading whose ID equals `q-<question id>`, `artifact-attempts-heading` or `artifact-contents-heading`. SVG IDs in figures count too.
- **Links have text** (`wcag/h30`).

## Build failures

Rules `build`, `build-warning` and `build-warning/…`. The build stopped, so checks of the built pages are skipped until it passes.

- MDX syntax, such as an unclosed tag, fails at its line in the entry.
- A component's own rule fails with its name first: `Stepper: …`, `Stage: …`, `SingleChoice: …`, `OpenQuestion: …`, `NumericQuestion: …`, `Figure or Stepper: …`. A Stage names every rule it breaks in one line. `NumericQuestion: …` means its key can't work (an `answer` that isn't a number or uses `,`, so write `"9.81"`; both tolerances; a negative one; or a `relativeTolerance` on a zero `answer`) or that it has no question inside it. The line points at the entry of the artifact whose page failed: at the component when the entry has only one with that name, otherwise at `1:1`, so search the entry for that component. Fix it as the message says (`COMPONENTS.md` shows the shape each one expects) and check again: the build stops at the first one, so another may fail next.

## Platform changes

These failures are in files outside `artifacts/`: the platform, the design system or their tooling. In an artifact session, tell the owner what fails and change those files only after they confirm. In a platform session, fix them under `CODING_STANDARDS.md`, which covers `component-reference` too.

`first-paint` means the build couldn't move an artifact page's module scripts into its `<head>` to hold its first paint (`src/first-paint.ts`).
