# 01: Keep the MEPA memory table's pointer on one line

Status: needs-triage
Blocked by: None (can start immediately)

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**Problem:** at 393 px, a MEPA Stage's English memory table wraps the `← s` marker onto a second line. The table has five columns, and the `Offset` header is wider than pt-BR's `Desl.`, so the narrow `Top` column has no room left. pt-BR's `Topo` fits. The cause is the Stage's table layout, which every Stage shares, not MEPA itself. It was first seen while closing machine trace 06 (`9f466c2`) and again on 08, and was left for a design-system session.

**What to build:** keep each memory-table cell's marker on one line at phone width in both languages, without horizontal overflow.

- [ ] On `/catalog/mepa/` at 393 px, in English and pt-BR, `← s` stays on one line in every step, including a call's record with negative offsets.
- [ ] Every Stage on `/catalog/stage/` still fits at 393 px and at 1280 px.
- [ ] Checked in light, dark and print.
