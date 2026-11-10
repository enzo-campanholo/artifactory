# Component rules

Source: the architecture review of 2026-11-10, candidate 1. Every decision below was made with the owner that day, and [Comments](#comments) records them.

## Problem

A component checks its own rules while it renders: a Stepper with one step, a `SingleChoice` without a numbered list, a Stage with neither `choose` nor `input`. Each of the 28 places throws `componentError(name, message)` from `design-system/src/component-errors.ts`. Three things follow:

- **One rule per run.** The first throw stops `astro build`, so a run reports one component rule, and the built-page checks are skipped for every artifact.
- **The position is scraped from a log.** The thrown error carries no position. `scripts/check/steps/build.ts` recovers one from Astro's output: the `Location:` block, the `Caught error rendering /<slug>/` line and the `Name: ` prefix of the message. `onlyTagOffset` in `src/source-locator.ts` then places it only when the entry has exactly one tag with that literal name. Two Stages in one entry, or a component imported under another name, land at `index.mdx:1:1`. `docs/agents/test-seams.md` records the limit: "at the component when the entry has only one of that name".
- **One fixture build per rule.** Each rule's test needs its own fixture repo and its own build, about 25 of them across `tests/check/artifact-failures.test.ts` and `tests/check/reporting.test.ts`. Some cases already pair unrelated rules to save builds.

Statements, citations and proofs go another way. The component renders, the built-output pass (`src/built-output.ts`) reads the page, and `src/statement-failures.ts` reports each failure at its prop through `locate`, by occurrence and by the name the entry imports the component as. `component-errors.ts` is shallow beside that: its real interface is the prefix convention and the log format, and both live in other modules.

## Behaviour

### In a build

- A component whose rule is broken renders only a marker that carries its name and its message, and nothing else of itself.
- The design system exports a reader of the markers on a page, as `statements.ts` exports `statementsOnPage`. The design system still imports nothing from the platform.
- The built-output pass reports each marker as a failure with the rule `component-rule`, under the `artifact` skill's **Components** section.
- The message keeps today's wording, name first: `Stepper: it has 1 step; give it at least two`. A Stage, a `Matching` and a `Figure` still name every rule they break in one line.
- The build fails at the end, as it does for any reported failure: no question manifest, no public paths manifest and no build ID.

### Placing

- The nth instance of a component on the page is placed at the nth tag of that component in the entry, found by the name the entry imports it as.
- When the counts disagree, the failure falls back to line 1, column 1 of the entry, as today. A component written inside a broken one isn't rendered, so until the outer one is fixed, a failure of the inner one's kind elsewhere in the entry falls back this way.
- A marker on a page that isn't an artifact, such as a catalog page, fails the build at the config's start, as an unplaced build failure does today, with the page's route in the message.

### Follow-on failures

An artifact with a `component-rule` failure skips its other built-page checks: question IDs, statements, links, first paint, HTML validation and its custom builds' runs. Every other artifact is checked in full. Today one thrown rule skips those checks for every artifact.

### In `astro dev`

A broken rule throws, as today, so the overlay names it. One function decides which of the two happens, and no component asks which command is running.

## What goes

- `componentNamesIn` and the `Name: ` prefix as something the check parses. The prefix stays in the message for the reader.
- `failedPage`, `componentInArtifact` and `componentsNamedIn` in `scripts/check/steps/build.ts`. `failureFromAstroError` stays for Astro's own errors, such as an MDX syntax error.
- `onlyTagOffset` and the `component` target in `src/source-locator.ts`.

## Documentation

- `.claude/skills/artifact/rules.md`: **Components** gains `component-rule` and what its line reads; **Build failures** loses the bullet on a component's own rule. Every other mention in the skill that a component rule "fails as `build`" (`stage.md`, `figures.md`, `statements.md`) follows.
- `docs/agents/test-seams.md` › `tests/check`: the lines on a component's own error and on a numeric question's key that can't work.
- A change to what `pnpm check` reports updates the `artifact` skill in the same commit (`CODING_STANDARDS.md` › Code).

## Tests

Seam 1 only, and no new seam.

- One fixture repo breaks every component rule, and each line is asserted at its position. Two Stages in one entry and a component imported under another name are among them.
- The type-error cases stay as they are.
- A valid artifact beside a broken one keeps its built-page checks, and the broken one's follow-on checks are skipped.
- Each rule keeps exactly one assertion. The single-rule fixture repos go.

## Shared parts

`InlineSvg.astro` holds two of the rules and reaches `Figure` and the figure `Stepper`. Ticket 02 names both and checks one of each on the catalog.

## Out of scope

- Changing any rule, or any message's wording.
- One failure line per rule for a Stage, a `Matching` or a `Figure`.
- A visible marker on the page in `astro dev`.

## Comments

### 2026-11-10: owner decisions at the architecture review

Owner, architecture review session, 2026-11-10 (thread 8d57bee0-37b7-4277-bf58-cace669ef571), every recommendation accepted.

- **Approved, round 1 Q1:** a broken component renders only a marker; the design system exports the reader; the built-output pass reports each at its tag; the build fails at the end; the prefix convention, `failedPage`, `componentInArtifact` and `onlyTagOffset` go; a marker on a page that isn't an artifact fails the build naming that page.
- **Approved, round 1 Q2:** a broken rule keeps throwing in `astro dev`, and only the build collects markers.
- **Approved, round 2 Q1:** the rule ID `component-rule` under **Components**, with the message's wording unchanged.
- **Approved, round 2 Q2:** an artifact with a `component-rule` failure skips its other built-page checks, and every other artifact is checked in full.
- **Approved, round 2 Q3:** placing by occurrence and imported name, falling back to line 1 when the counts disagree.
- **Approved, round 2 Q4:** one fixture repo for every component rule, with the type-error cases kept.
- **Approved, round 3 Q1:** the two tickets in `issues/`.
- **Order of work, round 2 Q12:** this feature first, then [Library row statuses](../library-row-statuses/spec.md), [The HTTP transport against the Worker](../http-transport-against-the-worker/spec.md), [The Stage on its page](../stage-on-its-page/spec.md), [Page numbering](../page-numbering/spec.md) and [Question markup in store tests](../question-markup-in-store-tests/spec.md).
