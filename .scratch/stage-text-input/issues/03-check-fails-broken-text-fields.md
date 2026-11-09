# 03: The check fails a text field's broken examples and props

Status: ready-for-agent
Blocked by: 02

Spec: [Stage text input](../spec.md), section "Failures". The decisions are in [Typed words in a Stage](../../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md) › Answer.

**What to build:** an agent whose Stage gets a text field wrong learns it from `pnpm check`, before the owner ever sees the page. The failures come as `build` failures at the entry, under the `artifact` skill's Build failures, shaped like today's example problems and reported together in one run with them. The text rule they check is the one field rule from 01. The same rule decides, after NFC and counting code points, whether an example's text is outside the alphabet, too long or too short. 04's page refusal then uses that rule, so an example that passes the check is never refused on the page.

- [ ] **An example that breaks a text field's rule:**
  - "example 2 gives `w` "abc", whose c is outside the alphabet"
  - "example 3 gives `w` "…", longer than 12"
  - "… shorter than 1"
  - An example with several symbols outside the alphabet names the first.
  - Lengths count code points after NFC, so a decomposed `é` counts as one.
- [ ] An example whose text isn't in NFC fails, naming the example and the field in the shape of the others. Record the wording in the closing comment.
- [ ] An example that gives a text field a number, or a number field text, fails. A number field given text keeps today's "which isn't a whole number". A text field given a number reads "example 2 gives `w` 5, which isn't text".
- [ ] An alphabet symbol that isn't one code point after NFC, or a symbol given twice, fails, naming the field and the symbol.
- [ ] A `minLength` above `maxLength`, or a negative `minLength`, fails.
- [ ] Props of the wrong kind fail: `min` or `max` on a text field, and `alphabet`, `minLength` or `maxLength` on a number field.
- [ ] Every new failure is asserted, word for word, by extending the existing Stage-failures test (`tests/check`). Today's number-field failures stay unchanged word for word.
- [ ] **The `artifact` skill, in the same commit:** the custom-build rules (`stage.md`) list the new failure messages beside the existing Stage failures.
- [ ] The `Stage`'s doc comment, where it lists what the check fails, names the text field's rules. Then `pnpm components`.
- [ ] Stays inside the Stage: no shared part changes. Number Stages on the catalog and in the sample artifact (`rsa-from-scratch`) still pass the check.
- [ ] A missing `maxLength`, or one that isn't a whole number of at least 1, fails, naming the field.

## Comments

### 2026-11-09: notes from Stage text input 01

`Stage.astro`'s `exampleProblems` checks each example against the definitions in `fields` through `fieldProblem` (`step-applier.ts`), the rule the page also refuses typed input by. Give the text rule's problems there, so the check's example failures and the page's refusals keep one rule; the props' own failures (alphabet, `minLength`, `maxLength`) sit with the other `problems` above it.
