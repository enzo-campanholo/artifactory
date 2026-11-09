# Content types

Source: [Content types](../artifact-generation-gaps/issues/05-content-types.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them.

## Problem

- **No proposition kind.** `Statement` offers only definition, theorem, lemma, corollary and example, so a graph-colouring artifact labelled the bound χ′ ≥ Δ "Teorema" when its subject calls it a proposition.
- **No matching question.** A runtime-environments artifact wanted the owner to match items to memory areas (code, data, stack, heap). It became four `SingleChoice` questions repeating the same four options.

## Behaviour: the proposition

- `Statement` takes `kind="proposition"`, labelled "Proposição" / "Proposition" in the artifact's main language.
- It is a **claim** (`GLOSSARY.md`), like a theorem, lemma or corollary: its body reads in italic, it is numbered as a clause of its section in the paragraphs' series, a `Proof` can prove it (`of` may name it), and a `Ref` cites it ("Proposição 3.2"). A proof that doesn't follow it at once opens "Demonstração da Proposição 3.2." / "Proof of Proposition 3.2.": the preposition agrees with the label's gender in pt-BR, which the proof's opening writes as "do" today.
- No other kind is added. A remark or aside is a `Note`, never a `Statement`.

## Behaviour: the matching

A **matching** (`GLOSSARY.md`) is a set of auto-checked questions, one per item, that share one list of options and are checked together. Each item is a question with its own ID, answer and mark. The set takes no ID and stores nothing, so artifact state, scoring, progress, to-revisit and the stopping point work as they do today, consistent with [ADR 0001](../../docs/adr/0001-artifact-state-stores-answers-only.md).

### Writing one

```mdx
import Matching from "@artifactory/design-system/matching";

<Matching answers={{ "variavel-global": 2, "variavel-local": 3, "objeto-new": 4 }}>

Em que área de memória fica cada item?

1. Código
2. Dados
3. Pilha
4. Heap

---

- Uma variável global
- Uma variável local
- Um objeto criado com `new`

---

Locais vivem no quadro da chamada, na pilha; `new` aloca no heap, e globais ficam na área de dados.

</Matching>
```

- The content is the prompt, the options as one numbered list, a blank line, `---`, a blank line, the items as one bulleted list, and optionally a second `---` between blank lines followed by one explanation.
- `answers` maps each item's question ID to the number of its right option, counting from 1, in the items' order. Each key follows the rules of a question's `id`: readable kebab-case, unique within the artifact, never reused.
- Options and items are one paragraph each of inline text, math and code. The explanation can hold what any explanation can (see [Question explanations](../question-explanations/spec.md)).
- Any option may be right for any number of items, or for none. The page enforces no pairing; a prompt that wants one-to-one says so in words.
- The build fails with a component error naming `Matching` when the number of `answers` differs from the number of items, when there are fewer than two items or fewer than two options, when an answer names no option, or when the second `---` has nothing after it.

### How it looks

- One question box (`DESIGN.md` › Questions). Its header reads "Questões 3–5" / "Questions 3–5", the range of its items' numbers, with the hint "Associe" / "Match".
- The prompt, then the options once, lettered a), b), c) by the page as `SingleChoice` letters them, then one row per item: the item's own question number, its text, and a row of letter choices, one per option. The layout holds at phone width because option text appears only once.
- Each item's row carries its `#q-<id>` anchor, so the stopping point, the attempts panel and the Library's to-revisit list point at the exact item and name it by its own number ("Questão 4"). The next question after the set continues the series.
- Printed, it shows the prompt, the options and every item with its empty letter choices; locked items print their marks, as `SingleChoice` does.

### Checking

- One Check button for the set. It is enabled once every unanswered item has a choice, and it saves every unanswered item's answer together.
- Each item then locks with its own mark: a right item shows a tick, a wrong one crosses out its chosen letter and ticks the right one. The header's status reports the set; each row's mark is announced with its item.
- The explanation shows once the last item locks, right or wrong, under the same rule and caption heading as any explanation.
- When an agent adds an item to a set an attempt already answered, the attempt reopens with only that item unanswered (ADR 0001): the locked items keep their marks, and Check saves just the new item.
- Each item checks as a single choice does: the response is the chosen option's number, right when it equals the key.

## Documentation

- `Statement`'s doc comment and the `kind` prop's (and so `COMPONENTS.md`, via `pnpm components`): proposition among the kinds and the claims, its label, and that a remark or aside goes in a `Note`. `Proof`'s doc comment: it proves a theorem, proposition, lemma or corollary.
- `Matching`'s doc comments: what it is for, how to write it, that each key of `answers` is a question ID with every rule a question ID has, and when to use it instead of separate `SingleChoice` questions. `SingleChoice`'s doc comment sends agents to `Matching` when several questions would share the same options.
- `DESIGN.md` › Statements names the proposition among the italic claims. `DESIGN.md` › Questions describes the matching: the range header, the hint, the lettered options, the item rows and their marks.
- The `artifact` skill: "State definitions and results as statements" and `statements.md` list the proposition wherever they list theorem, lemma and corollary (the proof-target failure text included). "Ask questions that test understanding" says to use a `Matching` when several items share one set of options.
- The catalog: the statements page shows a proposition with its proof right after it and a proof elsewhere citing it; the questions page shows a matching unanswered, partly chosen, all right, mixed right and wrong, with an explanation, and reopened with one new item.

## Shared parts

`statements.ts` and `statement-blocks.css` reach `Statement`, `Proof` and `Ref`: check a proof of a proposition and a citation of one on the catalog. `Question.astro`, `question-element.ts`, `question-markers.ts` and `split-at-rule.ts` reach `SingleChoice`, `NumericQuestion` and `OpenQuestion`: if the matching changes any of them, check those components' catalog states with the same evidence. The question numbering reaches the attempts panel and the Library's to-revisit list: check both against an artifact with a matching between other questions.

## Out of scope

- Statement kinds beyond the proposition (remark, notation, axiom, conjecture, …). Each joins by proposal when an artifact needs it.
- A one-to-one matching the page enforces, partial credit, and per-item explanations.
- Changing the private artifacts these gaps came from to use either feature: that is work in the private copy.

## Comments

### 2026-11-08: owner decisions at ticketing

Owner, /to-tickets review in the Artifact generation gaps session, 2026-11-08, every recommendation accepted. Each bullet amends this spec or fills a gap in it; the tickets in `issues/` carry the detail.

- **The matching's status** (03), filling "the header's status reports the set": no score anywhere (`DESIGN.md`). While any item is saving, not saved, answered elsewhere or signed out, the header's status follows its most urgent item, and "Try saving again" retries every unsaved item. Once every item locks, the header says only that the set is answered, and each item carries its own right or wrong mark; no count such as "2 de 3 corretas" shows.
- **Ordering with Question explanations:** 02 waits on Question explanations 01, since both prefactors rewrite the same seam of the question frame. The edge avoids conflicting rewrites; no behaviour depends on it. 05 waits on Question explanations 02, whose explanation it reuses.

### 2026-11-09: owner authorizes the design-system pass

Owner, impeccable-gaps-implementation session, 2026-11-09, the `/implement-spec` request that follows the first implementation pass (thread 3bbd72a3-5eba-484c-95f1-b5d71456b860, which left design-system tickets undone at the owner's choice). This supersedes that deferral for this spec's tickets.

- **Approved:** implementing every unresolved, non-`wontfix` ticket here, design-system work included, through impeccable in a local session (`design-system/CLAUDE.md`); agents decide open implementation questions autonomously without asking, preserving every decision recorded above; and the first pass's and this pass's work are pushed and merged into `main` once the required checks and review pass.
