# Domain docs

This repo has one context: `GLOSSARY.md` and `docs/adr/`, both at the root.

## Before exploring

Read `GLOSSARY.md`, and every ADR in `docs/adr/` that touches the area you're about to work in.

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a refactor proposal, a hypothesis, a test name), use the term `GLOSSARY.md` defines, never one it lists under _Avoid_.

A concept the glossary lacks is a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

When your output contradicts an ADR, say so explicitly, naming it:

> _Contradicts ADR 0007 (artifacts contain content, data and behaviour inside a stage), but worth reopening because…_
