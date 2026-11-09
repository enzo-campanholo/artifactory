# 01: The Stage hands every build its content as written

Status: resolved
Blocked by: [Code display 02](../../code-display/issues/02-a-fence-starts-its-line-numbers-at-start.md)

**What to build:** a custom build's `steps` gets a second argument: the Stage's content as written. It holds the code block's lines, each keyed by the number the page shows (line 0 is the first under `start=0`) with its plain text, and each table's headers and rows as plain text, found as a step's `rows` and `cells` find them. Every build gets it, on the page and in `pnpm check`'s runs, from the same reading of the content the step applier already makes, so a build sees the same content in both places. Along with the content, the build gets the artifact's main language (pt-BR or English), on the page and in the check alike, so a build can say its steps in it, as 02's narration does. A build that ignores either is unchanged. This is what lets a program be written once, in the Stage's content ([Machine trace](../spec.md) › The Stage hands builds their content).

- [x] `steps` takes the content as written as its second argument, typed by a new exported type in the Stage's build module, with a doc comment for the artifact agent. `Build` and `defineBuild` document it.
- [x] The code block's lines are keyed by the shown number: with `start=0` the first line is 0, without `start` it is 1. Each line's text is plain text, without highlighting markup or the line number.
- [x] Each table gives its headers and its rows as written, as plain text, in the same terms `rows` and `cells` use (a row by its cells' text, a column by its header's text). A Stage that uses `body` still hands the rows as written.
- [x] The build gets the artifact's main language with the content, the same on the page and in the check's runs.
- [x] Each run gets the content as written, whatever an earlier run's build did with the value it was given.
- [x] The page and the check hand builds the same content: a test at the check's seam (fixture repos) runs a fixture build that copies a code line's text, by its shown number under `start=0`, and a table cell's text into its last step, and the check's "tables as written are the first example's result" comparison proves it, with expected values written as literals.
- [x] Every existing Stage shows the same steps: the existing check tests pass unchanged, and the catalog's Stage page and the two Stages of the sample artifact, `rsa-from-scratch`, step as before (checked in a browser, as the browser-verification doc says).
- [x] Shared parts: this changes the Stage element and the check's Stage runner, which reach every Stage, and the build module's types, which reach every build; no shared part from `CODING_STANDARDS.md`'s list changes. The ticket's closing comment names what was checked.
- [x] Docs in the same commit: the `Stage` doc comment's build part says `steps` gets the content as written; `pnpm components` regenerates `COMPONENTS.md`; the `artifact` skill's Stage reference (`stage.md`) describes the argument and the main language it carries, and `rules.md` › Custom builds › "Missing a control or a mark?" lists that a Stage hands its build its content.

## Comments

### 2026-11-09: the shown number is already in the content as written

From code display 01's implementation: `writtenContent` in `design-system/src/step-applier.ts` now reads each code line's shown number from its `data-line` attribute (`Written.codeLineNumbers`, one list per block), on the page and in the check's Stage runs alike. Key the content's code lines by those numbers rather than by position, and they follow `start` once code display 02 lands.

### 2026-11-09: `start` landed

From code display 02's implementation: a fence's `start=N` now sets its lines' `data-line`, so `Written.codeLineNumbers` already holds the shown numbers (0 first under `start=0`) on the page and in the check's Stage runs. A step's `lines` key that isn't one of them fails as "it has lines 0 to 3" (or "it has only line N"). The numbers are written by the `shownLineNumbers` hast plugin in `src/rich-content.ts`, not by a Shiki transformer: Satteri hands Shiki no info string while raw HTML is on. `/catalog/stage/` has a Stage over a `start=0` listing, "Code numbered from 0" (`design-system/catalog/sum-listing.build.ts`), which a content-reading build could take over.

### 2026-11-09: resolved

**Result:** `steps(input, content)` gets the Stage's content as written as its second argument, typed `Content` in `@artifactory/design-system/stage-build` (with `CodeLine` and `WrittenTable`): `code`, one list per fenced code block of `{ line, text }`, `line` the shown number from `data-line` (0 first under `start=0`) and `text` the line's `textContent`, indentation kept; `tables`, each table's `columns` and `rows` as written, plain text as `rows` and `cells` find them, the rows as written even in a run that gives `body`; and `lang`, `"pt-BR"` or `"en"`. Existing builds that take one argument are unchanged.

**Commits:** aa118af (claim), f0a2d05 (implementation, tests, docs), and this closing commit.

**Validation:**
- `tests/check/artifact-checks.test.ts`: a fixture typed Stage, `conteudo`, over a `start=0` fence and a table, whose build copies every code line with its number, a header row and table row, and `lang` into its last step; the first-example comparison fails with literal values (`0:push a|1:  add ; soma`, `Lido/Texto tabela/—`, `pt-BR`). Its build then empties `code` and overwrites every row, and its second example throws if it sees either change. Handing runs the shared object instead of a copy fails that test, which I checked by hand and then reverted.
- Every existing Stage steps as before. A capture script ran every Stage on `/catalog/stage/`, `/catalog/stage/?lang=pt-BR` and `/rsa-from-scratch/` (its two Stages) from its first option or example to its last step, light and dark at 1280 px. It ran on a baseline build of `impeccable-gaps-implementation` and on this branch. Of 336 steps, each one's announcement, step line, marks and cell texts were identical, and all 336 screenshots were byte-identical, with no page errors.
- Full `pnpm check`, run as the gate on the final HEAD.

**Decisions:**
- `code` is a list per block of `{ line, text }`, not a record keyed by number. A machine's `parse` walks lines in order and needs each line's number, and a list per block keeps the shape right for a Stage with more than one code block (`lines` still needs exactly one).
- `lang` is read the way the Stage already chooses its own lines, from the nearest `[lang]`, by a shared `mainLanguage` in `step-applier.ts`. The page reads it when each run starts, so the catalog's `?lang=pt-BR` reaches builds. The check reads it from the built page's `<html lang>` and passes it to the worker in its `Job`.
- `runBuild(build, input, written, lang)` builds a fresh `Content` for each call, so a build's changes reach neither the next run nor the `Written` the step applier finds rows and columns in. The types stay mutable, since a build may change its own copy.
- `Written.codeLineNumbers` became `Written.code` (`CodeLine[][]`), so the applier and the content read one source.
- The parts of the drawing aren't in `Content`. No build needs them yet.
- The catalog's "Code numbered from 0" build (`sum-listing.build.ts`) takes its four instructions and their line numbers from the content, as code display 02 suggested. Its steps are unchanged, so the catalog shows the page side of the content working.
- `stage.md`'s Code lines bullet still said lines count only from 1 and quoted a failure line that no longer exists ("it has 4 lines"). I corrected both, since they sat next to the new bullet.

**Shared parts:** the Stage element (`stage-element.ts`), the step applier and the check's Stage runner (`build-runner.ts`, `custom-build-runs.ts`) reach every Stage. I checked them through the existing check tests (the artifacts-only scope ran green, and the full run is in the gate) and through the browser comparison above. `stage-build.ts`'s types reach every build: the catalog's and the sample's builds still type-check under the gate. No shared part from `CODING_STANDARDS.md`'s list changed, and nothing visual changed.

**Left undone:** nothing.
