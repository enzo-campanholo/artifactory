# 02: The frame writes question numbers

Status: claimed
Blocked by: 01

Spec: [Page numbering](../spec.md). No number changes on any page, on screen or in print.

**What to build:** the frame writes each question's number into its markup, and CSS prints it without counting. Each item of a matching is a question with its own number, and the matching's header shows the range.

Today the page's CSS counts questions, and `numbered` in `question-markers.ts` counts them again for the question manifest, the outline and the Library's questions block. Two workarounds exist because CSS counts:

- `questionRangeSlot` leaves a slot the frame fills with a matching's range, since a counter can't print a range ahead of the questions it counts;
- `QuestionAnswer.name` in `question-answer.ts` sets `aria-label` by script, since Chromium leaves a counter out of a computed name.

With the number written, the range is two written numbers. Find out in a browser whether the written number reaches the question's computed accessible name. If it does, the script that sets it goes. If it doesn't, keep the script and say why in the closing comment.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] Each question carries its number in the built page, and its header prints that number.
- [ ] The `artifact-question` counter is gone from `ArtifactFrame.astro`.
- [ ] A matching's range prints the written numbers of its first and last items.
- [ ] The question manifest, the outline and the Library's questions block carry the same numbers as before.
- [ ] A question's accessible name carries its number, checked in a browser. The script that sets it is gone, or the closing comment says why it stays.
- [ ] `tests/check/valid-artifacts.test.ts` asserts the written number of a question and a matching's range. Every other `tests/check` and `tests/store` case passes unchanged.
- [ ] On the catalog's questions page and on the public sample, every question's number and "Next question" land as before, on screen in both themes and in print. The closing comment records how that was compared.

## Comments
