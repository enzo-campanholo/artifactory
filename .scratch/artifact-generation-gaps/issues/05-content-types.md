# 05: Content types

Type: grilling
Status: resolved

## Question

Should `Statement` take a proposition kind, and should there be a matching question?

## What the agents reported

- **No proposition kind.** A graph-colouring artifact labelled the bound χ′ ≥ Δ "Teorema" because `Statement` offers only definition, theorem, lemma, corollary and example.
- **No matching question.** A runtime-environments artifact wanted the owner to match items to memory areas (code, data, stack, heap), so it became four `SingleChoice` questions with the same four options.

## To decide

- Which `Statement` kinds to add, if any (proposition, remark, …), and how they number and read.
- Whether a matching question is an auto-checked question of its own, and how ADR 0001 stores its answer. Or keep it as several `SingleChoice` questions and document that pattern.
- The glossary terms for each new kind.

## Answer

Decided with the owner on 2026-11-08 (grilling session, rounds 1 to 3 and a follow-up on numbering, every recommendation accepted). The build is specified in [Content types](../../content-types/spec.md).

- **Proposition:** `Statement` takes `kind="proposition"` ("Proposição" / "Proposition"), a claim like a theorem: italic, numbered in the paragraphs' series, provable by `Proof`, citable by `Ref`. `GLOSSARY.md`'s **Statement** and **Claim** entries include it, and _Proposition_ left Claim's _Avoid_ list.
- **No other kinds.** A remark or aside is a `Note`. Further kinds join by proposal when an artifact needs them.
- **Matching** is the term, added to `GLOSSARY.md`: a set of auto-checked questions, one per item, sharing one list of options and checked together. Each item is its own question with its own ID, answer and mark; the set stores nothing. It is consistent with ADR 0001 and needs no change to artifact state or scoring. Rejected: one question with one all-or-nothing mark (loses which item was wrong), and documenting repeated `SingleChoice` questions (the reported problem).
- Written as prompt, numbered options, `---`, bulleted items, and optionally a second `---` with one explanation for the set; `answers={{ "<item-id>": n }}` in the items' order. Options and items are one paragraph of inline content. At least two items and two options; mismatched counts fail the build.
- Options appear once, lettered; each item is a row of letter choices, so it holds at phone width. Many-to-one, with no pairing enforced.
- One Check saves every unanswered item once each has a choice; each item locks with its own mark. The explanation shows when the last item locks; **Explanation** in `GLOSSARY.md` now says one per question, or one per matching.
- One box headed "Questões 3–5" with the hint "Associe"; each item row carries its own question number and `#q-<id>` anchor, and the series continues after it. The stopping point, attempts panel and to-revisit name items as ordinary questions.
- `SingleChoice`'s doc comment points to `Matching`; `Statement`'s lists proposition and sends asides to `Note`.
- No ADR: each part is cheap to reverse before artifacts use it, and the glossary carries the one surprising choice (a matching is several questions).
