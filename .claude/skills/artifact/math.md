# Math pitfalls

Generic pitfalls of LaTeX in Temml's strict mode, which renders every `$…$` and `$$…$$`. When a math mistake recurs, add a line here.

- **Words in math:** `\text{…}`, always, and required for accented letters: `$\text{área} = \pi r^2$`, `\begin{cases} 1 & \text{se } x > 0 \end{cases}`.
- **Typographic characters fail in math mode.** Write `'` for a prime, never `’`, and `-` for minus, never `–` or `—`.
- **Decimal comma:** `3{,}14`. A bare `3,14` reads as a list and gets a space after the comma.
- **Portuguese function names:** `\operatorname{sen} x` for the sine, since `\sen` doesn't exist. `\tg` is built in.
- **Display-only environments:** `align`, `equation`, `gather` and `\tag` work only in `$$…$$`. Inline, use `aligned`.
- **Units:** siunitx (`\SI`, `\si`, `\unit`) isn't there. Write `25\,^\circ\mathrm{C}`, `3\,\mathrm{m/s}`, `5\,\mu\text{m}`, `10\,\Omega`.
- **Chemistry:** mhchem works: `$\ce{H2O + CO2 -> H2CO3}$`, `$\ce{A <=> B}$`, `$\ce{Na+}$`, `$\ce{^{14}_{6}C}$`, and `$\pu{25 mol/L}$` for quantities.
- **Differentials:** an upright d, `\mathrm{d}x`, with a thin space before it: `\int f(x) \, \mathrm{d}x`.
- **Colour:** leave `\color` and `\textcolor` out. Math takes the page's text colour, which follows dark mode.
- **No macros:** `\newcommand` fails on names Temml already has (`\R`), and a macro defined in one formula doesn't reach the next. Write the command out each time.
- **No links:** `\href` fails. Put the link in the prose around the math.
- **Percent:** `50\%`. A bare `%` starts a LaTeX comment, and the formula fails.
- **Long inline formulas:** inline math breaks only after a top-level relation or operator (`=`, `<`, `+`, `-`). A group such as `\left( … \right)`, a fraction or a root never breaks, so a long one runs past a phone's screen. Keep inline formulas short, and put a long one in `$$…$$` in the prose. A `SingleChoice` option can't hold display math, so keep its formulas shortest of all.
