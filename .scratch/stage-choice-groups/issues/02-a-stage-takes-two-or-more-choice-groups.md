# 02: A Stage takes two or more choice groups

Status: ready-for-agent
Blocked by: 01

Spec: [Stage choice groups](../spec.md) › Behaviour › Choice groups, Runs and Look (the `pnpm check` half), Failures, Documentation, Shared parts. Decisions: [Stage controls and drawing](../../artifact-generation-gaps/issues/03-stage-controls-and-drawing.md) › Answer. Don't reopen them.

**What to build:** an agent writes one Stage where the owner picks both the start vertex and the search, instead of two Stages. `choose` takes, besides today's `{ label, options }`, a list of two or more named groups; the build types its input with the groups' names, each a `string`, and `steps` gets one chosen option per group. On the page each group is a labelled row of options, the groups one under another in the order written. No group opens chosen: the step's line holds the prompt and the counter stays hidden until every group has a choice, then the run starts, and any later change to any group runs again from step 1. Option names are unique across the Stage's groups, so a drawn part named like an option chooses that option in its own group, the other groups' choices kept. Without JavaScript and in print the Stage shows the content as written, no option named, as today. `pnpm check` runs the build on every combination, one option per group, with no cap, and names the combination in each `stage-run` line as typed input names an example (`inicio = A, busca = largura`, in the groups' order).

Existing one-group Stages and builds don't change, and a Stage still takes only one of `choose` and `input`.

Design-system work: run it in a local session through impeccable (`design-system/CLAUDE.md`), reading `PRODUCT.md` and `DESIGN.md` first.

**Shared parts:** the option rows and their click shortcut live in the Stage's own markup and element and reach only the Stage. `StepControls` reaches every Stepper: if this ticket changes it, check that a Stepper still steps on its catalog page, with the same evidence as the Stage's; if it doesn't, say so in the closing comment.

## Acceptance criteria

The page:

- [ ] A Stage with a list of groups renders one labelled row of options per group, in the order written, each group its own radio group, so the arrow keys move the choice within a group only.
- [ ] No option is chosen on load, a reload included; the prompt holds the step's line and the counter stays hidden while any group is unchosen.
- [ ] Choosing the last unchosen group starts the run at step 1; changing any group afterwards runs again from step 1.
- [ ] A drawn part named like an option chooses that option in its own group and leaves the other groups' choices as they are; it starts the run only once every group has a choice.
- [ ] A refusal (a throw, more than 200 steps, a step the page refuses) takes the step's line as today's `choose` refusals do. With several groups it ends "Escolha outras opções." / "Choose other options."; a one-group Stage keeps today's line.
- [ ] Without JavaScript and in print the content as written shows with no controls and no option named.

The check (`tests/check`, seam 1, against fixture artifacts):

- [ ] The built page of a two-group Stage holds each group's label and options in order, none checked, the controls hidden and no example line.
- [ ] Every combination runs: a fixture build that throws on one combination only, not the first, fails as `stage-run` naming it (`with \`inicio = C, busca = profundidade\`, \`steps\` throws: …`), and a step problem in another combination names that one.
- [ ] `build-input` fails a list-form build typed with the wrong names, a missing or extra name, or a name that isn't a `string`, and one with no type, worded like the typed-input messages ("… but the Stage's groups give it `{ inicio: string; busca: string }`: write `defineBuild<{ inicio: string; busca: string }>`"); a one-group build typed with names keeps today's "options give it text" message.
- [ ] The Stage fails as `build` for a list of fewer than two groups, two groups with the same `name`, and an option name in more than one group, each worded like the Stage's existing problems and listed in one run with the others.
- [ ] The existing one-group and typed cases pass unchanged.

Documentation and catalog, in the same commit as the check change:

- [ ] The `Stage` doc comments cover the `choose` prop's two forms and when the run starts, option names unique across groups for the click shortcut, and the list form's input in `Build` and `defineBuild`; `pnpm components` regenerates `COMPONENTS.md`.
- [ ] The `artifact` skill's Stage page gives the new `build` and `build-input` messages and runs named by combination; its rules page's Custom builds section gives the list form's `defineBuild` shape, and "Missing a control or a mark?" lists several choice groups among what the Stage takes.
- [ ] `DESIGN.md`'s Stage description covers several labelled rows of options and the run starting once every group has a choice (with `.impeccable/design.json` if the change reaches it).
- [ ] The catalog's Stage page adds a Stage with two groups, a start vertex and a search, whose drawn parts choose from the vertex group; checked in a browser at 393 px and wide, light and dark, with the keyboard, as the agent docs' browser verification says. A mid-run catalog state isn't needed: the catalog's run hook picks one option, and extending it is out of this ticket.

## Comments

### 2026-11-09: notes from 01

Implementer of [01](01-name-the-stage-s-control-instead-of-inferring-it.md). Where the list form plugs in:

- `step-applier.ts` exports `Control` (`"choose" | "input"`), `Takes` (`{ shape: "text" }` or `{ shape: "named"; values: NamedValue[] }`) and `stageControl(stage)`, which reads `data-control` from `<artifact-stage>` (`Stage.astro` writes it) and derives `takes` from the page. A list of groups is `control: "choose"` with `takes: { shape: "named", values: [{ name, kind: "string" }, …] }`: extend `stageControl`'s `choose` branch and add `"string"` to `NamedValue["kind"]`.
- `build-input.ts` compares against `takes` and words `{ name: kind; … }` from it. `kindFlags` maps a kind to TypeScript's flag (`"string"` → `TypeFlags.String`). The noun in "the Stage's … give it" comes from `givers[control]` ("options", "fields"), so "groups" needs the shape too, not the control alone.
- The check's `named()` in `custom-build-runs.ts` already writes named values as `name = value` in `takes`' order, so `inicio = A, busca = largura` follows once `inputs` holds each combination's record. `inputs` for `choose` is still each `.stage-option input` value: build the combinations there.
- The page's refusal lines are `texts.refused[control]` in `stage-element.ts`. "Escolha outras opções." / "Choose other options." needs a third entry chosen by the group count. `runBuild` takes the control second. Its `body` rule applies only to `input`, so a several-group run, like a one-group one, may leave `body` out to show the starting state.
