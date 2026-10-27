# design-system

Design system work runs only in a local session, because it goes through the [impeccable](https://github.com/pbakaus/impeccable) plugin, and plugins don't load in cloud sessions. In a cloud session, tell the owner the change needs a local session.

Before changing a component, token or style, read `PRODUCT.md` and `DESIGN.md`, and work with impeccable. `DESIGN.md` is the visual authority, and `src/tokens.css` carries it. A change to the world updates `DESIGN.md` and `.impeccable/design.json` with it.

- **Public API:** the `exports` in `package.json`. Every `.astro` export except a layout is a component artifacts can import.
- **Catalog:** its pages are in `catalog/`, and `pnpm dev` at the repo root serves it at `/catalog/`. Every page renders inside the artifact page's frame (`src/ArtifactFrame.astro`), as an artifact does. Each question state has its own page, `/catalog/<state>/`, one per key of `catalogStates` in `catalog/states.ts`; `/catalog/short/` and `/catalog/many-questions/` show the frame's ranges; and `?lang=pt-BR` shows the Portuguese labels. Check a component change on its catalog page, and give a new component or state its place in the catalog.
- **impeccable live:** its one-time setup asks for `.impeccable/live/config.json`, with the catalog's layout, `catalog/CatalogLayout.astro`, as the inject target, before `</body>`.
