# 01: Proposition statements

Status: resolved
Blocked by: None (can start immediately)

Spec: [Content types](../spec.md) › Behaviour: the proposition, and its Documentation and Shared parts.

**What to build:** an agent can write `<Statement kind="proposition">` and get a **claim** (`GLOSSARY.md`) that behaves like a theorem, lemma or corollary in every way. Its label is "Proposição" / "Proposition" in the artifact's main language; its body reads in italic; it takes the next clause number in its section's paragraphs' series; a `Proof` can prove it; a `Ref` cites it ("Proposição 3.2"). A proof that doesn't follow it at once opens "Demonstração da Proposição 3.2." / "Proof of Proposition 3.2.": the Portuguese preposition now agrees with the label's gender ("da" for the proposition, "do" for theorem, lemma and corollary, as today). No other kind is added, and a remark or aside stays a `Note`.

`GLOSSARY.md` already lists the proposition under **Statement** and **Claim**; it needs no change. This is design-system work: do it in a local session, through impeccable (`design-system/CLAUDE.md`).

- [x] A proposition's label, number, italic body and group name ("Proposição 1.2 (Nome)") show on the page, in both languages, tested at the `pnpm check` seam beside the existing statement cases.
- [x] A proof right after a proposition opens "Demonstração." / "Proof." and carries the mark of a proof that follows its own statement; a proof elsewhere opens "Demonstração da Proposição 1.2." / "Proof of Proposition 1.2.", linked; theorem, lemma and corollary proofs elsewhere still open with "do". Both languages are tested at the `pnpm check` seam.
- [x] A citation of a proposition reads "Proposição 1.2" / "Proposition 1.2" and links to it.
- [x] A proof of a proposition passes the check; the `proof-target` failure text names the claims as "theorem, proposition, lemma or corollary", and its existing tests are updated to that text. The italic and the failure text follow the one list of claims, so a later claim kind can't be added to one and missed by the other.
- [x] `Statement`'s doc comment and its `kind` prop's list the proposition among the kinds and the claims with its labels, and say a remark or aside goes in a `Note`; `Proof`'s doc comment and its `of` prop's say it proves a theorem, proposition, lemma or corollary. `pnpm components` regenerates `COMPONENTS.md`.
- [x] `DESIGN.md` › Statements names the proposition among the italic claims, and its proof paragraph gives "da Proposição 2.1" beside "do Teorema 2.1".
- [x] The `artifact` skill, in the same commit, since `pnpm check`'s failure text changes: "State definitions and results as statements" and `statements.md` list the proposition wherever they list theorem, lemma and corollary, the `proof-target` failure text included.
- [x] The catalog's statements page shows a proposition with its proof right after it, and a proof elsewhere that cites it, checked in English and with `?lang=pt-BR`.
- [x] Shared parts: `statements.ts` and `statement-blocks.css` reach `Statement`, `Proof` and `Ref`. The ticket's closing comment records the catalog check of a theorem's proof and citation beside the proposition's, with the same evidence.

## Comments

### 2026-11-09: resolved

**Result.** `<Statement kind="proposition">` is a claim: labelled "Proposição" / "Proposition", italic, numbered in its section's clause series, provable by a `Proof` and citable by a `Ref`. A proof elsewhere opens "Demonstração da Proposição 3.2." / "Proof of Proposition 3.2."; theorem, lemma and corollary proofs still open with "do". The `proof-target` failure text now ends "give `of` the ID of the theorem, proposition, lemma or corollary it proves". No other kind was added.

**Commits.** `b1c58ed` (claim), `a5b4c89` (implementation, docs, `COMPONENTS.md`, the `artifact` skill and tests in one commit), and this closing commit.

**Validation.**

- `tests/check/valid-artifacts.test.ts` › statements and citations: the `valor-medio` (pt-BR) and `mean-value` (en) fixtures each gained a section with a named proposition, its proof right after it, an unnamed proposition, a paragraph citing it, and its proof elsewhere. The tests assert the group names ("Proposição 3.1 (Média)", "Proposition 3.2"), the citations ("Proposição 3.2", linked), the proof openings ("Demonstração." with the follows-statement mark; "Demonstração da Proposição 3.2.", linked, without it; "do Lema 1.5" unchanged) and, in a new case, which statements carry the claim mark. Each slice ran red first, then green (6 of 6).
- `tests/check/artifact-failures.test.ts`: the four `proof-target` lines updated to the new text.
- Catalog, built and served with `scripts/browser-session.ts` in Chrome 155, `/catalog/` and `/catalog/?lang=pt-BR`, light and dark, at 1280 and 393 px (8 variants). Computed styles: both propositions' bodies italic and labels upright, like Theorem 2.3 and Theorem 2.11 beside them. The proposition's proof right after it carries `data-follows-statement` at 14px; the later "Proof of Proposition 2.15." / "Demonstração da Proposição 2.15." links `#S-uniformly-continuous` at 22px, as "Proof of Theorem 2.11." / "Demonstração do Teorema 2.11." does beside it. Citations read "Proposição 2.14" / "Proposition 2.14" and "Teorema 2.11" / "Theorem 2.11", linked. No horizontal overflow and no page errors in any variant. Screenshots checked by eye.
- Full `pnpm check` gate on the final HEAD, after merging the integration tip (recorded by the coordinator's report).

**Decisions.**

- The italic follows the one list of claims through a mark: `statementParts` writes `data-statement-claim` on every statement `isClaim` accepts, and `Statement.astro` sets `[data-statement-claim]` in italic, replacing the selector that named theorem, lemma and corollary. `src/statement-failures.ts` already wrote the `proof-target` text from `claims`, so both now follow that one set, and a later claim kind can't reach one and miss the other.
- The italic is tested through that mark: happy-dom computes no style from the built CSS's cascade layers (every element reads `normal`), so a computed-style assertion can't work at the `pnpm check` seam. The test says so in a comment, and the catalog check above covers the italic itself.
- The Portuguese preposition lives beside each label in `statements.ts` (`ptOf`: "da" for definition and proposition, "do" for the rest), so a proof's opening agrees with the label it names.
- The catalog's propositions ("Bounded derivative", then an unnamed one on uniform continuity) follow the corollaries of the "Consequences" subsection, with a lead-in paragraph for each case.

**Shared parts.** `statements.ts` changed and reaches `Statement`, `Proof` and `Ref`: all three are checked above, a theorem's proof and citation beside the proposition's, with the same evidence. `statement-blocks.css` didn't change. The italic rule stays in `Statement.astro`.

**Left undone.** Nothing.

2026-11-09: review fix (Standards smell 5, commit dd018a2): `escapedAttribute` and its inverse were copied between `statements.ts` and `question-markers.ts` (there called `attributeValue`). Both must escape as Astro does, so a fix to one must reach the other. They now live once in `design-system/src/html-attributes.ts` as `escapedAttribute`/`unescapedAttribute`. Built HTML is unchanged.
