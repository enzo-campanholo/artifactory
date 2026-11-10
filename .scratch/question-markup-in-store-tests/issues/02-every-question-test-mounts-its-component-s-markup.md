# 02: Every question test mounts its component's markup

Status: ready-for-agent
Blocked by: 01

Spec: [Question markup in store tests](../spec.md). Tests only.

**What to build:** the numeric, matching and open question tests in `tests/store` mount through the helper [01](01-the-single-choice-tests-mount-the-component-s-own-markup.md) built, and their hand copies of the components' markup go. The spike rendered only `SingleChoice`, so the other three components are untried: a matching renders several questions in one box, and an open question a model answer in place of a Check button.

`tests/store/minimal-question.ts` stays as it is. It defines its own minimal element to test the store, and copies no component.

- [ ] `numeric-question.test.ts`, `matching.test.ts` and `open-question.test.ts` mount through the helper, and every case in them still asserts what it did.
- [ ] No file in `tests/store` writes the markup of a design-system question component by hand. `grep` for the components' root tags finds them only in the helper's fixtures.
- [ ] A case that passed only because of a copy's drift is fixed in the test, or, if it shows a real fault in an element, reported in a dated comment and left failing for the owner to decide.
- [ ] Every other `tests/store`, `tests/scoring` and `tests/check` case passes unchanged, and Vitest stays on two workers.
- [ ] The closing comment records what the change adds to the store tests' run, in seconds.

## Comments
