# Artifacts contain content, data and behaviour inside a stage

An artifact is prose, design system components and data files. It may add one more thing: a custom build, which is TypeScript behaviour for an interactive part that only this artifact needs, running inside a design system stage. The stage supplies the look, the controls, the caption and the quality floor. The custom build starts from ordinary MDX content written inside the stage, in any medium: prose, lists, tables, math, code or a hand-written SVG. Its behaviour can do three things: switch the marks the design system styles, change text and numbers, and add or remove elements of the kinds the content already uses. An artifact holds no CSS, no `<style>`, no colours in code and no local `.astro` components. It imports nothing but the design system, so it uses no npm libraries, no `fetch` and no storage. When a second artifact needs what an existing custom build does, its agent proposes moving it into the design system as a component. That move is a change outside `artifacts/`, so it needs the owner's confirmation.

We rejected three alternatives:

- **Content and data only, with every interaction as a component.** This was this ADR's first version. It blocks anything that has to compute in the browser, such as walking through an algorithm from a vertex the owner picks. Adding a component for each one fills the design system with one-off widgets.
- **One-off local components styled with tokens.** These are flexible, but each artifact would drift towards its own look. Every artifact agent would also have to learn the visual rules (`DESIGN.md`), and the quality floor (accessibility, dark mode, print) would depend on each agent remembering it. Behaviour doesn't carry those risks; styling does, so only behaviour is let in.
- **Temporary local components that must be moved into the design system later.** Nothing forces the move. A proposal at the second need is the point where one is forced, and the owner can still answer "not yet".

## Consequences

- The family look and the quality floor still come from the design system alone. Artifact agents still read only the component reference and the `artifact` skill, never `DESIGN.md`. If a custom build can't be written well from the stage's reference, the stage is missing something.
- A custom build never takes answers or holds artifact state (ADR 0001). Its own state, such as the start vertex or the current step, resets on reload. Anything that asks the owner something and records the answer is a question component.
- A custom build can't render math or highlight code in the browser, because those render only at build time. A build that needs them writes every variant into its content and reveals them in turn.
- Every control the owner operates belongs to the stage. Which controls exist is designed from real custom builds, and a new one joins the design system by the same proposal as a component.
- A stage is one part of an artifact, inside the normal artifact layout, never a page of its own.
- Custom builds are published like the rest of an artifact, without the owner reviewing the code. The pre-publish check and the stage's contract are what keep them in bounds.
- When the owner answers "not yet" to a proposal, that answer goes at the top of both custom builds' code, so the next agent sees it and proposes again with more cases.
