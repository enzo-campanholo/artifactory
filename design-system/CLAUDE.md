# design-system

Design-system work runs only in a local session, because it goes through the [impeccable](https://github.com/pbakaus/impeccable) plugin, and plugins don't load in cloud sessions. In a cloud session, tell the owner the change needs a local session.

Before changing a component, token or style, read `PRODUCT.md` and `DESIGN.md`, and work with impeccable. `DESIGN.md` is the visual authority, and `src/tokens.css` carries it. A change to the world updates `DESIGN.md` and `.impeccable/design.json` with it.

Every component and question state has a page in the catalog; [browser-verification.md](../docs/agents/browser-verification.md#catalog) says where. impeccable live's one-time setup asks for `.impeccable/live/config.json`: give it the catalog's layout, `catalog/CatalogLayout.astro`, as the inject target, before `</body>`.
