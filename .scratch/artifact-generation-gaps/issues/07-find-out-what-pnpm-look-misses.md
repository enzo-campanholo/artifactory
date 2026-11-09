# 07: Find out what `pnpm look` misses

Type: task
Status: resolved

## Question

Why does `pnpm look` miss some parts of an artifact, and is the phone-width overlap it showed a real page bug?

## What the agents reported

- **Code-highlight Steppers aren't captured.** In a stack-machine artifact, a Stepper that highlights one line at a time was never seen rendered; only the check passed.
- **Content inside a hidden model answer isn't captured.** A graph-colouring artifact's solution drawing sits inside an `OpenQuestion`'s model answer. To look at it, the agent moved it out temporarily and then moved it back.
- **At 393 px, the sticky bar covered the bottom of a figure Stepper** in the screenshots of an intermediate-code artifact. The agent moved the Stepper's output line above the drawing to work around it. It's unknown whether a real phone shows the same overlap.

## To do (AFK)

Read the look script and run it on the public sample, or on a throwaway fixture artifact that isn't committed, to record: which components it shoots and how, why it skips the two cases above, and whether the sticky-bar overlap reproduces in a real 393 px page scrolled to the figure. Record the facts in the answer. The decision about what look should capture goes to a later ticket ("Not yet specified" on the map).

## Answer

Done AFK on 2026-11-08 in the upstream checkout. I read `scripts/look.ts` and `scripts/browser-session.ts` and ran `pnpm look` on `rsa-from-scratch` and on a throwaway fixture artifact, which I then deleted and didn't commit. The fixture held a one-block code Stepper, an `OpenQuestion` with a `Figure` in its model answer, and two figure Steppers, one of them about 35 px taller. Two throwaway Puppeteer scripts outside the repo measured the bottom bar. One replays look's capture loop with look's own `preparePage`, `ready` and `capture`. The other plays a reader on a phone: wheel scrolls, a tap on forward, a short scroll back up. Puppeteer 25.14.0, Nix Chromium (`CHROME_PATH`).

**What look shoots, and how.** It builds the site, then for each of two viewports, 393 × 852 at 3× and 1920 × 1080 at 1×, it opens a fresh context and collects `main figure.diagram, main figure.figure, main artifact-stepper:has(.stepper-boards, .stepper-figure)`. That is every `Diagram` and `Figure`, every diagram or figure `Stepper`, and every `Stage`. Each one is shot alone with Puppeteer's `ElementHandle.screenshot`. That call scrolls the item to the viewport's centre only when it isn't already fully inside the viewport, then clips a screenshot of the page to the item's box. A Stepper is shot once per step, clicking `button.stepper-forward` between steps. A Stage is shot as written, then runs its first option or example and is shot at each step, or once refused. After each shot, `capture` resets the viewport and scrolls back to where the page was before the shot.

**Why code Steppers aren't captured.** The selector leaves them out. A one-block code Stepper renders `.stepper-code`, with no `.stepper-boards` or `.stepper-figure`, so look never finds it and doesn't say so. Nothing else that isn't a figure is shot either: plain code blocks, tables, questions. The fixture's code Stepper went missing from the list without comment, and so did the `pow_mod` Stepper in `rsa-from-scratch`. The artifact skill's Look section lists only "diagram or figure `Stepper`", but it never says that code Steppers go unseen. [Code display](02-code-display.md) adds a Stepper with one code block per step, which look would also skip under today's selector.

**What happens to content inside a hidden model answer.** It's shot, but the shot is wrong, and nothing flags it. The model answer is a closed `<details class="question-model-answer">`. The figure inside isn't rendered (`checkVisibility()` is false), but it still has a client rect (one rect, 353 × 383, at the spot it would take on the page). So Puppeteer doesn't throw. It clips the page at that rect and shoots whatever is painted there. In the fixture, `01-figure-393.png` showed the paragraph and the first step of the next Stepper. look printed the hidden figure's `alt` above that shot, and the case outcome was `captured-awaiting-visual-review`. An agent that compares the shot with the `alt` sees a mismatch it can't fix, which is why the graph-colouring agent moved the figure out of the model answer. Any other content behind a closed `<details>` behaves the same way. In the design system that's only `Question`'s model answer, but [Question explanations](01-question-explanations.md) adds explanations that stay hidden until the answer locks.

**Whether the sticky-bar overlap is a real page bug.** No. On a real phone, the bar covers the bottom of a figure only while the reader has just scrolled up, as designed. In look's shots it is an artifact of how look scrolls, and whether it appears depends on timing.

- The bar is `.artifact-bar`, `position: fixed` at the bottom below 64rem, 68 px tall at 393 px. As `DESIGN.md` › Layout says, it slides in when the owner scrolls up with the masthead out of view and slides out when they scroll down. It moves only after the owner's first pointer, touch, wheel or key input. `ElementHandle.screenshot` clips the page, so a fixed layer over the item ends up in the shot. look neither hides the bar nor checks it.
- In look, the first forward click counts as owner input. After that, `capture`'s scroll back to where the page was before the shot is often a scroll up, so the bar slides in. Later steps of the same Stepper are already fully in view, so Puppeteer doesn't scroll again, and the bar stays over the bottom 68 px of the viewport.
- The replay with look's own helpers reproduced it. In the fixture's taller Stepper (bottom at 795 px), steps 3 to 7 were shot with the bar shown from 784 px, so it covered 11 px: the 4 px bar rule replaced the Stepper's bottom rule. The shorter Stepper (bottom at 778 px) and both figure Steppers in `rsa-from-scratch` (778 and 768 px) end just above the bar, so they came out clean.
- Two real `pnpm look` runs of the same fixture showed no bar on that Stepper. Whether the bar is in a shot depends on when the scroll events land relative to look's clicks and scroll restores. So look can show the overlap in one run and not in the next, and it only affects an item whose bottom ends up between 784 and 852 px in the viewport.
- A reader at 393 px who scrolls down to a figure Stepper and taps forward never sees the bar: scrolling down hides it, and a tap on forward doesn't bring it back. Scrolling back up 120 px brings it in over the bottom 68 px of whatever is there, figure Steppers included, until the reader scrolls down again. That's the designed bar, and the page reserves room for it at the end (`padding-block-end` and `scroll-padding-block` include `--artifact-bar-size`). The intermediate-code agent's workaround, moving the output line above the drawing, wasn't needed.

What look should capture goes to [What `pnpm look` captures](11-what-pnpm-look-captures.md).
