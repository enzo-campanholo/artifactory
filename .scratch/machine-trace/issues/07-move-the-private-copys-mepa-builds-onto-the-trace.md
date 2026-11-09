# 07: Move the private copy's MEPA builds onto the trace

Status: ready-for-agent
Blocked by: 06

**What to build:** the three MEPA builds in the owner's private copy (one in a base artifact, two in a follow-up on subroutine calls) become `trace(mepa, …)` builds of a few lines each, with their programs written once, in their Stages' fences. The work happens in the private copy, after the Sync upstream workflow has brought tickets 01 to 06 in; claim, comment on and close this ticket here, upstream. Being public, this ticket and its closing comment name no private artifact ([Machine trace](../spec.md) › Moving the private copy's builds).

- [ ] Each of the three builds is `trace(mepa, notes)`, with its notes (`reads`, `labels`, `subroutines`, `roles`, `after`) carrying what the copies changed besides the program, and imports only the design system.
- [ ] Each fence takes `start=0` and drops its typed-in addresses; each Stage's tables take MEPA's headers (the base artifact's `Conteúdo` column becomes `Dado`).
- [ ] The header comments saying a machine-trace component is due are gone.
- [ ] Each page shows the same steps as before, compared with `pnpm look` shots taken before and after; where a sentence changes, the change comes from the shared narration, and the closing comment lists those changes without naming the artifacts.
- [ ] `pnpm check` passes in the private copy.
