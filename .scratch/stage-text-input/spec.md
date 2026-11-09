# Stage text input

Source: [Typed words in a Stage](../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them.

## Problem

A Stage's `input` takes only whole numbers. The owner plans machine traces of finite automata and Turing machines, which read a word ("aabba"), and calls text input essential. [Machine trace](../machine-trace/spec.md)'s paper check assumes a word input for both. Other builds, such as a hashing or a parsing artifact, take a line of text. Until now, the only way round it was a choice group of fixed words.

This supersedes [Stage controls and drawing](../artifact-generation-gaps/issues/03-stage-controls-and-drawing.md)'s "`input` stays whole numbers", which held because no report asked for more.

## Behaviour

### A text field

A text field is a field in `input.fields`, next to the number fields:

```mdx
<Stage
  build="automato"
  input={{
    label: "Aceita w?",
    fields: [{ name: "w", kind: "text", alphabet: ["a", "b"], maxLength: 12 }],
    examples: [{ w: "aabba" }, { w: "" }, { w: "bbbb" }],
  }}
  prompt="Digite uma palavra e comece."
  figure={automato}
  alt="Um autômato finito com três estados."
>
```

- `{ name, label?, kind: "text", alphabet?, minLength?, maxLength }`. A field without `kind` stays a whole number, `{ name, label?, min, max }`, so existing Stages and builds don't change.
- One Stage can mix both kinds, such as a hashing artifact's text and modulus.
- `alphabet` (optional): a list of symbols, each one code point. With it, the field takes a word over that alphabet. Without it, the field takes one line of any text, spaces included.
- `maxLength` (required): the most symbols the field takes. `minLength` (optional, default 0): the fewest. With `minLength` 0 the empty word counts: an empty field is the empty word.
- The page normalises the typed text to NFC and counts its length in code points, so `é` is one symbol however it was typed. It doesn't trim or fold case, since a trailing space is part of a hashing artifact's input.
- Multi-character symbols, such as a parser's `id`, are the build's to split: give the field no alphabet and tokenise in the build.

### The build

- `Typed` becomes `Record<string, number | string>`. `steps` gets each text field's value as a `string`, the empty word as `""`.
- The build types each field: `defineBuild<{ w: string; m: number }>({ … })`. A text field takes `string`, a number field `number`.
- [Machine trace](../machine-trace/spec.md)'s `reads` may name text fields like number fields. No machine definition beyond MEPA is part of this spec.

### The field

- Set in the code face, since builds read it symbol by symbol, and `0`/`O` or `l`/`1` must stay distinguishable.
- As wide as `maxLength` plus one character, as number fields fit their longest bound and one digit more, so text refused for being too long still shows whole. A field wider than a 393px phone takes its own line, full width.
- Autocapitalise, autocorrect and spellcheck off. No `maxlength` attribute: pasted text stays whole, and the page refuses it instead of truncating it.
- The final look goes through impeccable in a local session (`design-system/CLAUDE.md`).

### Refusals

A refused text field is drawn dashed, takes the focus, and its rule goes in the step's line, as a refused number field's bounds do. The line states the whole rule, not which symbol broke it:

| Field | pt-BR | English |
| --- | --- | --- |
| alphabet, `minLength` 0 | Digite até 12 símbolos, só a e b, para w. | Type up to 12 symbols, only a and b, for w. |
| alphabet, `minLength` 1 | Digite de 1 a 12 símbolos, só a e b, para w. | Type 1 to 12 symbols, only a and b, for w. |
| no alphabet, `minLength` 0 | Digite até 40 caracteres para t. | Type up to 40 characters for t. |
| no alphabet, `minLength` 2 | Digite de 2 a 40 caracteres para t. | Type 2 to 40 characters for t. |

The alphabet lists its symbols with commas and a final "e" / "and" ("só 0, 1 e □"). The field's name is its `label` when it has one, as for number fields.

In a Stage with a text field, a build that throws or runs past 200 steps ends its line with "Tente outra entrada." / "Try another input." in place of "Tente outros números." / "Try other numbers.". Number-only Stages keep today's lines.

### Print and the page without JavaScript

The Stage names the first example after the input's label, as today, with a text value bare in the code face and `ε` for the empty word: "Aceita w? w = `aabba`", "Calcular h(t, m) t = `olá mundo`, m = 7". No quotation marks: the code face sets the value apart.

### Say it for the ear

Documentation only: the Stage doesn't change how `say` is read. "Say it for the ear" gains a line: a screen reader reads `aabba` as one word, so when the symbols matter, `say` spells them ("lê a, a, b, b, a", "lê o terceiro símbolo, b") and says "a palavra vazia", never "ε".

## Runs and Look

- `pnpm check` runs the build on every example, as today.
- `pnpm look` shoots the first example and prints it as today, with the text value as typed: `first example w = aabba`.

## Failures

A Stage's own rules fail as `build`, under the `artifact` skill's [Build failures](../../.claude/skills/artifact/rules.md#build-failures), with messages shaped like today's example problems:

- An example that breaks a text field's rule: `example 2 gives w "abc", whose c is outside the alphabet`, `example 3 gives w "…", longer than 12`, `… shorter than 1`.
- An example that gives a text field a number, or a number field text.
- An alphabet symbol that isn't one code point after NFC, or a symbol given twice.
- `minLength` above `maxLength`, or a negative one.
- `min` or `max` on a text field, or `alphabet`, `minLength` or `maxLength` on a number field.

`build-input` fails a build whose type gives a text field anything but `string`, or a number field anything but `number`, worded like the existing typed-input messages.

## Documentation

- The `Stage` doc comments (and so `COMPONENTS.md`, via `pnpm components`):
  - **Typed input**: whole numbers or text, the text field's props, NFC and code points, the empty word and `ε`, the refusal line, and print naming.
  - The `input` prop's type and description, `Typed`, `Build` and `defineBuild`.
  - **Say it for the ear**: the spelled-out word line above.
- The `artifact` skill:
  - `.claude/skills/artifact/stage.md`: the text field, the new failure messages and the `build-input` wording.
  - `.claude/skills/artifact/rules.md` › **Custom builds** › "Missing a control or a mark?": the Stage takes `choose`, or typed whole numbers and text (`input`).
- `DESIGN.md` › the Stage's description: text fields in the code face, their width, and their refusal.
- The catalog's Stage page (`design-system/catalog/stage.mdx`) adds a Stage with a word field over an alphabet and an empty-word example, and the refused state of a text field. Catalog work runs through impeccable in a local session.

## Shared parts

- `stage-element.ts` (field reading and refusals), `Stage.astro` (fields, example problems, print naming) and `step-applier.ts` (`numberProblem`, `typedNumber`) reach every Stage with `input`: check that the catalog's and the sample artifact's number Stages still show and refuse exactly as before.
- `stage-build.ts`'s `Typed` reaches every build's types: existing `defineBuild<{ a: number; b: number }>` builds still type-check.

## Out of scope

- Mixing `choose` and `input` in one Stage, as [Stage choice groups](../stage-choice-groups/spec.md) already rules.
- Multi-character symbols in an alphabet, multi-line text, and case-insensitive alphabets.
- Machine definitions for finite automata and Turing machines: each joins by proposal when an artifact needs it, per [Machine trace](../machine-trace/spec.md).
- Renaming `input.examples`, whose word clashes with the glossary's **Example**: on the map's Out of scope.

## Comments

### 2026-11-08: owner decisions at ticketing

Owner, /to-tickets review in the Artifact generation gaps session, 2026-11-08, every recommendation accepted. Each bullet amends this spec or fills a gap in it; the tickets in `issues/` carry the detail.

- **Gaps in Failures** (02, 03): an `input.examples` value that isn't in NFC fails the build; a missing `maxLength`, or one that isn't a whole number of at least 1, fails; a text field given a number reads "example 2 gives `w` 5, which isn't text"; an example with bad symbols names the first offending symbol.
- **The failed-run line** (04): with a text field, a failed run reads "…para esta entrada." / "…for this input." and ends "Tente outra entrada." / "Try another input.".
- **Ordering with Stage choice groups:** 01 waits on Stage choice groups 01, since both prefactors rewrite the same seam. The edge avoids conflicting rewrites; no behaviour depends on it.

### 2026-11-09: owner authorizes the design-system pass

Owner, impeccable-gaps-implementation session, 2026-11-09, the `/implement-spec` request that follows the first implementation pass (thread 3bbd72a3-5eba-484c-95f1-b5d71456b860, which left design-system tickets undone at the owner's choice). This supersedes that deferral for this spec's tickets.

- **Approved:** implementing every unresolved, non-`wontfix` ticket here, design-system work included, through impeccable in a local session (`design-system/CLAUDE.md`); agents decide open implementation questions autonomously without asking, preserving every decision recorded above; and the first pass's and this pass's work are pushed and merged into `main` once the required checks and review pass.
