# 01: Name the Stage's control instead of inferring it from the input's type

Status: ready-for-agent
Blocked by: None (can start immediately)

Spec: [Stage choice groups](../spec.md). A prefactor: no behaviour changes.

**What to build:** today the Stage, its step applier and the check tell a Stage with `choose` from one with `input` by whether the build's input is text. A choice-group run hands the build a record of names to options, which isn't text, so every one of those places would take it for typed input. Make which control a Stage has, `choose` or `input`, something the page and the check carry and pass along, and make what `steps` must take an explicit shape (text, or named values each of a given kind), so [02](02-a-stage-takes-two-or-more-choice-groups.md) adds the list form without a new branch in each place. [Stage text input](../../stage-text-input/spec.md), which widens typed input to text values, meets the same inference and gains from this too.

The places that infer it today:

- the step applier's rule that a run with `input` gives `body` on every step once it gives it on one (a run with `choose` may leave it out to show the starting state);
- the page's refusal lines, which pick "Choose another option." or "Try other numbers." by the input's type;
- the check's naming of a run in its `stage-run` lines (`B`, or `a = 48, b = 18` in the fields' order);
- `build-input`'s expectation: text with `choose`, the fields' names each a `number` with `input`.

Stays inside the Stage, its step applier and the check; it reaches no shared part `CODING_STANDARDS.md` lists.

- [ ] The step applier's `body` rule, the page's refusal wording, the check's run naming and `build-input`'s expectation each follow the Stage's control as given, not the type of the input value.
- [ ] What `steps` must take is stated as one shape, text or named values each with its kind, which `build-input` compares against and from which it words its message.
- [ ] Every existing `tests/check` case passes unchanged, the `build-input` and `stage-run` failure lines and the `pnpm look` Stage cases included; no test is added or rewritten for the refactor.
- [ ] The catalog's Stage page still runs, refuses and steps as before, a `choose` Stage and a typed one both, checked in a browser as the agent docs' browser verification says.
- [ ] No doc comment, `COMPONENTS.md` or `artifact` skill text changes, since nothing an agent or `pnpm check` reports changes.
