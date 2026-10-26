# Figure pitfalls

Generic pitfalls of hand-written SVG figures. `COMPONENTS.md` lists the colour classes and the stepper's `data-step` grammar. When a figure mistake recurs, add a line here.

- **Root:** `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H">`, with a `viewBox` and no `width` or `height`. The figure is drawn at most `W` CSS pixels wide and shrinks to fit narrower screens, down to two thirds of `W`; narrower than that, it scrolls sideways. Without a `viewBox` the build fails, unless the root has a numeric `width` and `height` to make one from.
- **Size for a phone.** A 393 px screen leaves about 350 px for the figure, so a `viewBox` wider than that shrinks everything, text included, and one wider than about 530 scrolls sideways. Keep `W` near 320–480 and `font-size` at 12 or more, and check the 393 px screenshot from `pnpm look`.
- **Black on white.** The page has no colour: `fill-accent` and `stroke-accent` draw in the text colour and `fill-tint` in a light grey. Tell parts apart by fill, stroke and dashes (`stroke-dasharray`), not by hue.
- **Colours by role.** `text`, `muted` and `accent` are ink: use them for lines and labels. `tint`, `surface` and `border` are too faint to read on the page: use them for fills and gridlines, never for text or a line that carries meaning, unless it sits on an ink fill.
- **Square corners.** The page draws nothing rounded, so `rx` and `ry` on a `<rect>` are dropped.
- **Fill is on by default.** Shapes without a fill class are filled with the text colour. Give an outline `fill="none"` and a `stroke-` class.
- **Text:** set `font-size` and `text-anchor` on each `<text>`; the font is the page's heading face, Archivo. Leave room for the text: it's measured in the browser, so a label that fits your guess can overflow at runtime.
- **Unique IDs:** IDs inside the file (`<marker id>`, `<linearGradient id>`) land in the page beside every other figure. Prefix them with the file's name, `id="celula-seta"`, so two figures never share one.
- **Arrowheads:** a `<marker>` with a `<path class="fill-text">`, referenced with `marker-end="url(#celula-seta)"`.
- **No links:** the drawing is one image to a screen reader, so a link inside it can't be announced, and the check fails `<a>`. Put the link in the paragraph.
- **Self-contained:** draw everything in the file. An `<image>` or `<use>` pointing at another file or URL breaks once the figure is inlined in the page.
- **Stepped figures:** give each element that appears in only some steps a `data-step`. Elements without one show in every step, so draw the parts that never change without it. A printed figure stepper shows only its last step, so make the last step the complete drawing.
