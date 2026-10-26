# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The stack was decided by artifactory, the platform that renders these artifacts. Its decision records are `docs/adr/0002` to `0004` in the artifactory repo.

- **Framework:** Astro 7 with static output. Components are `.astro` files, and every page is prerendered.
- **Interactivity:** custom elements written in plain TypeScript. Each one adds behaviour to markup its `.astro` component already rendered at build time. There are no React, Svelte or Preact islands.
- **Styling:** plain CSS on custom properties, which are the tokens. It uses cascade layers, nesting, container queries and styles scoped to each component. There is no Tailwind, Sass or CSS-in-JS.
- **Tooling:** strict TypeScript, Node 22 and pnpm, with every version pinned exactly.
- **Rich content:** rendered at build time and never in the browser, so a syntax error fails the build.
  - **Math:** Temml, which converts LaTeX to MathML.
  - **Code:** Shiki, with a theme whose colours are token variables.
  - **Diagrams:** D2, with classes mapped to tokens.
  - **Scientific figures:** hand-written SVG coloured only with tokens.
- **Packaging:** this design system is the `design-system/` package of a pnpm workspace in the artifactory repo.
  - Its `exports` are its public API, and artifacts import nothing else from it.
  - It has its own catalog, which shows every component in every state on throwaway state. Its pages are in `catalog/`, and the platform's site serves them at `/catalog/`, so `pnpm dev` at the repo root runs it. Impeccable live runs against it.

## Users

**Primary: the agents that read the system.** They are Claude Code and Codex sessions in the artifactory repo, local or cloud. They are the system's real reader, and there are two kinds:

- *Artifact agents* build artifacts. They read `COMPONENTS.md` and the `artifact` skill, and nothing else from this package.
- *Platform agents* build this system, locally and with impeccable. They read this file, `DESIGN.md` and the catalog.

Humans mostly meet the system through what the agents produce.

**The owner, studying alone.** One person owns the platform, commissions study artifacts from agents and learns from them. No other learners use it. The owner can make an artifact public and send its link to others, who read it as visitors. The material is mostly in the exact sciences, engineering and computing, studied mostly at a desk in daylight. The owner meets the system in two ways:

- *Studying* inside an artifact: reading it and answering its questions.
- *Operating the platform's own pages:* choosing what to study from the Library or the drafts page, seeing where each artifact stands, and relying on the attempts panel and the saving and sign-in notices. The owner also reviews the design system in the catalog.

**Visitors, through a link.** A visitor reads a public artifact and answers its questions on throwaway state: the answers work on the page and are gone when they leave. They see the artifact without its back link and without the saving and sign-in notices, and they can't reach the Library or any other page.

## Product Purpose

A design system for AI-generated artifacts: browser-rendered outputs that an agent builds on request. It should cover four artifact families:

- reports and documents
- dashboards and data visualization
- interactive tools
- slides and one-pagers

**Current focus: interactive study artifacts.** Examples are quizzes, question boxes, and concept visualizations. These components need to be highly versatile, because one set has to serve whatever subject is being studied.

**The platform's own pages.** The system also draws artifactory's pages and the frame around every artifact:

- the Library and the drafts page (`library-layout`), where the owner picks what to study and sees the status of each artifact's latest attempt
- the artifact layout (`artifact-layout`), with its attempts panel and its notices for saving, failed saves and loads, expired sign-ins, answers given on another device, updated artifacts, and an undo after starting over
- the catalog, which shows every component in every state

Success means any agent, in any session, produces artifacts that:

- read as one recognizable family
- don't fall back on the generic AI look
- meet the quality floor without being told to

## Positioning

Most design systems are written for human developers and leave agents to improvise. This one is agent-native: its spec is written for an LLM to read. It is precise, token-efficient, and hard to misread. It also carries a distinct identity, so outputs from different agents converge on one family instead of on the shared default look of AI-generated UI. It exists for four reasons:

- escaping the generic AI look
- consistency across outputs
- an agent-native spec
- a built-in quality floor

Two looks would feel wrong: a SaaS product, and a blog or Medium article.

## Operating Context

- Artifacts render in a web browser. They are **not** hosted inside Claude.ai or ChatGPT artifact sandboxes, and not inside agent IDE previews or desktop apps (T3 Code, Claude Desktop, ChatGPT Desktop).
- artifactory renders and hosts the artifacts and stores the owner's answers, and this design system feeds it. How it does so is recorded in the ADRs in `docs/adr/` and `GLOSSARY.md`, at the repo root. Everything except public artifacts runs behind a login only the owner can pass.
- **Target devices:**
  - a phone at a 393 × 852 CSS px viewport
  - a desktop or laptop at 1920 × 1080
  - now and then an unfamiliar computer, for one session
- **Themes and print.** Light mode, dark mode and print all ship. Light leads, because the owner studies mostly at a desk in daylight; dark mode is finished to the same standard.
- The study loop: the owner asks an agent for study material on a topic, the agent produces an interactive artifact using this system, and the owner studies with it.
- Content is bilingual. Brazilian Portuguese and English are both in use, sometimes mixed within a single artifact.

## Capabilities and Constraints

**Terminology.** `GLOSSARY.md` at the repo root defines the words: owner, agent, artifact, study artifact, Library, drafts page, catalog, question, attempt, throwaway state and the rest. Use its terms, not the ones it lists under _Avoid_.

**Interactive study components (current priority).** Quizzes, question boxes, and concept visualizations, plus whatever else proves necessary. They must work across subjects rather than being tailored to one.

**Content the components must handle well**
- math and formulas: equations, notation, worked derivations
- code and programming: code blocks, syntax highlighting, traceable snippets
- diagrams and processes: scientific and systems diagrams, step-by-step mechanisms
- dense reading text: definitions, citations, long passages

**Quality floor (confirmed reason for the system).** Accessibility, responsiveness, print, and dark mode ship as properties of the system, not as steps an agent has to remember.

**How agents receive the system** (decided by artifactory; its decision record is `docs/adr/0007` in the artifactory repo)
- **The package:** artifacts import components only from this package's `exports`. They contain content and data, and the one kind of code ADR 0007 lets in: a custom build, TypeScript behaviour that runs inside a `Stage`, imports only `stage-build` and touches no DOM, CSS or colour. They hold no CSS and no local components. When an artifact needs something the system lacks, the agent proposes an addition here instead of building a one-off, and a custom build that a second artifact needs becomes a component the same way.
- **The component reference:** `COMPONENTS.md` in this package is generated from the components' types and doc comments. It lists each component's props, a usage snippet, when to use it, and the D2 and SVG classes mapped to tokens. The doc comments are therefore the agents' documentation, so write them for an agent to read.
- **The workflow:** an `artifact` project skill in artifactory carries the steps and writing rules. Artifact agents never read this file, `DESIGN.md` or the catalog. Those are for whoever builds the system.

**Open decisions**
- the policy for external libraries this system itself may use, other than the ones for math, code and diagrams (see `## Stack`). Artifacts import nothing but this package.

## Evidence on Hand

- **Components:** the importable ones are documented in `COMPONENTS.md`. The layouts `ArtifactLayout` and `LibraryLayout` draw the artifact and Library pages and add the `AttemptsPanel` and `StateNotices`. They are styled in the system's visual world, the technical standard, which `DESIGN.md` records.
- **Tokens:** `src/tokens.css` carries the technical standard. `DESIGN.md` is the visual authority and records how the owner approved it.
- **Catalog:** `catalog/` shows every component and every question state, on throwaway state.
- **Real study artifacts:** any in `artifacts/`. Treat them as evidence of real usage, not as the visual authority.
- There are no brand assets. Future work must not invent usage claims or adopters.

## Product Principles

1. **Written for the agent first.** Every rule has to be followable from the text alone. If an agent can reasonably misread a rule, the system has a bug, not the agent.
2. **The family comes from the system, not the session.** Consistency and identity belong in the system, so each agent doesn't improvise its own version.
3. **The floor ships with the component.** Accessibility, responsiveness, print, and dark mode are built into components. Agents should not be able to forget them.
4. **Study is the proving ground.** Judge a component by whether it helps the owner understand and retain the material. Prefer versatile components that span math, code, diagrams, and dense text over one-off widgets.
5. **Both languages are first-class.** Portuguese and English, including mixed-language artifacts, work equally well everywhere.

## Accessibility & Inclusion

The bar is **WCAG 2.2 AA**, everywhere: in artifacts, on the platform's pages and in the catalog. Accessibility is part of the required quality floor, so components meet it without the agent having to remember it.

- Every diagram and figure has a text description, and the type checker requires its `alt`.
- Passages in the other language are marked as such.
- Bilingual content (pt-BR and English, possibly mixed in one artifact) must be supported everywhere.
