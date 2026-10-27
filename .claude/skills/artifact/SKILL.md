---
name: artifact
description: Study artifacts in `artifacts/`. Use to create one from the owner's request or source material, revise one, publish a draft, make one public or private, rename or delete one, and to fix a `pnpm check` or CI failure that names an "artifact skill" section.
---

# Study artifacts

An artifact is the folder `artifacts/<slug>/`: an `index.mdx` entry, plus the `.d2` diagrams, `.svg` figures and images it shows, and the custom build of each `Stage` in it. It holds content and data, plus behaviour only inside a Stage, and the design system draws everything ([ADR 0007](../../../docs/adr/0007-artifacts-contain-content-data-and-staged-behaviour.md)). The owner opens it at `https://<domain>/<slug>/`, where the domain is the repository variable `ARTIFACTORY_DOMAIN` (`gh variable get ARTIFACTORY_DOMAIN`).

## Authority

- **Publish without asking.** Creating, revising and publishing a draft are what the owner asked for, so do them and reply with the URL.
- **Draft only on request.** Make an artifact a draft (`--draft`) only when the owner asks for one.
- **Make public or private, rename or delete only the artifact the owner names.** The request is the confirmation. For a vague request ("share the Cálculo ones", "tidy up the old Bioquímica ones"), list exactly which artifacts you'll change, by slug and title, and wait for the owner's yes. Many artifacts are built from course material the owner can't share, so each stays private until the owner names it. Rename or delete nothing on your own initiative: a changed title or main language keeps its slug.
- **Stay inside `artifacts/`.** When an artifact needs something the design system lacks, make do with the components that exist, or propose the addition to the owner and wait.
- **Keep source material out of git.** Read it where the owner provided it. If it must be saved, put it in the git-ignored `sources/` folder at the repo root.

## Before writing

- In a fresh cloud session without `node_modules/`, run `pnpm install --frozen-lockfile`.
- Read `design-system/COMPONENTS.md`, the whole component reference: what each component is for, its props, a usage example and the colour classes.

## Workflows

Each workflow ends with the shared steps under [Finishing](#finishing). An artifact is done when CI is green on `main` and the owner has the URL.

### Create

1. Scaffold: `pnpm new <slug> --subject "<Subject>" --lang <pt-BR|en> [--draft]`. It refuses a slug or subject that breaks [Slugs](#slugs) or [Frontmatter](#frontmatter), and prints the subjects already in use.
2. Write `artifacts/<slug>/index.mdx` from the source material, following [A good study artifact](#a-good-study-artifact) and the [writing rules](#writing-rules). The starter entry shows one of each common pattern:
   - Replace the placeholder title, which `pnpm new` made from the slug without accents.
   - Replace every example with the artifact's own content.
   - Delete the starter comment and every pattern the artifact doesn't use, including `diagram.d2` or `figure.svg` and their import lines.
3. Finish: look, check, publish, watch CI, reply.

### Revise

1. Edit the entry and its files in place. Keep `id`, the slug and `published` as they are, so the owner's answers stay attached. Follow the question ID rule under [Components](#components).
2. Finish: look (if a diagram, figure or `Stage` changed), check, publish, watch CI, reply.

### Publish a draft

1. Set `draft: false`, and set `published` to today's date in São Paulo, the owner's day (`TZ=America/Sao_Paulo date +%F`), not the session's UTC date. The artifact then appears at the top of the Library.
2. Finish: check, publish, watch CI, reply.

### Make public

1. Set `public: true` in the frontmatter. If the artifact is a draft, publish it in the same change, as in [Publish a draft](#publish-a-draft).
2. Finish: check, publish, watch CI, reply. The reply gives the URL and says that anyone with the link can open it once CI is green, that search engines don't list it, and that the Library marks it "Public"; if it was a draft, say you published it.

### Make private

1. Remove the `public` line.
2. Finish: check, publish, watch CI, reply. The reply says that anyone with the link now meets the owner's sign-in.

### Rename

1. `pnpm rename <old-slug> <new-slug>`. It moves the folder, records the old slug as a former slug in `formerSlugs` and rewrites links to it in other artifacts, then prints what it did. It refuses a new slug that breaks [Slugs](#slugs). Renaming back to a former slug is fine: `pnpm rename` takes it off the list. `formerSlugs` is `pnpm rename`'s alone, and the build turns each former slug into a permanent redirect, so there's no `_redirects` file to edit. A public artifact's former slugs stay open while it's public, so a link the owner sent before the rename still works.
2. Finish: check, publish, watch CI, reply with the new URL.

### Delete

1. `git rm -r artifacts/<slug>/`.
2. Run `pnpm check`. Every link to the deleted artifact fails as `link` ("leads to no page"). Reword each of those passages so it reads well without the link, and check again.
3. Finish: publish, watch CI, and reply that the artifact is gone. The owner's answers stay stored, and restoring the folder from git brings them back.

## Finishing

### Look

For every new or changed diagram, figure and `Stage` (its build included), run `pnpm look <slug>`. It builds the site and screenshots each `Diagram`, `Figure`, diagram or figure `Stepper` (every step) and `Stage` at 393 px (a phone) and 1920 px (a 1080p screen) into `.look/<slug>/`. Each shot is the item alone, as wide as it sits on the page, so the 1920 px shots are the text column's width, not the screen's. Above each item's files it prints the item's number, its kind, the number its caption shows (`Figure 2.1`) and its `alt`. Cite a figure or Stage in the prose by that printed number. Open every PNG and compare it with its `alt`: labels overlapping or cut off, text too small at 393 px, a drawing far wider than it is tall, a step that shows the wrong part, a mark that doesn't read at 393 px. Fix and look again, until every screenshot matches its `alt` and reads well at both widths.

Look also writes `.look/<slug>/results.json` and a `contact-sheet.html` that helps find shots; judge the original PNGs. `captured-awaiting-visual-review` means a person still has to look, never a visual pass. Failed assertions, unavailable Chromium and unsupported capabilities aren't passes either.

A `Stage` (kind `stage-choose`, or `stage-input` for typed input) is shot as written, then at every step of its first option, or of its first example, which Look runs by pressing Start on the fields as written:

- Only the first option or example is shot; `pnpm check` runs the others. Put the one worth looking at first in `choose.options` or `input.examples`.
- Under the Stage, Look prints what it ran and its count of steps (`first option A, 5 steps`, `first example a = 48, b = 18, 5 steps`), or the refusal it got.
- Compare each step's shot with the step's line as well as the `alt`. A Stage without `figure` has no `alt`: Look prints its caption instead, so compare its shots with the caption and the step's line.
- Look asserts the current step and advancement after each action; a stuck control fails rather than producing repeated shots labelled as different steps.

If the build fails, `pnpm look` says so: run `pnpm check` to see why. If Chrome can't be downloaded or started (possible in a cloud session), note it for the reply and go on to the check.

### Check

While writing, use `pnpm check --artifacts-only` for faster feedback: it runs every artifact rule but skips the platform's type checks, ESLint, Prettier and Vitest. Finish with the full gate below before publishing.

To finish artifact work on `main`, pass the latest green CI run's commit to `--last-passed`, so the check skips the platform tests when only artifacts changed:

```sh
last_passed=$(
  gh run list --workflow ci.yml --branch main --status success --limit 1 --json headSha --jq '.[0].headSha // empty'
) || last_passed=
pnpm check ${last_passed:+--last-passed "$last_passed"}
```

With no SHA, this runs the full gate. On another branch, or for platform work, run plain `pnpm check`.

`--last-passed` skips only Vitest, and only when every changed or untracked file is under `artifacts/`, `.scratch/` or `docs/`, or nothing changed. A platform file or an untracked root file runs the tests; an unavailable comparison SHA runs them too. The log gives the reason. Ordinary `pnpm check` always runs Vitest.

The gate can take 20 minutes or more when other jobs share the machine, so run it in the background and wait for it to finish, rather than under a foreground timeout that kills it. It ends with a `pnpm check: N failures` block that repeats every failure:

```
artifacts/<slug>/index.mdx:12:5 error <rule>: <what's wrong> (artifact skill: <section>)
```

Each section is one of the [writing rules](#writing-rules) below: read it, fix every failure, and run the check again until it reports none. Checks of the built pages are skipped while the build fails, so new failures can appear once the build passes.

For interrupted work, read [local evidence](../../../docs/agents/delegation.md#local-evidence) before rerunning anything.

To see the page while writing, `pnpm dev` serves it at `http://localhost:4321/<slug>/` with throwaway state, which never touches the owner's answers. It's optional; the check is the gate.

### Publish

1. Commit only the changes under `artifacts/`, with a message such as "Add the Krebs cycle artifact".
2. Push straight to `main`: `git push origin HEAD:main`.
3. If the push is rejected because someone pushed first, run `git pull --rebase origin main`, check again and push again.

### Watch CI

1. Find the run for your commit: `gh run list --commit "$(git rev-parse HEAD)"` (it can take a few seconds to appear).
2. `gh run watch <id> --exit-status`. A publish run skips the platform tests and takes about a minute; its log says `pnpm check: skipped Vitest: …`. It takes about six when platform files changed since the last green run. If the run ends cancelled, a newer push replaced it while it waited. That run checks your commit too, so watch it instead: `gh run list --branch main --limit 1`.
3. If it goes red, fixing it comes before anything else. Read the failures with `gh run view <id> --log-failed | tail -n 60`: the tail holds the same `pnpm check: N failures` block. Fix, check, push and watch again. A red check leaves the previous version live.
4. On `main`, the steps after the check deploy the site, set what's open, then probe from outside what is. Their failures aren't check failures, so their log has no failures block:
   - **Close public paths** red: nothing was deployed, and an artifact going private may still be open.
   - **Open public paths** red: the new version is live, but an artifact going public may still be behind the sign-in.
   - **Probe** red: the new version is live, but a path is open or closed that shouldn't be, such as an artifact going public still behind the sign-in or one going private still open.

   Rerun once with `gh run rerun <id>` and watch it. If the step is red again, tell the owner what its log says. For Close or Open, give its last lines (`gh run view <id> --log-failed | tail -n 20`): a missing token, a Cookie Path Attribute that's on, or another Access app using the public artifacts' policy is theirs to fix in GitHub's or Cloudflare's settings. For the Probe, give its `OFF` lines (`gh run view <id> --log-failed | grep ' OFF '`): each names a path, what it should answer and what it answered.

### Reply

Give the owner the URL, `https://<domain>/<slug>/` (a draft is also listed on the drafts page, `/drafts/`), and a line on what the artifact covers. If `gh variable get ARTIFACTORY_DOMAIN` finds nothing, the site isn't deployed yet: give the local URL from `pnpm dev`, `http://localhost:4321/<slug>/`, instead. Mention anything you couldn't do, such as `pnpm look` failing to start Chrome.

## A good study artifact

The owner studies alone with it, on a phone or a laptop.

- **Teach the source material.** Cover what the source covers, accurately, in the artifact's main language. Add context only where it makes the material clearer, and invent no facts, figures or citations.
- **Open with the point.** The first paragraph says what the artifact covers and why it matters. Then build from what the owner already knows towards what's new, one idea per `##` section.
- **Name the sections.** The `##` headings are the page's contents: with three or more, the page lists them beside the text on a laptop and in a folded contents line on the phone. Write each as the short name of what the section covers (`## Função e área`), not a sentence, a question or a label such as `## Parte 2`.
- **Write paragraphs that can be cited.** The page numbers every section, `###` subsection, paragraph and statement after the first `##` in the margin (1, 1.1, 1.2), display equations on their own series ((1), (2)), and figures and diagrams by section (Figura 4.1). Never number them yourself, and keep each paragraph to one point so its number means something. Refer to them by those numbers: "pela equação (2)", "na Figura 3.1".
- **State definitions and results as statements.** Write each definition, theorem, lemma or corollary the source names as a `Statement`, at the top level of a section, never as bold text or a heading. Its number is the next clause number, in the paragraphs' series. Cite it anywhere in the artifact with `<Ref to="…" />`, which reads "Teorema 2.1" and links to it; write the article yourself ("pelo <Ref to="valor-medio" />"). Write the proof the source gives a theorem, lemma or corollary as a `<Proof of="…">` right after the statement: it and its paragraphs take no number, and the page opens it with "Demonstração." and ends it with a square. Keep it at the section's top level too: nested in a list or a question, a proof never counts as following its statement, so it always opens by naming it, and its equations go unnumbered. A proof the source gives later opens "Demonstração do Teorema 2.1." on its own, so keep it where the source puts it. Work each problem the source solves as a `<Statement kind="example">`: the problem, `---` between blank lines, then the solution, which the page shows openly after "Solução.". An example teaches and a question tests, so when the owner should work a problem out themselves, ask it as an `OpenQuestion` or `NumericQuestion` instead, typically right after an example of the same kind. Explanations stay in paragraphs, and asides in a `Note`.
- **Put asides in a `Note`.** A remark that would interrupt the sentence goes in a `Note` at the end of its paragraph, which the page sets in the margin. What the owner must read stays in the paragraph.
- **Show, then ask.** Explain an idea, show it with a worked example, a diagram or a stepper, then ask a question about it while it's fresh. Spread questions through the artifact, after the idea they test. The page numbers the questions in order and letters the options, so don't number or letter them yourself.
- **Pick the form that fits.** Math for formulas, a code block for code, a `Diagram` for structure and flow, a `Figure` for plots and shapes, a `Stepper` when the order is the point, a `Stage` when the steps depend on what the owner chooses (see [Custom builds](#custom-builds)). `COMPONENTS.md` says when to use each.
- **Tables are for data, lists for sentences.** Use a Markdown table when the owner compares short cells down a column: values, symbols, terms. Mark a column of numbers `---:` to align it right. When a row's cells are sentences, write a list instead: on the phone, three columns of sentences wrap to two or three words a line.
- **Ask questions that test understanding.** Ask about why and how, not about the artifact's own wording. In a `SingleChoice`, make every wrong option a mistake someone could really make. In an `OpenQuestion`, write a model answer that shows the reasoning, not just the result.
- **Ask for a number when the owner should compute it.** When the answer is a value the owner works out (a force, a probability, a root), use a `NumericQuestion` rather than a `SingleChoice`, whose options would let them work backwards. Ask one number per question: a vector's components or a quadratic's two roots are separate questions. Give a `tolerance` (or `relativeTolerance`) that matches the precision the computation really has, such as `0.01` for an answer rounded to two decimal places; without one the check is exact, which suits only exact answers such as `"3/4"`.
- **Write plainly.** Short paragraphs, defined terms, concrete examples.

## Writing rules

A `pnpm check` failure names one of these sections. Each one holds every rule of its kind.

### Frontmatter

`pnpm new` writes the frontmatter. Rules `frontmatter`, `artifact-id`, `subject` and `public`.

- `id`: the permanent artifact ID, which the owner's answers belong to. Leave it exactly as `pnpm new` wrote it, quotes included.
- **Never copy an artifact folder**, not even one from git history: the copy carries the original's ID, and `artifact-id` fails on both. Create every artifact with `pnpm new`. If a copy exists, recreate it with `pnpm new`, move its content over, and keep the original's ID.
- `title`: plain text in the main language, with its accents. Math, code and Markdown don't render in it, so write a symbol in Unicode (xⁿ, π, √2) or in words, and keep formulas for the text. A backtick or two `$` fail with "`title` is plain text"; a single `$` (R$ 10) passes.
- `subject`: exactly one, spelled exactly as other artifacts on that topic spell it. `pnpm new` prints the subjects in use. `subject` fails when two spellings differ only in case or accents; change the new artifact's spelling to the existing one.
- `lang`: the main language, `pt-BR` or `en`.
- `published`: the published date, unquoted (`2026-10-15`), the São Paulo date of the day it first appeared. Only publishing a draft changes it.
- `draft`: `true` keeps the artifact out of the Library.
- `public`: `true` opens the artifact to anyone with its link, and `false`, the default, keeps it behind the owner's sign-in. Set or remove it only as in [Make public](#make-public) and [Make private](#make-private). A draft can't be public: `frontmatter` fails at the `public` line ("`public` can't be true on a draft"). Remove `public`, unless the owner asked for this artifact to be public: then follow [Make public](#make-public).
- One Access app opens at most 50 paths: two for each public artifact and for each of its former slugs, plus two shared by all. When the public artifacts need more, `public` fails at every public artifact. Never choose which to make private: list the public artifacts to the owner by slug and title, and wait.
- `formerSlugs`: written only by `pnpm rename`.

### Slugs

Rule `slug`. The slug is the folder name and the URL.

- Lowercase ASCII kebab-case in the main language, with accents removed: `ciclo-de-krebs`.
- Platform routes are reserved: `404`, `api`, `catalog`, `cdn-cgi` and `drafts`.
- A slug can't be another artifact's slug or former slug, or a former slug of its own artifact.
- `pnpm new` and `pnpm rename` refuse every slug while any artifact's `id` or `formerSlugs` fails [Frontmatter](#frontmatter), because the slugs and IDs in use aren't known until then. Fix the field the refusal names, then run the command again.

### Links

Rule `link`. The build fails on a broken internal link, so [HTML](#html) failures show up only after links are fixed. External links aren't checked.

- Link to another artifact at its current slug: `/ciclo-de-krebs/`. A link to a former slug fails, and the failure names the current one.
- Cite a statement with `Ref`, not a link. Link to a question with `#q-<id>`, and to a heading with its ID: the heading text in lowercase, spaces as hyphens, punctuation dropped and accents kept (`## Função e área` is `#função-e-área`).
- Failures read "leads to no page", "leads to no page or file", "leads to no element with ID …" or "uses a former slug". Fix the link, or reword the passage when its target is gone.

### Artifact files

Rules `artifact-file` and `artifact-page`.

- The entry is `index.mdx`. Beside it go only `.d2` diagrams, `.svg` figures, images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.avif`) and custom builds (`<build>.build.ts`), with no subfolders.
- Each `<build>.build.ts` is the build of exactly one `Stage` in the entry, the one with `build="<build>"`. Failures read "is a custom build that no Stage in the entry names" (delete the file or add its Stage) and "is the build of 2 Stages; give each Stage its own build". While the entry's MDX doesn't compile, this rule waits: fix the build failure first.
- Nothing goes loose in `artifacts/` itself: every file belongs to an artifact folder.

### Content only

Rules `import` and `content-only`. An artifact holds prose, components and data.

- **Imports:** only components listed in `COMPONENTS.md`, `./x.d2`, `./x.d2?steps` and `./x.svg?raw`. Show an image with Markdown: `![What the photo shows](./foto.png)`. The entry never imports a build or `stage-build`: a Stage finds its build by name.
- **Props are data:** strings, numbers, `true`/`false`, imported names, and lists and objects of them.
- **MDX is JavaScript-free:** no `export`, no `{…}` expressions in prose (comments `{/* … */}` are fine), no `<style>` or `<script>`, no `style` or `on…` attributes and no `{...spread}`.
- **Literal braces and angle brackets** in prose start an expression or a tag. Write them inside code or math, or escaped as `\{`, `\}` and `\<`.
- **Figures** have no `<script>`, `<style>`, `on…` attributes or links (`<a>`).
- Write Markdown wherever it has a syntax. HTML elements such as `<span lang>`, `<sub>` or `<kbd>` are content and fine where it doesn't.
- **Behaviour goes only in a custom build**, under [Custom builds](#custom-builds). Everything else in the folder stays content.

### Languages

No check sees this rule, so it's yours to keep. Mark every passage in the other language with `lang`, so screen readers pronounce it in that language: `<span lang="en">…</span>` inside a sentence, `<p lang="en">…</p>` for a whole paragraph (`pt-BR` for Portuguese in an English artifact).

### Math

Rule `math`. Before writing math, read [math.md](math.md).

- Inline math is `$…$`. Display math is `$$` on its own line, the formula, then `$$` on its own line.
- A literal dollar sign is `\$` (`R\$ 50`), or it starts math.
- Math is strict LaTeX rendered by Temml. Put words, especially accented ones, in `\text{…}`: `$v_{\text{média}}$`.
- A failure reads "Temml can't render this math: …" at the formula.

### Code blocks

Rule `code-language`.

- Give each fence its language in lowercase, as Shiki names it: ` ```ts `, ` ```python `, ` ```bash `, or ` ```text ` for plain text. A language Shiki doesn't know fails.
- Math is never a fence: write ` ```math ` blocks as `$$…$$`.

### Diagrams and figures

Rule `d2`, and `TS2322` for a missing `alt` (see [Components](#components)). `COMPONENTS.md` has the import forms, props, colour classes and the stepper's `data-step` grammar. Before writing a `.d2` file, read [d2.md](d2.md); before writing an `.svg`, read [figures.md](figures.md).

- **Real `alt`:** say what the drawing shows and what it means, in the main language. The check requires `alt` but accepts `alt=""`, which leaves screen readers with nothing: always write a real description.
- **Colours and style come from the design system.** Write no colours in a `.d2` file, and none of the styles [d2.md](d2.md) lists under "The design system's style". In an `.svg`, colour only with the `fill-` and `stroke-` classes.
- **One file, one place:** show each `.d2` file at most once per page, because a second rendering repeats its SVG IDs. Use a second file instead.
- **Captions:** give a `Diagram` or `Figure` a `caption` saying what to look for, unless the paragraph before already says it. The page writes its number before the caption.
- **Steppers:** give a stepper `captions` unless the prose around it explains each step. A `.d2?steps` file with fewer than two boards fails; `COMPONENTS.md` says how boards count.
- **Failures:** "D2 can't compile this diagram: …" at the `.d2` line; "A stepper needs at least two boards …"; "`a` has a link, but diagrams draw no links, tooltips or icons …" and "`a` sets `style.shadow`, but diagrams cast no shadows …" (one for each style in d2.md's "The design system's style") at the line that asks for it. D2 reports syntax errors before others, so a fixed file can fail again with new errors.

### Components

Rules `TS…` (type errors), `question-id`, `statement-id`, `statement-section`, `statement-solution`, `citation-target` and `proof-target`. `COMPONENTS.md` is the reference for every component.

- **Type errors** name the prop: `Property 'alt' is missing …` means a required prop is missing, and `Type 'string' is not assignable to type 'number'` means a number was written as a string (`answer={2}`, not `answer="2"`). `NumericQuestion` is the exception: its `answer` is a string (`answer="9.81"`), so it keeps fractions and large numbers exact, while its `tolerance` and `relativeTolerance` are numbers (`tolerance={0.01}`).
- **Question IDs:** readable lowercase kebab-case (`ciclo-de-krebs-atp`), unique within the artifact. Write `id` as a plain string, `id="…"`, so failures point at the right line. The same ID in two different artifacts is fine. Failures read "the question ID `x` is already used at line N …" or "… isn't lowercase kebab-case".
- **The question ID rule** for revisions: keep a question's ID when earlier answers would still be valid answers to the revised question (fixing a typo, clarifying the wording, correcting the answer key). Correcting a `NumericQuestion`'s `answer`, `tolerance` or `relativeTolerance` keeps its ID too: past answers are marked again against the corrected key. Give it a new ID when it asks something different, or when changed options would make an old choice mean something else. Never reuse a removed question's ID for a different question: its old answers come back with it.
- **Statement IDs:** readable lowercase kebab-case (`valor-medio`), unique among the artifact's statements, written as a plain string, `id="…"`. A question may use the same ID. A statement's ID holds no answers, so renaming it only means updating its citations. Failures read "the statement ID `x` is already used at line N …" or "… isn't lowercase kebab-case".
- **Statements stand at a section's top level:** the margin numbers only a section's own paragraphs, `###`s and statements, so a statement anywhere else would have no number to cite. "the statement `x` has no section number" (`statement-section`) means it comes before the first `##` heading, or sits inside a list, a question or another component. Move it to the top level of a section.
- **Only examples have solutions:** "the example `x` has no solution" (`statement-solution`) means it lacks a `---` between blank lines with the solution after it: write both. A `---` right under a line of text turns that line into a heading, so keep the blank line above it. "the `theorem` `x` has a `---`, but only an example has a solution" means a definition, theorem, lemma or corollary holds one: make it `kind="example"` when it works a problem, or move what follows the `---` after the statement, as a `<Proof of="x">` when it proves a theorem, lemma or corollary and as a paragraph otherwise. "… has a `---` with nothing after it" means the `---` is stray: remove it.
- **Citations:** "the citation `x` names no statement in this artifact" (`citation-target`) means no `Statement` has the `id` that `Ref`'s `to` names. Correct `to`, or reword the passage when the statement is gone.
- **Proofs prove claims:** a `Proof`'s `of` names the `id` of a theorem, lemma or corollary. "the proof of `x` names no statement in this artifact" (`proof-target`) means no `Statement` has that `id`: correct `of`. "… names a statement of kind `definition`" (or `example`) means it proves something that takes no proof: point `of` at the result it proves, or make the text a paragraph (for an example, its solution after `---`).
- A component's own rule, such as a `SingleChoice` without a numbered list, fails as `build` (see [Build failures](#build-failures)).

### Custom builds

Rules `build-import`, `build-input`, `TS…` in a `.build.ts` file and `stage-run`. A custom build is the behaviour of one `Stage`: a `<build>.build.ts` file beside the entry whose default export is `defineBuild({ steps(choice) { … } })` for a Stage with `choose`, or `defineBuild<{ a: number; b: number }>({ steps(input) { … } })` for one with `input`. `COMPONENTS.md`'s Stage entry is its whole reference.

- **Write one only when no component can do the job.** A fixed sequence of steps is a `Stepper`. Anything that asks the owner something and records the answer is a question component, next to the Stage if need be: a build never records answers and keeps nothing after a reload.
- **The second time, propose a component.** Before writing a build that does the same job as one already in `artifacts/` (the same job by what the owner does with it, not the same topic), stop and propose a design system component to the owner instead, showing what the two builds share and how they differ. If the owner says "not yet", write the build, and put a comment at the top of both builds saying so, each linking the other, so the next agent proposes again with three cases.
- **Missing a control or a mark?** Propose the Stage addition to the owner rather than working around it: no fake options, no code in a table, no marks drawn into the SVG by hand. The Stage today takes `choose` or typed whole numbers (`input`), and marks the drawing's parts, the tables' rows and cells, and the code block's lines, and rewrites the rows of its one table (`body`). With `beside` it sets its tables beside its drawing on a wide screen: set it sparingly, only where a step's marks and its rows must be seen together, as `COMPONENTS.md`'s "Beside the drawing" says.
- **Before writing a build, read [stage.md](stage.md):** its imports, types, typed input, code lines, table rows, marks and every failure the check gives a build.

### HTML

Rules `html-validate/…`, checked on the built page and mapped back to the entry by its text, so the line can be off: search the entry for the element the message describes.

- **Headings:** the title is the page's `h1`, so the entry's first heading is `##`, and levels go down one at a time (`heading-level`).
- **IDs are unique on the page** (`no-dup-id`): no two headings with the same text, and no heading whose ID equals `q-<question id>`, `artifact-attempts-heading` or `artifact-contents-heading`. SVG IDs in figures count too.
- **Links have text** (`wcag/h30`).

### Build failures

Rules `build`, `build-warning` and `build-warning/…`. The build stopped, so checks of the built pages are skipped until it passes.

- MDX syntax, such as an unclosed tag, fails at its line in the entry.
- A component's own rule fails with its name first: `Stepper: …`, `Stage: …`, `SingleChoice: …`, `OpenQuestion: …`, `NumericQuestion: …`, `Figure or Stepper: …`. A Stage names every rule it breaks in one line. `NumericQuestion: …` means its key can't work (an `answer` that isn't a number or uses `,`, so write `"9.81"`; both tolerances; a negative one; or a `relativeTolerance` on a zero `answer`) or that it has no question inside it. The line points at the entry of the artifact whose page failed: at the component when the entry has only one with that name, otherwise at `1:1`, so search the entry for that component. Fix it as the message says (`COMPONENTS.md` shows the shape each one expects) and check again: the build stops at the first one, so another may fail next.

### Platform changes

These failures are in files outside `artifacts/`: the platform, the design system or their tooling. In an artifact session, tell the owner what fails and change those files only after they confirm. A platform session fixes them following `CODING_STANDARDS.md`; `component-reference` is fixed by running `pnpm components`.

`first-paint` means the build couldn't move an artifact page's module scripts into its `<head>` to hold its first paint (`src/first-paint.ts`).
