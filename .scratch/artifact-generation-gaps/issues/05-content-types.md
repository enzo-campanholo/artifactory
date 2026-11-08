# 05: Content types

Type: grilling

## Question

Should `Statement` take a proposition kind, and should there be a matching question?

## What the agents reported

- **No proposition kind.** A graph-colouring artifact labelled the bound χ′ ≥ Δ "Teorema" because `Statement` offers only definition, theorem, lemma, corollary and example.
- **No matching question.** A runtime-environments artifact wanted the owner to match items to memory areas (code, data, stack, heap), so it became four `SingleChoice` questions with the same four options.

## To decide

- Which `Statement` kinds to add, if any (proposition, remark, …), and how they number and read.
- Whether a matching question is an auto-checked question of its own, and how ADR 0001 stores its answer. Or keep it as several `SingleChoice` questions and document that pattern.
- The glossary terms for each new kind.
