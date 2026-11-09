# 01: Give the question frame one revealed part, used by the model answer

Status: resolved
Blocked by: None (can start immediately)

Spec: [Question explanations](../spec.md). Prefactor: no behaviour changes.

**What to build:** The shared question frame that renders `SingleChoice`, `NumericQuestion` and `OpenQuestion` draws an opened model answer as a 1px rule, a caption heading and rich content. The explanation (ticket 02) and the unnumbered figures inside a question (ticket 04) both need that same block, so turn it into one part of the frame that takes its heading in both languages and its content. The model answer becomes its first user. An owner sees nothing new: an opened model answer looks, reads, prints and behaves exactly as before. After this, giving a question a second revealed part is a matter of passing it a heading and content, and "inside a question's revealed part" is one thing later tickets can select on.

Design-system work: run it in a local session with impeccable (`design-system/CLAUDE.md`), reading `PRODUCT.md` and `DESIGN.md` first.

- [x] The question frame has one revealed part (rule, caption heading in the artifact's main language, rich content with its first and last margins trimmed) and the model answer renders through it; nothing else in the frame duplicates its look.
- [x] An `OpenQuestion`'s model answer is unchanged on the catalog: closed, opened (`model-answer-shown`), saved right, saved wrong, in pt-BR (`?lang=pt-BR`) and in print, at phone and desktop widths, compared before and after with the same captures.
- [x] Shared part: the frame renders all three question components, so `SingleChoice` and `NumericQuestion` are checked unchanged on the same catalog states with the same evidence.
- [x] No doc comment or `Props` change, so `COMPONENTS.md` stays as it is; `pnpm check` passes, the existing open-question tests included, with no test added (a refactor with no new behaviour).

## Comments

### 2026-11-09: closed

Implementer, impeccable-gaps-implementation pass, branch `t3/ba9003ce`.

- **Result:** `design-system/src/RevealedPart.astro` (internal, not in `exports`) is the question frame's one revealed part: `.question-revealed` holds the 1px rule and `--inset` above, `.question-revealed-heading` the caption heading (`heading: { en, pt }`, shown in the artifact's main language through `data-lang`), and `.question-revealed-content` the rich content with its first and last margins trimmed. `Question.astro` renders the model answer through it and no longer carries those styles; `open-question-element.ts` focuses `.question-revealed` on the owner's reveal. The store test's mounting markup for the open question mirrors the new parts; its assertions are unchanged and no test was added.
- **Commits:** `b548fbd` (the refactor), this closing commit.
- **Validation:** the same capture script ran on a build before and after the change: every `.question` (all three components) on `/catalog/unanswered/`, `/catalog/model-answer-shown/`, `/catalog/saved-right/`, `/catalog/saved-wrong/`, `/catalog/answered-elsewhere/` and `/catalog/started-over/`, in English and `?lang=pt-BR`, at 393 × 852 (×3) and 1920 × 1080, on screen in light and dark and in print: 216 element screenshots, byte-identical before and after, with identical boxes and `innerText`. Revealing the model answer on `/catalog/unanswered/` still opens it, makes the field read-only and moves focus to the revealed answer (before: `.question-model-answer-body`; after: `.question-revealed`). impeccable `detect` found nothing. `pnpm check` passed (0 failures), the open-question tests included.
- **Shared parts:** `Question.astro` renders `SingleChoice`, `NumericQuestion` and `OpenQuestion`; all three were in the captures above and are unchanged. `COMPONENTS.md`, `DESIGN.md` and `.impeccable/design.json` are unchanged: no doc comment, `Props` or look changed.
- **Decisions:** the part is its own internal component rather than markup inside `Question.astro`, so 02 and 03 render an explanation by passing a heading and content. Its classes are `question-revealed*`, the one selector 04 keys on. Only the model answer needs a focus target, so the part takes an optional `tabindex="-1"` and nothing else. The `--space-3` gap above the model answer stays on its `<details>`, which also spaces the closed summary, so the part draws only the rule, heading and content.
- **Left undone:** nothing.
