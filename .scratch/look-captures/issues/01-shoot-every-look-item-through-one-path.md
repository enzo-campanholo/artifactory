# 01: Shoot every look item through one path

Status: claimed
Blocked by: None (can start immediately)

Spec: [What `pnpm look` captures](../spec.md)

**What to build:** a prefactor with no change in behaviour, so the later tickets each have one place to go. Today look works out an item's kind in several places: one check picks the Stage path, another names the file, another decides how the item is stepped and described. It also calls the shared capture helper from three places. After this ticket, look resolves each selected item once, to its kind (diagram, figure, the Stepper's form, `stage-choose` or `stage-input`). That one resolution decides the item's file name, how it's stepped, how it's described and what the line above its files says. Every element shot then goes through one look-owned step around the shared capture helper. Ticket 03's reveal goes before and after an item, ticket 05's hiding of fixed layers goes around each shot, and tickets 02 and 07 add Stepper forms in one place.

The shared capture helper is also used by `verify-browser`, and its behaviour there stays the same.

- [ ] Look resolves each item's kind once, and nothing else in look works the kind out again.
- [ ] Every element shot look takes goes through one look-owned step. `verify-browser`'s captures are unchanged.
- [ ] Nothing changes in what you can see: the opt-in Look Stage fixtures pass unchanged, and `pnpm look rsa-from-scratch` gives the same printed lines, file names and `results.json` cases and outcomes before and after.
- [ ] No test is added or changed, and the `artifact` skill doesn't change, since behaviour doesn't change.
