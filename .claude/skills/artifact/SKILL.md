---
name: artifact
description: Study artifacts in `artifacts/`. Use to create one from the owner's request or source material, revise one, publish a draft, make one public or private, rename or delete one, and to fix a `pnpm check` or CI failure that names an "artifact skill" section.
---

# Study artifacts

An artifact is the folder `artifacts/<slug>/`: an `index.mdx` entry, plus the `.d2` diagrams, `.svg` figures and images it shows, and the custom build of each `Stage` in it. It holds content and data, plus behaviour only inside a Stage, and the design system draws everything ([ADR 0007](../../../docs/adr/0007-artifacts-contain-content-data-and-staged-behaviour.md)). The owner opens it at `https://<domain>/<slug>/`, where the domain is the repository variable `ARTIFACTORY_DOMAIN`. [Reply](#reply) says how to read it, and what to give when it's empty or the read fails.

## Authority

- **Publish without asking.** Creating, revising and publishing a draft are what the owner asked for, so do them and reply with the URL.
- **Draft only on request.** Make an artifact a draft (`--draft`) only when the owner asks for one.
- **Make public or private, rename or delete only the artifact the owner names.** The request is the confirmation. For a vague request ("share the Cálculo ones", "tidy up the old Bioquímica ones"), list exactly which artifacts you'll change, by slug and title, and wait for the owner's yes. Many artifacts are built from course material the owner can't share, so each stays private until the owner names it. Rename or delete nothing on your own initiative: a changed title or main language keeps its slug.
- **Stay inside `artifacts/`.** When an artifact needs something the design system lacks, make do with the components that exist, or propose the addition to the owner and wait.
- **Keep source material out of git.** Read it where the owner provided it. If it must be saved, put it in the git-ignored `sources/` folder at the repo root.

## Before writing

- In a fresh cloud session without `node_modules/`, run `pnpm install --frozen-lockfile`.
- Read `design-system/COMPONENTS.md`, the whole component reference: what each component is for, its props, a usage example and the colour classes.

## Before the first `gh` command

Every path reaches `gh`: the Check, Watch CI and Reply steps, and a request to fix a red CI run, which starts at `gh run view`. Before the first one, run:

```sh
git remote get-url upstream >/dev/null 2>&1 && gh repo set-default origin
```

In a private copy (a checkout with an `upstream` remote), it makes `origin`, the copy, `gh`'s default repository, so `gh` reads the copy's CI runs rather than upstream's. Git config stores it for the clone and every worktree of it, and running it again is harmless. In the upstream repo, with no `upstream` remote, it does nothing, and its non-zero exit is expected.

Write each `gh` command as this skill gives it, letting the default pick the repository, with no `-R`. `gh variable` ignores the default and reads the `upstream` remote's variables, so [Reply](#reply) reads the domain through `gh api`, whose `{owner}/{repo}` follows it.

## Workflows

Each workflow ends with the shared steps under [Finishing](#finishing). An artifact is done when CI is green on `main` and the owner has the URL.

### Create

1. Scaffold: `pnpm new <slug> --subject "<Subject>" --lang <pt-BR|en> [--draft]`. It refuses a slug or subject that breaks [Slugs](rules.md#slugs) or [Frontmatter](rules.md#frontmatter), and prints the subjects already in use.
2. Read [rules.md](rules.md), the writing rules, whole. Then write `artifacts/<slug>/index.mdx` from the source material, following them and [A good study artifact](#a-good-study-artifact). The starter entry shows one of each common pattern:
   - Replace the placeholder title, which `pnpm new` made from the slug without accents.
   - Replace every example with the artifact's own content.
   - Delete the starter comment and every pattern the artifact doesn't use, including `diagram.d2` or `figure.svg` and their import lines.
3. Finish: look, check, publish, watch CI, reply.

### Revise

1. Edit the entry and its files in place, following [A good study artifact](#a-good-study-artifact) and each section of [rules.md](rules.md) that bears on what you change. Keep `id`, the slug and `published` as they are, so the owner's answers stay attached. Follow the question ID rule under [Components](rules.md#components).
2. Finish: look (if a diagram, figure, `Stepper` or `Stage` changed), check, publish, watch CI, reply.

### Publish a draft

1. Set `draft: false`, and set `published` to today's date in São Paulo, the owner's day (`TZ=America/Sao_Paulo date +%F`), not the session's UTC date. The artifact then appears at the top of the Library.
2. Finish: check, publish, watch CI, reply.

### Make public or private, rename, delete

Before starting one, read [lifecycle.md](lifecycle.md): each has its own steps and reply.

## Finishing

### Look

For every new or changed diagram, figure, `Stepper` and `Stage` (its build included), run `pnpm look <slug>`. It builds the site and screenshots each `Diagram`, `Figure`, `Stepper` (figure, D2 or code, at every step) and `Stage` at 393 px (a phone) and 1920 px (a 1080p screen), in the light theme, into `.look/<slug>/`. Each shot is the item alone, as wide as it sits on the page, so the 1920 px shots are the text column's width, not the screen's. Above each item's files it prints the item's number, its kind, the number its caption shows (`Figure 2.1`) and its `alt`. Code has no `alt`, so for a code `Stepper` it prints the captions, one per step, in its place ("no caption" when it has none). Cite a figure or Stage in the prose by that printed number. Open every PNG and compare it with its `alt`, or a code step with its caption: labels overlapping or cut off, text too small at 393 px, a drawing far wider than it is tall, a step that shows the wrong part or highlights the wrong lines, a mark that doesn't read at 393 px. Fix and look again, until every screenshot matches its `alt` or caption and reads well at both widths.

Look doesn't shoot plain code blocks, tables or questions: read them in the source, and `pnpm check` catches what goes wrong in them. Nor does it shoot dark mode or print, which are checked on the design system's catalog.

Each shot is the item alone, with the bottom bar, the notices and the rail hidden: look hides every fixed or sticky layer outside the item for the shot, then shows it again. A bar or notice in a shot is a look bug to report, not something to fix in the artifact: never move content to keep it clear of the bar.

Look also writes `.look/<slug>/results.json` and a `contact-sheet.html` that helps find shots; judge the original PNGs. `captured-awaiting-visual-review` means a person still has to look, never a visual pass. Failed assertions, unavailable Chromium and unsupported capabilities aren't passes either.

Before judging a `Stage`'s shots, read [stage.md](stage.md#look): which run Look shoots, what it prints, and what each step's shot is compared with.

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

With no SHA, this runs the full gate. On another branch, or for platform work, run plain `pnpm check`. [ci.md](ci.md#skipping-vitest) says which changes still run the tests.

The gate can take 20 minutes or more when other jobs share the machine, so run it in the background and wait for it to finish, rather than under a foreground timeout that kills it. It ends with a `pnpm check: N failures` block that repeats every failure:

```
artifacts/<slug>/index.mdx:12:5 error <rule>: <what's wrong> (artifact skill: <section>)
```

Each section is a heading in [rules.md](rules.md): read it, fix every failure, and run the check again until it reports none. Checks of the built pages are skipped while the build fails, so new failures can appear once the build passes.

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
4. On `main`, the steps after the check deploy the site, set what's open, then probe from outside what is. Their failures aren't check failures, so their log has no failures block. If one goes red, follow [ci.md](ci.md#deploy-steps).

If `gh run list` or `gh run watch` itself fails (an auth, permission or network error, not a red run), stop watching: the reply says "pushed, deploy unverified" and quotes `gh`'s error. Only CI's Probe step confirms a deploy. The site sends every private path to the sign-in, even a slug that doesn't exist, so fetching it proves nothing; leave the site unfetched.

### Reply

Give the owner the artifact's address and a line on what it covers. A draft is also listed on the drafts page, `/drafts/`. Mention anything you couldn't do, such as `pnpm look` failing to start Chrome, or CI you couldn't watch ("pushed, deploy unverified", with `gh`'s error).

Read the domain from the `ARTIFACTORY_DOMAIN` variable:

```sh
gh api 'repos/{owner}/{repo}/actions/variables/ARTIFACTORY_DOMAIN' --jq .value
```

- **It prints a domain:** give `https://` + that domain + `/<slug>/`.
- **It prints nothing, or fails with `Not Found (HTTP 404)`:** the variable is empty or unset, so the site isn't deployed yet. Give the local URL from `pnpm dev`, `http://localhost:4321/<slug>/`.
- **It fails any other way** (an auth, permission or network error): say the domain couldn't be read, quote `gh`'s error, and give the path `/<slug>/`. Build a URL only from a domain `gh` printed, never a template such as `https://<domain>/<slug>/`.

## A good study artifact

The owner studies alone with it, on a phone or a laptop.

- **Teach the source material.** Cover what the source covers, accurately, in the artifact's main language. Add context only where it makes the material clearer, and invent no facts, figures or citations.
- **Open with the point.** The first paragraph says what the artifact covers and why it matters. Then build from what the owner already knows towards what's new, one idea per `##` section.
- **Name the sections.** The `##` headings are the page's contents: with three or more, the page lists them beside the text on a laptop and in a folded contents line on the phone. Write each as the short name of what the section covers (`## Função e área`), not a sentence, a question or a label such as `## Parte 2`.
- **Write paragraphs that can be cited.** The page numbers every section, `###` subsection, paragraph and statement after the first `##` in the margin (1, 1.1, 1.2), display equations on their own series ((1), (2)), and figures and diagrams by section (Figura 4.1). Leave the numbering to the page, and keep each paragraph to one point so its number means something. Refer to them by those numbers: "pela equação (2)", "na Figura 3.1".
- **State definitions and results as statements.** Write each definition, theorem, lemma or corollary the source names as a `Statement` (never as bold text or a heading), the proof the source gives as a `Proof` right after it, and each problem the source solves as a `<Statement kind="example">` with its solution. An example teaches and a question tests, so when the owner should work a problem out themselves, ask it as an `OpenQuestion` or `NumericQuestion` instead, typically right after an example of the same kind. Explanations stay in paragraphs. Before writing a `Statement`, `Proof` or `Ref`, read [statements.md](statements.md).
- **Put asides in a `Note`.** A remark that would interrupt the sentence goes in a `Note` at the end of its paragraph, which the page sets in the margin. What the owner must read stays in the paragraph.
- **Show, then ask.** Explain an idea, show it with a worked example, a diagram or a stepper, then ask a question about it while it's fresh. Spread questions through the artifact, after the idea they test. The page numbers the questions in order and letters the options: leave both to it.
- **Pick the form that fits.** Math for formulas, a code block for code, a `Diagram` for structure and flow, a `Figure` for plots and shapes, a `Stepper` when the order is the point, a `Stage` when the steps depend on what the owner chooses (see [Custom builds](rules.md#custom-builds)). `COMPONENTS.md` says when to use each.
- **Tables are for data, lists for sentences.** Use a Markdown table when the owner compares short cells down a column: values, symbols, terms. Mark a column of numbers `---:` to align it right. When a row's cells are sentences, write a list instead: on the phone, three columns of sentences wrap to two or three words a line.
- **Ask questions that test understanding.** Ask about why and how, not about the artifact's own wording. In a `SingleChoice`, make every wrong option a mistake someone could really make. In an `OpenQuestion`, write a model answer that shows the reasoning, not just the result.
- **Ask for a number when the owner should compute it.** When the answer is a value the owner works out (a force, a probability, a root), use a `NumericQuestion` rather than a `SingleChoice`, whose options would let them work backwards. Ask one number per question: a vector's components or a quadratic's two roots are separate questions. Give a `tolerance` (or `relativeTolerance`) that matches the precision the computation really has, such as `0.01` for an answer rounded to two decimal places; without one the check is exact, which suits only exact answers such as `"3/4"`.
