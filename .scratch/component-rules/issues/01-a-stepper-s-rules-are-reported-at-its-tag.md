# 01: A Stepper's rules are reported at its tag

Status: claimed
Blocked by: None (can start immediately)

Spec: [Component rules](../spec.md). This ticket builds the whole path for one component, so [02](02-every-component-reports-its-rules.md) only repeats it.

**What to build:** in a build, a `Stepper` whose rule is broken renders only a marker carrying its name and message. The design system exports a reader of the markers on a page. The built-output pass reports each one as `component-rule`, under **Components**, at the Stepper's own tag in the entry, and the build fails at the end. In `astro dev` the rule throws as today.

The Stepper's rules are thrown from two files, `Stepper.astro` and `stepper.ts`, ten places in all. `stepper.ts` also parses the line-list grammar that a fence's `{…}` uses; that parse already returns a refusal's reason, and only the Stepper turns it into a component error, so the fence's own failures don't change.

Every other component keeps throwing until 02, so the log scraping in `scripts/check/steps/build.ts` and `onlyTagOffset` stay for now.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`). Nothing the owner sees on a valid page changes.

- [ ] In a build, each broken `Stepper` renders a marker and nothing else of itself, and the build fails at the end with no question manifest, public paths manifest or build ID.
- [ ] Each marker is reported as `component-rule` under **Components**, with the message it has today.
- [ ] Two broken Steppers in one entry are each reported at their own tag, in one run, and so is a Stepper the entry imports under another name.
- [ ] When the page's Steppers and the entry's tags don't count the same, the failure falls back to line 1, column 1 of the entry.
- [ ] A marker on a page that isn't an artifact fails the build at the config's start, with the page's route in the message.
- [ ] An artifact with a `component-rule` failure skips its other built-page checks, and a valid artifact in the same repo keeps all of them.
- [ ] In `astro dev` a broken Stepper rule throws with today's message. One function decides between throwing and rendering the marker.
- [ ] The design system imports nothing from the platform.
- [ ] `tests/check`: the Stepper's rule cases assert the new rule ID and positions. They move into one fixture repo that 02 extends, and their single-rule fixture repos go.
- [ ] The `artifact` skill's `rules.md` documents `component-rule` for the Stepper in the same commit, and `docs/agents/test-seams.md` follows.
- [ ] A valid Stepper of each form (code blocks, `lines`, `diagram`, `figure`) renders on its catalog page as before.

## Comments
