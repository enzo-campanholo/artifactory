import { getContainerRenderer } from "@astrojs/mdx/container-renderer";
import { experimental_AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { afterAll } from "vitest";
import { builtinEnvironments } from "vitest/runtime";

// Vite transforms a test file under a DOM environment for the client, where Astro won't render, so
// a file that renders runs in node and gets the happy-dom page here. Import this module before any
// design system element, which needs the page's globals to load.
const page = await builtinEnvironments["happy-dom"].setup(globalThis, {});
afterAll(() => page.teardown(globalThis));

const container = await experimental_AstroContainer.create({
  renderers: await loadRenderers([getContainerRenderer()]),
});

type Fixture = Parameters<typeof container.renderToString>[0];

// The page's own scripts load the elements, which the test file imports instead.
export async function mountQuestion(fixture: Fixture): Promise<void> {
  const template = document.createElement("template");
  template.innerHTML = (await container.renderToString(fixture)).replaceAll(
    /<script\b[\s\S]*?<\/script>/g,
    "",
  );
  // Through a template, so each element connects with its children already in place.
  document.body.replaceChildren(template.content);
}
