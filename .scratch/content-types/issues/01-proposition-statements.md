# 01: Proposition statements

Status: claimed
Blocked by: None (can start immediately)

Spec: [Content types](../spec.md) › Behaviour: the proposition, and its Documentation and Shared parts.

**What to build:** an agent can write `<Statement kind="proposition">` and get a **claim** (`GLOSSARY.md`) that behaves like a theorem, lemma or corollary in every way. Its label is "Proposição" / "Proposition" in the artifact's main language; its body reads in italic; it takes the next clause number in its section's paragraphs' series; a `Proof` can prove it; a `Ref` cites it ("Proposição 3.2"). A proof that doesn't follow it at once opens "Demonstração da Proposição 3.2." / "Proof of Proposition 3.2.": the Portuguese preposition now agrees with the label's gender ("da" for the proposition, "do" for theorem, lemma and corollary, as today). No other kind is added, and a remark or aside stays a `Note`.

`GLOSSARY.md` already lists the proposition under **Statement** and **Claim**; it needs no change. This is design-system work: do it in a local session, through impeccable (`design-system/CLAUDE.md`).

- [ ] A proposition's label, number, italic body and group name ("Proposição 1.2 (Nome)") show on the page, in both languages, tested at the `pnpm check` seam beside the existing statement cases.
- [ ] A proof right after a proposition opens "Demonstração." / "Proof." and carries the mark of a proof that follows its own statement; a proof elsewhere opens "Demonstração da Proposição 1.2." / "Proof of Proposition 1.2.", linked; theorem, lemma and corollary proofs elsewhere still open with "do". Both languages are tested at the `pnpm check` seam.
- [ ] A citation of a proposition reads "Proposição 1.2" / "Proposition 1.2" and links to it.
- [ ] A proof of a proposition passes the check; the `proof-target` failure text names the claims as "theorem, proposition, lemma or corollary", and its existing tests are updated to that text. The italic and the failure text follow the one list of claims, so a later claim kind can't be added to one and missed by the other.
- [ ] `Statement`'s doc comment and its `kind` prop's list the proposition among the kinds and the claims with its labels, and say a remark or aside goes in a `Note`; `Proof`'s doc comment and its `of` prop's say it proves a theorem, proposition, lemma or corollary. `pnpm components` regenerates `COMPONENTS.md`.
- [ ] `DESIGN.md` › Statements names the proposition among the italic claims, and its proof paragraph gives "da Proposição 2.1" beside "do Teorema 2.1".
- [ ] The `artifact` skill, in the same commit, since `pnpm check`'s failure text changes: "State definitions and results as statements" and `statements.md` list the proposition wherever they list theorem, lemma and corollary, the `proof-target` failure text included.
- [ ] The catalog's statements page shows a proposition with its proof right after it, and a proof elsewhere that cites it, checked in English and with `?lang=pt-BR`.
- [ ] Shared parts: `statements.ts` and `statement-blocks.css` reach `Statement`, `Proof` and `Ref`. The ticket's closing comment records the catalog check of a theorem's proof and citation beside the proposition's, with the same evidence.
