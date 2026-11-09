# 01: The Stage hands every build its content as written

Status: ready-for-agent
Blocked by: [Code display 02](../../code-display/issues/02-a-fence-starts-its-line-numbers-at-start.md)

**What to build:** a custom build's `steps` gets a second argument: the Stage's content as written. It holds the code block's lines, each keyed by the number the page shows (line 0 is the first under `start=0`) with its plain text, and each table's headers and rows as plain text, found as a step's `rows` and `cells` find them. Every build gets it, on the page and in `pnpm check`'s runs, from the same reading of the content the step applier already makes, so a build sees the same content in both places. Along with the content, the build gets the artifact's main language (pt-BR or English), on the page and in the check alike, so a build can say its steps in it, as 02's narration does. A build that ignores either is unchanged. This is what lets a program be written once, in the Stage's content ([Machine trace](../spec.md) › The Stage hands builds their content).

- [ ] `steps` takes the content as written as its second argument, typed by a new exported type in the Stage's build module, with a doc comment for the artifact agent. `Build` and `defineBuild` document it.
- [ ] The code block's lines are keyed by the shown number: with `start=0` the first line is 0, without `start` it is 1. Each line's text is plain text, without highlighting markup or the line number.
- [ ] Each table gives its headers and its rows as written, as plain text, in the same terms `rows` and `cells` use (a row by its cells' text, a column by its header's text). A Stage that uses `body` still hands the rows as written.
- [ ] The build gets the artifact's main language with the content, the same on the page and in the check's runs.
- [ ] Each run gets the content as written, whatever an earlier run's build did with the value it was given.
- [ ] The page and the check hand builds the same content: a test at the check's seam (fixture repos) runs a fixture build that copies a code line's text, by its shown number under `start=0`, and a table cell's text into its last step, and the check's "tables as written are the first example's result" comparison proves it, with expected values written as literals.
- [ ] Every existing Stage shows the same steps: the existing check tests pass unchanged, and the catalog's Stage page and the two Stages of the sample artifact, `rsa-from-scratch`, step as before (checked in a browser, as the browser-verification doc says).
- [ ] Shared parts: this changes the Stage element and the check's Stage runner, which reach every Stage, and the build module's types, which reach every build; no shared part from `CODING_STANDARDS.md`'s list changes. The ticket's closing comment names what was checked.
- [ ] Docs in the same commit: the `Stage` doc comment's build part says `steps` gets the content as written; `pnpm components` regenerates `COMPONENTS.md`; the `artifact` skill's Stage reference (`stage.md`) describes the argument and the main language it carries, and `rules.md` › Custom builds › "Missing a control or a mark?" lists that a Stage hands its build its content.
