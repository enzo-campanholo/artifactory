const tokenOfThemeColour: Record<string, string> = {
  N1: "--color-text",
  N2: "--color-text-muted",
  N3: "--color-text-muted",
  N4: "--color-border",
  N5: "--color-border",
  N6: "--color-surface-subtle",
  N7: "--color-surface",
  B1: "--color-text",
  B2: "--color-text",
  B3: "--color-border",
  B4: "--color-surface-subtle",
  B5: "--color-surface-subtle",
  B6: "--color-surface",
  AA2: "--color-text",
  AA4: "--color-surface-subtle",
  AA5: "--color-surface-subtle",
  AB4: "--color-surface-subtle",
  AB5: "--color-surface-subtle",
};

// D2 paints with one class per theme colour, such as `.fill-N1{fill:#0A0F25;}`, in a stylesheet
// inside the SVG. It draws code in literal colours instead, in a light and a dark theme, and shows
// the light one, which takes the tokens here: ink, with grey comments.
export function paintWithTokens(svg: string): string {
  return svg
    .replace(
      /\.([a-z-]+)-([A-Z]+\d)\{([a-z-]+):#[\dA-Fa-f]+;\}/g,
      (rule, paint: string, colour: string, property: string) => {
        const token = tokenOfThemeColour[colour];
        return token === undefined ? rule : `.${paint}-${colour}{${property}:var(${token});}`;
      },
    )
    .replace(/<g [^>]*class="light-code">[\s\S]*?<\/g><\/g>/g, paintCodeWithTokens);
}

const codeComment = "#57606a";

function paintCodeWithTokens(code: string): string {
  return code
    .replace(/(<rect [^>]*style="fill:)#[\dA-Fa-f]+;/, "$1var(--color-surface);")
    .replaceAll("<text ", '<text style="fill:var(--color-text)" ')
    .replace(/<tspan fill="(#[\dA-Fa-f]+)"/g, (_tspan, colour: string) =>
      colour.toLowerCase() === codeComment
        ? '<tspan style="fill:var(--color-text-muted)"'
        : "<tspan",
    );
}
