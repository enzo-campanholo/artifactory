import type { AstroIntegration } from "astro";

export function catalog(): AstroIntegration {
  return {
    name: "catalog",
    hooks: {
      "astro:config:setup": ({ injectRoute }) => {
        injectRoute({
          pattern: "/catalog",
          entrypoint: new URL("pages/index.astro", import.meta.url),
        });
        injectRoute({
          pattern: "/catalog/short",
          entrypoint: new URL("pages/short.astro", import.meta.url),
        });
        injectRoute({
          pattern: "/catalog/many-questions",
          entrypoint: new URL("pages/many-questions.astro", import.meta.url),
        });
        injectRoute({
          pattern: "/catalog/stage",
          entrypoint: new URL("pages/stage.astro", import.meta.url),
        });
        injectRoute({
          pattern: "/catalog/eye",
          entrypoint: new URL("pages/eye.astro", import.meta.url),
        });
        injectRoute({
          pattern: "/catalog/visitor",
          entrypoint: new URL("pages/visitor.astro", import.meta.url),
        });
        injectRoute({
          pattern: "/catalog/public-signed-out",
          entrypoint: new URL("pages/public-signed-out.astro", import.meta.url),
        });
        injectRoute({
          pattern: "/catalog/[state]",
          entrypoint: new URL("pages/[state].astro", import.meta.url),
        });
      },
    },
  };
}
