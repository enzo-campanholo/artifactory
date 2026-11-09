# 01: Shoot every look item through one path

Status: claimed
Blocked by: None (can start immediately)

Spec: [What `pnpm look` captures](../spec.md)

**What to build:** a prefactor with no change in behaviour, so the later tickets each have one place to go. Today look works out an item's kind in several places: one check picks the Stage path, another names the file, another decides how the item is stepped and described. It also calls the shared capture helper from three places. After this ticket, look resolves each selected item once, to its kind (diagram, figure, the Stepper's form, `stage-choose` or `stage-input`). That one resolution decides the item's file name, how it's stepped, how it's described and what the line above its files says. Every element shot then goes through one look-owned step around the shared capture helper. Ticket 03's reveal goes before and after an item, ticket 05's hiding of fixed layers goes around each shot, and tickets 02 and 07 add Stepper forms in one place.

The shared capture helper is also used by `verify-browser`, and its behaviour there stays the same.

- [x] Look resolves each item's kind once, and nothing else in look works the kind out again.
- [x] Every element shot look takes goes through one look-owned step. `verify-browser`'s captures are unchanged.
- [x] Nothing changes in what you can see: the opt-in Look Stage fixtures pass unchanged, and `pnpm look rsa-from-scratch` gives the same printed lines, file names and `results.json` cases and outcomes before and after.
- [x] No test is added or changed, and the `artifact` skill doesn't change, since behaviour doesn't change.

## Comments

### 2026-11-08: implemented, awaiting review

Result: `scripts/look.ts` resolves each selected item once (`resolveItem`) to a `Kind`: `diagram`, `figure`, `stepper-boards`, `stepper-figure`, `stage-choose` or `stage-input`. A `kinds` table keyed by that kind gives the file stem, the shoot function (`shootOnce`, `shootStepper`, `shootStage`) and the describe function; nothing else in look tests the item's classes. Every element shot goes through look's own `shoot(page, test, item, file)`, which wraps `capture` from `browser-session.ts`. `shootSteps` takes its forward and current-step selectors from a `Stepping` the kind passes, instead of sniffing the forward selector and the element's classes. `browser-session.ts` and `verify-browser` are untouched.

Seams for the later tickets:

- 02 and 07: add a `Kind` (`stepper-lines`, then the block-per-step form) with its table row (stem `stepper`, `shootStepper`, a captions describer), and broaden the selector; `resolveItem` is where an unknown form would resolve for 04.
- 03 and 06: the reveal goes around `kinds[item.kind].shoot(…)` in the main loop, where `numberOf` would give way to the location.
- 05: hiding the fixed and sticky layers goes inside `shoot`, which every element shot (the Stage's as-written and refused shots included) already passes through.

Commits: 66a78f6 (claim), 9e46285 (refactor).

Validation:

- `pnpm look rsa-from-scratch` before and after: exit 0 both times; the printed lines from `pnpm look: artifacts/…` on are identical (113 lines), the `.look/rsa-from-scratch/` file lists are identical, and `results.json` is identical once the random server port and `output` (the build's hashes) are left out: same cases, outcomes, captures, assertions (953 per case), figures and capture measurements.
- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 pnpm exec vitest run tests/check/browser-verification.test.ts -t "Look Stage"`: 3 passed, unchanged.
- Full `pnpm check`: see below.

No test added or changed; the `artifact` skill is unchanged. Nothing left undone.
