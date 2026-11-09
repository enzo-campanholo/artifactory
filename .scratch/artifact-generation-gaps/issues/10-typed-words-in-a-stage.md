# 10: Typed words in a Stage

Type: grilling
Status: resolved

## Question

How does a Stage take a typed word as input, beside or instead of whole numbers?

## Where it came from

No agent reported this. It came out of [Machine-trace component](04-machine-trace-component.md): the owner plans to trace finite automata and Turing machines, which read a word ("aabba"). The owner calls text input essential. [Stage controls and drawing](03-stage-controls-and-drawing.md) kept `input` as whole numbers in fields, because no report asked for more, and this ticket's answer supersedes that.

Until it resolves, choice groups can offer fixed words. The [Machine trace](../../machine-trace/spec.md) spec doesn't wait on this ticket. Its paper check assumes a word input for automata and Turing machines.

## To decide

- A field kind beside the number fields (`{ name, kind: "word", … }`), or a separate prop?
- What a word field takes: an alphabet or set of allowed symbols, length bounds in place of `min`/`max`, and whether the empty word counts (and how it shows, `ε`).
- The refusal line for a word outside the alphabet or the bounds, and how a refused field shows.
- How the build gets it (`steps` gets `{ [name]: string }`, typed through `defineBuild`), and how `pnpm check` runs the examples.
- How print and the page without JavaScript name the first example's word.
- Whether non-machine builds (a hashing or parsing artifact) need anything more than automata do.

## Answer

Decided with the owner on 2026-11-08 (grilling session, three rounds, every recommendation accepted). The build is specified in [Stage text input](../../stage-text-input/spec.md).

- **A field kind, not a prop.** `{ name, label?, kind: "text", alphabet?, minLength?, maxLength }` sits in `input.fields` beside number fields, and kinds mix in one Stage. A field without `kind` stays a whole number, so existing Stages don't change. `Typed` becomes `Record<string, number | string>`, and builds type each field (`defineBuild<{ w: string; m: number }>`). Named `text`, not `word`, since a hashing or parsing artifact's text isn't a formal-language word. With an alphabet it is one.
- **What it takes:** an optional `alphabet` of one-code-point symbols. Without it, one line of any text. The page normalises to NFC and counts code points, with no trimming or case folding. Tokens are the build's to split. Non-machine builds need nothing more. Rejected: a required alphabet (shuts out free text) and a regular-expression pattern (gives no readable refusal line).
- **Length:** `maxLength` required, `minLength` default 0, not `min`/`max`, which would read as values. An empty field is the empty word, and the Stage writes it `ε` where it names it.
- **Refusal:** the field is drawn dashed, and one line states its whole rule ("Digite até 12 símbolos, só a e b, para w."), without naming the bad symbol, as number fields do. Nothing is truncated. With a text field, a failed run ends "Tente outra entrada." / "Try another input."
- **The field:** the code face, as wide as `maxLength` plus one, its own line when wider than a phone, autocapitalise, autocorrect and spellcheck off.
- **Print and no JavaScript:** "w = `aabba`" in the code face, `ε` when empty, no quotes.
- **Check and look:** new `build` failures for examples that break a field's rule, bad alphabets, `minLength` above `maxLength` and props of the wrong kind; `build-input` fails a text field not typed `string`. Look still shoots the first example.
- **Ear:** "Say it for the ear" gains spelling a word out ("lê a, a, b, b, a") and "a palavra vazia". Documentation only.
- **Supersedes** [Stage controls and drawing](03-stage-controls-and-drawing.md)'s "`input` stays whole numbers" (comment added there).
- **Out of scope:** renaming `input.examples`, which clashes with the glossary's **Example** (on the map's Out of scope). Mixing `choose` and `input`, multi-character symbols and multi-line text.
- No glossary entry: a text field is a prop's shape, not a domain concept. No ADR: cheap to reverse. Consistent with ADR 0001 (typed text resets on reload, like typed numbers) and ADR 0007.
