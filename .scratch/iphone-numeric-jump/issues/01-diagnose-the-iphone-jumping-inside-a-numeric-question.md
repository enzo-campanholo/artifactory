# 01: Diagnose the iPhone jumping inside a numeric question

Status: needs-info

**Report (owner, 2026-10-24):** on an iPhone, after tapping the text "Calcule mdc(84, 36)…" inside the question box of a `NumericQuestion` (a Euclid's algorithm artifact, since removed from this repo), the screen rapidly repositioned itself over and over. Tapping elsewhere stopped it, and the page then looked normal.

**Not yet reproduced.** Chromium at 1280 × 800 and 393 × 852 showed one focus event and no repeated scroll reversals, but a resized desktop browser doesn't run iOS Safari, its text selection or its on-screen keyboard. Nothing has been tested on iOS.

**To diagnose:** on a real iPhone (or an iOS Simulator), open the numeric question on a catalog question page (`/catalog/<state>/`, under `pnpm dev`), tap the prompt and then the field, let the keyboard open and close, tap outside, and record `scrollY`, `visualViewport.offsetTop` and `height`, `document.activeElement` and the question's rectangle every frame. A failure is repeated reversals of the scroll position after the first focus and keyboard movement, not the one expected keyboard scroll. Minimize the failing case before naming a cause, and add no fix without that signal.

Candidates to rule in or out once there is a signal, none confirmed: the phone bar's show/hide on scroll and `focusin` (`artifact-frame.ts`), the root's `scroll-padding-block` that counts the bar (`ArtifactFrame.astro`), the Next question label rewritten on every scroll (`artifact-attempt.ts`), and the contents line kept current on scroll.

The numeric field filling its row on the phone is a separate, landed layout change; it neither claims nor is expected to fix this.

## Comments
