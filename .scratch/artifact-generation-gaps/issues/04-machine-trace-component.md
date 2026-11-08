# 04: Machine-trace component

Type: grilling
Blocked by: 02, 03

## Question

Should the stack-machine simulator move into the design system as a component, and what would its interface be?

## What the agents reported

Three custom builds now simulate the same stack machine (a P-code machine with `i`, `s`, a display `D` and memory `M`): one in a base artifact and two in a follow-up artifact on subroutine calls. Each build is copied and extended from the base one. ADR 0007 says to propose a design-system component at the second need. The follow-up's brief said to copy the build, which overrode the proposal, so the two new builds carry a header comment saying a machine-trace component is due.

## To decide

- Promote it now, or answer "not yet" (and record that in the builds, as ADR 0007 says)?
- Is the component specific to this machine, or a general "machine trace": a program, registers and memory cells with roles, stepped from typed input?
- What it needs from [Code display](02-code-display.md) (addresses from 0, the current instruction marked) and [Stage controls and drawing](03-stage-controls-and-drawing.md).
