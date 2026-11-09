# 01: One rule per Stage field, shared by the page and the check

Status: ready-for-agent
Blocked by: [Stage choice groups 01](../../stage-choice-groups/issues/01-name-the-stage-s-control-instead-of-inferring-it.md)

Spec: [Stage text input](../spec.md). A prefactor: make the change easy, then make the easy change.

**What to build:** nothing changes for the owner or for an agent writing a Stage. Today a typed-input field's rule is assumed to be a whole number in three places that each rebuild it their own way. The Stage checks its `input.examples` with the shared number rule. The page rebuilds each field's bounds from separate attributes on its input before it refuses what the owner typed. `build-input` writes `number` beside every field name it finds on the built page to get the type it expects. Gather these so that each field's definition, with its name, its label and its rule, sits on the built page once. The page's refusal and the Stage's example check then go through one field rule, and `build-input` takes each field's expected type from that definition instead of assuming `number`. Ticket 02 then adds the text kind in one place, not three.

The edge to Stage choice groups 01 exists only because both prefactors rewrite the same seam, how the Stage, the page and the check read a build's input, so their rewrites don't conflict; nothing here depends on its behaviour.

- [ ] Every existing test passes unchanged, and no test is added or moved. This is a behaviour-neutral refactor, so the seams already cover it.
- [ ] The built page still holds each number field with the same name, label and first-example value. It also still holds the same line naming the first example ("Calcular mdc(a, b) a = 48, b = 18").
- [ ] `build-input`'s messages and the Stage's example failures are unchanged word for word.
- [ ] On the catalog's Stage page, "Typed input", "Refusing a number", "Code, mid-run" and "A table that grows" show, run and refuse exactly as before. That means the same step line, the dashed field, focus taken back and the line's description, in English and with `?lang=pt-BR`. The sample artifact's two typed Stages (`rsa-from-scratch`) run as before too.
- [ ] Nothing visible changes, so `DESIGN.md` is untouched. If the `input` prop's type is reworded, `pnpm components` leaves `COMPONENTS.md` as it was, or changes it only where the prop's type is printed.
- [ ] The change stays inside the Stage: none of `CODING_STANDARDS.md`'s shared parts change. It reaches every Stage with `input`, which the catalog and sample checks above cover.
- [ ] Runs in a local session, as `design-system/CLAUDE.md` asks for any component change, though no visual change goes through impeccable here.
