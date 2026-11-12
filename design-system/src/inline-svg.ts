import { brokenRule, type RuledComponent } from "./component-rules.ts";

// `InlineSvg` draws a Figure's, a Stepper's or a Stage's drawing, and each of them reads it here
// before rendering, so a drawing that breaks these rules is reported at the component holding it.
// A Stage names itself in the message, and a Figure or a Stepper names both, as they share it.
export function drawingParts(
  svg: string,
  drawnBy: RuledComponent | readonly RuledComponent[] = ["Figure", "Stepper"],
): {
  ownAttributes: Record<string, string>;
  drawing: string;
  viewBox: string;
} {
  const root = /<svg\b([^>]*)>([\s\S]*)<\/svg>/.exec(svg);
  if (root === null) {
    throw brokenRule(drawnBy, "the imported SVG file has no <svg> root element");
  }
  const [, attributeText = "", drawing = ""] = root;

  // The component sets the SVG's role and accessible name, so the file's own give way.
  const ownAttributes = Object.fromEntries(
    [...attributeText.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      .map(([, name = "", doubleQuoted, singleQuoted]): [string, string] => [
        name,
        doubleQuoted ?? singleQuoted ?? "",
      ])
      .filter(([name]) => name !== "role" && !name.startsWith("aria-")),
  );

  const viewBox = ownAttributes.viewBox ?? viewBoxOfSize(ownAttributes.width, ownAttributes.height);
  if (viewBox === undefined) {
    throw brokenRule(
      drawnBy,
      'the imported SVG file has no viewBox; give its <svg> root `viewBox="0 0 W H"`',
    );
  }
  return { ownAttributes, drawing, viewBox };
}

function viewBoxOfSize(width = "", height = ""): string | undefined {
  const pixels = /^(\d+(?:\.\d+)?)(?:px)?$/;
  const [, w] = pixels.exec(width.trim()) ?? [];
  const [, h] = pixels.exec(height.trim()) ?? [];
  return w === undefined || h === undefined ? undefined : `0 0 ${w} ${h}`;
}
