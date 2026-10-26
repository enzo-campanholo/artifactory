# Plain CSS on custom properties, not Tailwind

The design system's styles are plain CSS on custom properties, using cascade layers, nesting, container queries and styles scoped to each component. There is no Tailwind, Sass or CSS-in-JS.

Agents write Tailwind fluently, which makes this look like the wrong call. But Tailwind has no switch to turn off arbitrary values like `bg-[#bada55]`, so any agent can quietly step outside the tokens. Its utility classes also spread the styling API through every artifact's markup. The design system exists to keep many agent-built artifacts looking like one family, so the less styling surface agents can misuse, the better. With Tailwind v4 the tokens would be custom properties anyway, so dropping it costs no token mechanism.
