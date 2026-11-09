# The design system holds machines

Stages that trace an abstract machine, such as the stack machine MEPA, a register machine or a Turing machine, run that machine's definition from the design system rather than from a custom build. A definition is the machine's instruction semantics, its state, how that state shows on the Stage's tables, code and drawing, and how each step is said in pt-BR and English. A subject-neutral machine trace runs it, and an artifact gives only its program (in the Stage's content), the owner's input and per-program notes. Three builds had already copied and extended the same MEPA simulator, more MEPA artifacts are coming, and other machines are planned, so a definition copied into each artifact would keep drifting.

This is subject content in the design system. It goes against `PRODUCT.md`'s "work across subjects rather than being tailored to one", which still holds for components, and against ADR 0007's picture of a custom build as behaviour only one artifact needs. ADR 0007's second-need rule now ends in a component **or a machine**. A new machine joins by the same owner-confirmed proposal, when an artifact needs it.

We rejected:

- **"Not yet", with each artifact keeping its copy.** The second-need rule had fired three times, and the copies are the instruction semantics themselves, the part a bug fix has to reach everywhere.
- **A general machine-trace component with each machine's semantics left in builds.** It removes only the presentation, about a quarter of each copy. The copying the agents reported would go on.
- **A component that replaces the Stage for machines.** It would need its own controls, print, screen-reader text and check, all of which the Stage already has.
- **Artifacts of one subject importing each other's builds.** It breaks ADR 0007's "imports nothing but the design system" and couples artifacts across renames, deletes and public or private moves.

## Consequences

- Machine definitions are public, since the design system lives in the upstream repo. They name a machine, never an artifact.
- Each machine has a catalog page, and its tables as written are documented in `COMPONENTS.md`, so artifact agents still never read `DESIGN.md` or the definition.
- The Stage hands every build its content as written, so a program is written once.
