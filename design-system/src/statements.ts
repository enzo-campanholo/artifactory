const labels = {
  definition: { en: "Definition", pt: "Definição" },
  theorem: { en: "Theorem", pt: "Teorema" },
  lemma: { en: "Lemma", pt: "Lema" },
  corollary: { en: "Corollary", pt: "Corolário" },
  example: { en: "Example", pt: "Exemplo" },
};

type StatementKind = keyof typeof labels;

export const claims: ReadonlySet<StatementKind> = new Set(["theorem", "lemma", "corollary"]);

export function isClaim(kind: StatementKind): boolean {
  return claims.has(kind);
}

// A heading's ID is its text slugged, which is never uppercase, so a statement's can't equal one.
export function statementAnchor(statementId: string): string {
  return `S-${statementId}`;
}

function escapedText(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// As Astro writes attribute values, so the frame reads a slot's ID the way it reads a marker's.
function escapedAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function unescapedAttribute(written: string): string {
  return written.replaceAll("&quot;", '"').replaceAll("&amp;", "&");
}

function bilingual({ en, pt }: { en: string; pt: string }, after = ""): string {
  return `<span data-lang="en">${en}${after}</span><span data-lang="pt">${pt}${after}</span>`;
}

// A kebab-case ID never holds "--", so no label part's ID can equal another statement's anchor
// or part.
function partId(statementId: string, part: "kind" | "number" | "name"): string {
  return `${statementAnchor(statementId)}--${part}`;
}

type Solution = "shown" | "empty";

// The page's frame fills in the number, which only it can count. The group is named by the label's
// parts rather than the label, whose full stop would follow the hidden number after a space.
export function statementParts({
  id,
  kind,
  name,
  solution,
}: {
  id: string;
  kind: StatementKind;
  name: string | undefined;
  solution: string | undefined;
}) {
  const shown = solution !== undefined && solution !== "";
  const named =
    name === undefined
      ? ""
      : ` <span class="statement-name" id="${escapedAttribute(partId(id, "name"))}">(${escapedText(name)})</span>`;
  return {
    attributes: {
      id: statementAnchor(id),
      "data-statement-id": id,
      "data-statement-kind": kind,
      ...(solution === undefined
        ? {}
        : { "data-statement-solution": (shown ? "shown" : "empty") satisfies Solution }),
      role: "group" as const,
      "aria-labelledby": [
        partId(id, "kind"),
        partId(id, "number"),
        ...(name === undefined ? [] : [partId(id, "name")]),
      ].join(" "),
    },
    label:
      `<span class="statement-label">` +
      `<strong class="statement-kind" id="${escapedAttribute(partId(id, "kind"))}">${bilingual(labels[kind])}</strong>` +
      `<span class="artifact-visually-hidden" id="${escapedAttribute(partId(id, "number"))}" data-statement-number="${escapedAttribute(id)}"></span>` +
      `${named}.</span>`,
    solution: shown
      ? withRunInLabel(
          solution,
          `<span class="statement-label"><strong>${bilingual({ en: "Solution", pt: "Solução" })}</strong>.</span>`,
        )
      : undefined,
  };
}

export function withRunInLabel(content: string, label: string): string {
  const firstParagraph = /^<p\b[^>]*>/.exec(content);
  return firstParagraph === null
    ? `<p>${label}</p>${content}`
    : `${firstParagraph[0]}${label} ${content.slice(firstParagraph[0].length)}`;
}

// Ref writes a citation with the statement's ID as its text, and the frame replaces the text with
// the label and number, or marks the citation unresolved for the check.
export function citationMarkup(to: string): string {
  return `<a class="citation" href="#${escapedAttribute(statementAnchor(to))}" data-citation="${escapedAttribute(to)}">${escapedText(to)}</a>`;
}

// The frame fills in the opening, since only the page can tell whether the proof follows its
// statement at once.
export function proofParts(of: string) {
  return {
    attributes: { "data-proof-of": of },
    label:
      `<span class="proof-label">` +
      `<strong class="proof-kind">${bilingual({ en: "Proof", pt: "Demonstração" })}</strong>` +
      `<span class="proof-of" data-proof-target="${escapedAttribute(of)}"></span>.</span>`,
    end: `<span class="proof-end"><span class="artifact-visually-hidden">${bilingual({ en: "End of proof.", pt: "Fim da demonstração." })}</span></span>`,
  };
}

function unresolvedCitationMarkup(to: string): string {
  return `<span class="citation" data-citation="${escapedAttribute(to)}">${escapedText(to)}</span>`;
}

const citation = /<a class="citation" href="[^"]*" data-citation="([^"]*)">[^<]*<\/a>/g;
const unresolvedCitation = /<span class="citation" data-citation="([^"]*)">/g;
const numberSlot =
  /(<span class="artifact-visually-hidden" id="[^"]*" data-statement-number="([^"]*)">)([^<]*)(<\/span>)/g;

interface NumberedStatement {
  id: string;
  kind: StatementKind;
  number: string | undefined;
  solution: Solution | undefined;
}

const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

// Astro writes well-formed HTML with every attribute value quoted, and code blocks escape their
// "<", so a tag is a tag. Script and style bodies, and comments, are skipped whole.
const token =
  /<!--[\s\S]*?-->|<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<\/[a-zA-Z][\w:-]*\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

function attributeValue(attributes: string, name: string): string | undefined {
  const written = new RegExp(String.raw`\s${name}="([^"]*)"`).exec(attributes)?.[1];
  return written === undefined ? undefined : unescapedAttribute(written);
}

interface ScannedProof {
  of: string;
  followsStatement: boolean;
  // Offsets in the scanned content: the block's opening tag's ">", and the end of its opening
  // slot's opening tag.
  tagEnd: number;
  opening: number | undefined;
}

// The margin counts the main column's own paragraphs, h3s and `[data-statement-id]` elements after
// an h2, with CSS counters in `ArtifactFrame.astro`. This counts the same elements, so a citation
// prints the number the margin shows. A statement elsewhere has no number. A proof follows its
// statement when the main column's element before it is the statement it proves.
function statementsAndProofs(content: string): {
  inOrder: NumberedStatement[];
  statements: Map<string, NumberedStatement>;
  proofs: ScannedProof[];
} {
  const inOrder: NumberedStatement[] = [];
  const statements = new Map<string, NumberedStatement>();
  const proofs: ScannedProof[] = [];
  const openProofs: { proof: ScannedProof; depth: number }[] = [];
  let depth = 0;
  let section = 0;
  let clause = 0;
  let previousStatement: string | undefined;
  for (const { 0: tag, 1: rawText, 2: name, 3: attributes = "", index } of content.matchAll(
    token,
  )) {
    if (rawText !== undefined || tag.startsWith("<!")) continue;
    if (name === undefined) {
      depth = Math.max(0, depth - 1);
      if (openProofs.at(-1)?.depth === depth) openProofs.pop();
      continue;
    }
    const element = name.toLowerCase();
    const statementId = attributeValue(attributes, "data-statement-id");
    const kind = attributeValue(attributes, "data-statement-kind") as StatementKind | undefined;
    const counted = depth === 0 && section > 0;
    const proofOf = attributeValue(attributes, "data-proof-of");
    if (proofOf !== undefined) {
      const proof: ScannedProof = {
        of: proofOf,
        followsStatement: depth === 0 && previousStatement === proofOf,
        tagEnd: index + tag.length - 1,
        opening: undefined,
      };
      proofs.push(proof);
      openProofs.push({ proof, depth });
    }
    const innermostProof = openProofs.at(-1)?.proof;
    if (
      innermostProof !== undefined &&
      attributeValue(attributes, "data-proof-target") !== undefined
    ) {
      innermostProof.opening ??= index + tag.length;
    }
    if (depth === 0) previousStatement = statementId;
    if (depth === 0 && element === "h2") {
      section += 1;
      clause = 0;
    } else if (counted && (element === "p" || element === "h3" || statementId !== undefined)) {
      clause += 1;
    }
    if (statementId !== undefined && kind !== undefined) {
      const statement: NumberedStatement = {
        id: statementId,
        kind,
        number: counted ? `${String(section)}.${String(clause)}` : undefined,
        solution: attributeValue(attributes, "data-statement-solution") as Solution | undefined,
      };
      inOrder.push(statement);
      if (!statements.has(statementId)) statements.set(statementId, statement);
    }
    if (!voidElements.has(element) && !attributes.endsWith("/")) depth += 1;
  }
  return { inOrder, statements, proofs };
}

function withInserted(content: string, insertions: { at: number; text: string }[]): string {
  let written = "";
  let from = 0;
  for (const { at, text } of [...insertions].sort((a, b) => a.at - b.at)) {
    written += content.slice(from, at) + text;
    from = at;
  }
  return written + content.slice(from);
}

// A proof right after its statement is marked so it stands closer to it. Any other proof of a claim
// gets " do Teorema 2.1" in its opening slot.
function proofReferences(
  proofs: ScannedProof[],
  statements: Map<string, NumberedStatement>,
): { at: number; text: string }[] {
  return proofs.flatMap(({ of, followsStatement, tagEnd, opening }) => {
    if (followsStatement) return [{ at: tagEnd, text: " data-follows-statement" }];
    const proven = statements.get(of);
    if (opening === undefined || proven === undefined || !isClaim(proven.kind)) return [];
    const number = proven.number === undefined ? "" : `\u00a0${proven.number}`;
    return [
      {
        at: opening,
        text:
          ` ${bilingual({ en: "of", pt: "do" })} ` +
          `<a href="#${escapedAttribute(statementAnchor(of))}">${bilingual(labels[proven.kind], number)}</a>`,
      },
    ];
  });
}

export function withStatementReferences(content: string): string {
  const { statements, proofs } = statementsAndProofs(content);
  const numberOf = (written: string) => statements.get(unescapedAttribute(written));
  return withInserted(content, proofReferences(proofs, statements))
    .replace(numberSlot, (slot, open: string, written: string, _empty: string, close: string) => {
      const number = numberOf(written)?.number;
      return number === undefined ? slot : `${open} ${number}${close}`;
    })
    .replace(citation, (link, written: string) => {
      const cited = numberOf(written);
      if (cited === undefined) return unresolvedCitationMarkup(unescapedAttribute(written));
      const number = cited.number === undefined ? "" : `\u00a0${cited.number}`;
      return link.replace(/>[^<]*<\/a>$/, `>${bilingual(labels[cited.kind], number)}</a>`);
    });
}

export interface StatementOnPage {
  id: string;
  numbered: boolean;
  kind: StatementKind;
  solution: Solution | undefined;
}

export function statementsOnPage(html: string): StatementOnPage[] {
  const numbered = new Set(
    [...html.matchAll(numberSlot)].flatMap(([, , written = "", number = ""]) =>
      number === "" ? [] : [unescapedAttribute(written)],
    ),
  );
  return statementsAndProofs(html).inOrder.map(({ id, kind, solution }) => ({
    id,
    numbered: numbered.has(id),
    kind,
    solution,
  }));
}

export interface ProofOnPage {
  of: string;
  proves: StatementKind | undefined;
}

export function proofsOnPage(html: string): ProofOnPage[] {
  const { statements, proofs } = statementsAndProofs(html);
  return proofs.map(({ of }) => ({ of, proves: statements.get(of)?.kind }));
}

export function unresolvedCitationsOnPage(html: string): string[] {
  return [...html.matchAll(unresolvedCitation)].map(([, written = ""]) =>
    unescapedAttribute(written),
  );
}
