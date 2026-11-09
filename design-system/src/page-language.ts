import type { Content } from "./stage-build.ts";

// A component's own lines follow the nearest `lang`, and a Stage hands its build the same language.
export function mainLanguage(element: Element): Content["lang"] {
  const lang = element.closest("[lang]")?.getAttribute("lang") ?? "en";
  return lang.startsWith("pt") ? "pt-BR" : "en";
}

export function inPageLanguage<Text>(element: Element, texts: { en: Text; pt: Text }): Text {
  return mainLanguage(element) === "pt-BR" ? texts.pt : texts.en;
}
