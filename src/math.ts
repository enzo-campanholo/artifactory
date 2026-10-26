import temml from "temml";

export type RenderedMath = { mathml: string } | { reason: string; position: number | undefined };

// Strict mode rejects what LaTeX itself rejects, including accented letters in math mode, which
// Temml would otherwise split into a letter and a floating accent. Inline MathML never wraps on
// its own, so "tex" lets it break where TeX would, after a top-level relation or operator.
export function renderMath(latex: string, displayMode: boolean): RenderedMath {
  try {
    return {
      mathml: temml.renderToString(latex, {
        displayMode,
        strict: true,
        throwOnError: true,
        wrap: "tex",
      }),
    };
  } catch (error) {
    return failedRender(error);
  }
}

function failedRender(error: unknown): RenderedMath {
  const message = error instanceof Error ? error.message : String(error);
  const reason = /^\s*(?<reason>.*?) at (?:position \d+|end of input):/s.exec(message)?.groups
    ?.reason;
  const position = error instanceof temml.ParseError ? positionOf(error) : undefined;
  return { reason: withHint(reason ?? message.trim()), position };
}

function positionOf(error: object): number | undefined {
  return "position" in error && typeof error.position === "number" ? error.position : undefined;
}

function withHint(reason: string): string {
  return /^(Accented )?Unicode text character/.test(reason)
    ? `${reason}; write words as \\text{…}`
    : reason;
}
