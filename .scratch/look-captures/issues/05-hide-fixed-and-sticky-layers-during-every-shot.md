# 05: Hide fixed and sticky layers during every shot

Status: claimed
Blocked by: 01 (Shoot every look item through one path)

Spec: [What `pnpm look` captures](../spec.md) › The item alone

**What to build:** every element shot shows the item alone, so an agent never sees the bottom bar over an item. The bar showing up is look's own timing artifact, not a page bug, and agents shouldn't reorder content to avoid it. For the length of each element shot, look hides every layer outside the item whose computed `position` is `fixed` or `sticky`, then restores each one as it was. Today those layers are the bottom bar, the state notice band and the rail. Look finds them by computed style, not by class name, so a fixed layer added later can't get back into the shots. Look doesn't check for overlaps.

Hiding must not change the page's layout. A sticky layer takes room in the flow, so removing it would move the item between measuring and shooting, and break look's scroll restore. Whichever hiding look uses must leave the item where it was.

- [x] Every element shot, the Stage's as-written and refused shots included, hides every fixed or sticky layer outside the item, found by computed style, and nothing inside the item.
- [x] Each hidden layer is restored afterwards, and `results.json` holds, for each shot, the layers look hid and an assertion that each was restored as it was.
- [x] The page's layout and scroll position are the same during the shot as before it.
- [x] Seam 1 test, a new opt-in Look fixture: at 393 px the fixture slides the bar in before the shots (owner input, then a scroll up), and has a Stepper whose bottom sits under the bar. The test checks that every shot of that Stepper hid the bar and that the bar was shown again afterwards. It asserts the exit code (0) and `results.json`.
- [x] In the same commit, the `artifact` skill's **Look** section says each shot is the item alone, with the bar and the notices hidden, and that a bar in a shot is a look bug to report, not something to fix in the artifact.

## Comments

### 2026-11-08: implemented, awaiting review

Result: look's `shoot` (`scripts/look.ts`), which every element shot passes through (the Stage's as-written and refused shots included), now hides every layer outside the item whose computed `position` is `fixed` or `sticky`. It skips the item's descendants and ancestors, and a layer nested inside another hidden layer. Look hides each one with an inline `opacity: 0 !important` for the shot and then puts its inline `opacity` back as it was. Opacity keeps a sticky layer's room in the flow, and unlike `visibility` a descendant can't opt back in. For each shot, `results.json` gets:

- `observed.hiddenLayers`: `{ file, layers: [{ layer, inView }] }`, where `layer` is tag, id and classes (`div.artifact-bar`) and `inView` says whether the layer was on screen when hidden. This records what was hidden. It is not an overlap check.
- the assertions `<file>: layers hidden` (each layer's computed opacity is `0` for the shot), `<file>: layout kept while layers hidden` (scroll and the item's page box are the same after hiding as before), and `<file>: hidden layers restored` (each layer's computed and inline opacity is the same as before). `capture`'s own "scroll restored after capture" still covers the scroll after the shot.

The restore check compares only what look changed. The page's own state can change during a shot, for example the bar's `data-shown` when the shot scrolls, and that is left alone, so it can't fail a run by mistake. `browser-session.ts` and `verify-browser` are untouched.

The `artifact` skill's **Look** section has a new paragraph: each shot is the item alone, with the bar, the notices and the rail hidden, and a bar or notice in a shot is a look bug to report, not something to fix in the artifact. I made it a separate paragraph so it doesn't conflict with ticket 02's rewrite of the paragraph above it.

Test: `tests/check/browser-verification.test.ts` › "opt-in Look fixed-layer evidence". The `look-bar` fixture has a figure Stepper with two steps, between tall sections. At 393 px, a fixture script sends owner input (`keydown`), scrolls past the Stepper and back up, so the bar slides in over the Stepper's lower edge. The test asserts exit 0, both step captures, and for each of them: `div.artifact-bar` hidden while `inView: true`, its opacity `"0"` during the shot, and `hidden layers restored` passing with opacity `"1"`.

Commits: 5e19dad (claim), dfa6de8 (hiding, test, skill).

Validation:

- Red first: the new test failed with no `hiddenLayers` recorded, while exit code and captures already matched.
- Negative check: with the `setProperty` turned into a no-op (and look's own `layers hidden` expectation flipped to match), the 393 px step-2 shot showed the bar ("Contents · 1 of 3") over the Stepper's bottom edge. With hiding on, the same shot shows no bar.
- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 pnpm exec vitest run tests/check/browser-verification.test.ts -t "Look"`: 4 passed (the 3 Stage fixtures unchanged, plus the new one).
- `pnpm look rsa-from-scratch`: exit 0, 48 shots per width, no failed assertion. It hid `artifact-attempt.artifact-bar` and `artifact-state-notices.state-notices` at 393 px, plus `artifact-attempt.artifact-rail` at 1920 px.
- Full `pnpm check` at dfa6de8: 0 failures, `check.applicability` `current`. Before it I ran `chmod 644 README.md` in this worktree, as the delegator's update said: the worktree was made under umask 077, and `tests/check/reporting.test.ts` restores `README.md` with mode `0644`, which the fingerprint counts as an edit. Git doesn't track the mode change, so the diff is unaffected.

Left undone: nothing in this ticket. Ticket 01 is still `claimed`, not `resolved`, though its work is on `gaps-implementation`. I built on it as the brief said.

### 2026-11-09: review findings fixed

The code review of `gaps-implementation` since 6b935f9 had nine accepted findings. All nine are fixed in c018047, on `t3/fix-look-review-findings`. Nothing was skipped.

1. **Stage › Avoid "frame":** look's comments now call it the Stage's `figure`.
2. **`docs/agents/test-seams.md`:** seam 1 has a new bullet for the opt-in Look fixtures, covering the Stage runs, code Steppers at every step, the model-answer reveal, the bar hidden and shown again, failing on items look can't shoot, and the nothing-to-shoot line. "Not tested automatically" now names only whether look's shots read well.
3. **Kinds carry their own selection:** each row of `kinds` now holds its `element`, the `marks` that identify its form (an item takes the first kind it matches), and, for a Stage, `shotPart` (`:scope > figure`). The item selector is built from the rows' elements, so `resolveItem` doesn't repeat the element list and has no `startsWith("stage-")`. The rows are ordered so the selector string is the same as before: `main :is(artifact-stepper, artifact-stage, figure.diagram, figure.figure):not(artifact-stage > figure)`.
4. **Place:** `type Place = { number } | { location }` now lives on `Item`. `placeText` gives the assertion's `place`, still `""` when a caption shows no number. `withPlace` formats the `(place)` suffix for both the listing and the `couldn't shoot` line.
5. **Describers:** `altOf` holds the shared `svg[role='img']` alt lookup, and `squashed` holds the whitespace clean-up, which `accessibleText` uses too.
6. **Names:** `Unshot` is now `ShotProblem`. The bare `shoot` is now `shootAlone`, and the rows' `shoot` is `takeShots`. `(page, test, item, width)` is bundled as `Shooting`, which every `shoot*` function and `takeShots` take. It reads better: each call site passes one value, and `shootAlone` and `shootSteps` lose three parameters.
7. **Last line:** with nothing to shoot, `has nothing for look to shoot` now prints after the `results.json and contact-sheet.html` line. No test asserted the old order, so I added one (see below).
8. **Look tests:** `look(repo, slug)` (it runs look, reads `results.json` and copies the `ARTIFACTORY_BROWSER_EVIDENCE` files) and `frontmatter(id, slug)` are now shared at module level by every Look describe. The fixed-layer test no longer names assertions or `observed.hiddenLayers`. For each shot it takes the states of the bar (`artifact-bar`) from that shot's assertions and expects opacity `"0"`, then `"1"`. It no longer checks that the bar was in view, because only `observed.hiddenLayers` records that.
9. **Skill:** `SKILL.md` › Look says "never move content" once, at the end of the can't-shoot paragraph. The hiding paragraph no longer repeats "the item alone", and it says that a fixed or sticky layer holding the item stays shown. The code Stepper line quotes look's real output: `no drawing; captions, one per step: "…", "…"` or `no drawing and no caption`. `stage.md` › Look now points to `SKILL.md` › Look for the model-answer reveal and no longer restates it.

Test: a new `it` in "opt-in Look Stepper evidence". The fixture repo gains `look-nothing`, an artifact of prose and a plain code block. The test expects exit 0, both cases `not-applicable`, and stdout's last line `pnpm look: artifacts/look-nothing/index.mdx has nothing for look to shoot`. Before the fix it was red: the last line was the `results.json` line.

Validation:

- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 pnpm exec vitest run tests/check/browser-verification.test.ts -t Look`: 9 passed, run on c018047.
- `pnpm look rsa-from-scratch`, before (74ce989) and after (c018047): exit 0 both times, with the same printed lines from the listing on, the same file names in `.look/rsa-from-scratch/`, and the same `results.json` cases (ids, outcomes, captures, requested, assertions, `observed.figures` and `observed.hiddenLayers`) apart from the local server's random port.
- Prettier, ESLint and `tsc` pass on the changed files. The full `pnpm check` runs on the commit that adds this comment, and its result goes in the handback.
