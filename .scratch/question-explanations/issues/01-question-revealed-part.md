# 01: Give the question frame one revealed part, used by the model answer

Status: claimed
Blocked by: None (can start immediately)

Spec: [Question explanations](../spec.md). Prefactor: no behaviour changes.

**What to build:** The shared question frame that renders `SingleChoice`, `NumericQuestion` and `OpenQuestion` draws an opened model answer as a 1px rule, a caption heading and rich content. The explanation (ticket 02) and the unnumbered figures inside a question (ticket 04) both need that same block, so turn it into one part of the frame that takes its heading in both languages and its content. The model answer becomes its first user. An owner sees nothing new: an opened model answer looks, reads, prints and behaves exactly as before. After this, giving a question a second revealed part is a matter of passing it a heading and content, and "inside a question's revealed part" is one thing later tickets can select on.

Design-system work: run it in a local session with impeccable (`design-system/CLAUDE.md`), reading `PRODUCT.md` and `DESIGN.md` first.

- [ ] The question frame has one revealed part (rule, caption heading in the artifact's main language, rich content with its first and last margins trimmed) and the model answer renders through it; nothing else in the frame duplicates its look.
- [ ] An `OpenQuestion`'s model answer is unchanged on the catalog: closed, opened (`model-answer-shown`), saved right, saved wrong, in pt-BR (`?lang=pt-BR`) and in print, at phone and desktop widths, compared before and after with the same captures.
- [ ] Shared part: the frame renders all three question components, so `SingleChoice` and `NumericQuestion` are checked unchanged on the same catalog states with the same evidence.
- [ ] No doc comment or `Props` change, so `COMPONENTS.md` stays as it is; `pnpm check` passes, the existing open-question tests included, with no test added (a refactor with no new behaviour).
