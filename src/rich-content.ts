import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { satteri } from "@astrojs/markdown-satteri";
import type { AstroIntegration } from "astro";
import { defineHastPlugin, defineMdastPlugin, type MdastVisitorContext, type Point } from "satteri";
import { bundledLanguages, isSpecialLang } from "shiki";
import { buildFailures } from "./build-failures.ts";
import { positionAt, type Report } from "./check-failure.ts";
import { diagrams } from "./diagrams.ts";
import { renderMath } from "./math.ts";

export function richContent(): AstroIntegration {
  return {
    name: "rich-content",
    hooks: {
      "astro:config:setup": ({ config, logger, updateConfig }) => {
        const root = fileURLToPath(config.root);
        const { report } = buildFailures(root, logger);
        updateConfig({
          markdown: {
            processor: satteri({
              features: { math: true, rawHtml: true },
              mdastPlugins: [mathAndCode(root, report)],
              hastPlugins: [tableScrollers],
            }),
            shikiConfig: { theme: "css-variables" },
          },
          vite: { plugins: [diagrams(root, report)] },
        });
      },
    },
  };
}

// A named group gives the scroller's tab stop a name without adding every table to the page's
// landmarks, as a region would.
const tableScrollers = defineHastPlugin({
  name: "artifactory-table-scrollers",
  element: {
    filter: ["table"],
    visit(table, ctx) {
      ctx.wrapNode(table, {
        type: "element",
        tagName: "div",
        properties: {
          className: ["table-scroller"],
          tabIndex: 0,
          role: "group",
          ariaLabel: ctx.data.astro?.frontmatter.lang === "pt-BR" ? "Tabela" : "Table",
        },
        children: [],
      });
    },
  },
});

function mathAndCode(root: string, report: Report) {
  const fileOf = (ctx: MdastVisitorContext) =>
    ctx.fileURL === undefined ? "" : relative(root, fileURLToPath(ctx.fileURL));

  function renderMathNode(
    latex: string,
    displayMode: boolean,
    start: Point,
    ctx: MdastVisitorContext,
  ) {
    const rendered = renderMath(latex, displayMode);
    if ("mathml" in rendered) {
      const value = displayMode
        ? `<div class="equation">${rendered.mathml}</div>`
        : rendered.mathml;
      return { type: "html" as const, value };
    }
    const latexOffset = ctx.source.indexOf(latex, start.offset);
    const at =
      latexOffset === -1 || rendered.position === undefined
        ? start
        : positionAt(ctx.source, latexOffset + rendered.position);
    report({
      file: fileOf(ctx),
      line: at.line,
      column: at.column,
      ruleId: "math",
      message: `Temml can't render this math: ${rendered.reason}`,
      skillSection: "Math",
    });
    return undefined;
  }

  return defineMdastPlugin({
    name: "artifactory-math-and-code",
    options: { position: true },
    inlineMath: (node, ctx) =>
      node.position && renderMathNode(node.value, false, node.position.start, ctx),
    math: (node, ctx) =>
      node.position && renderMathNode(node.value, true, node.position.start, ctx),
    code(node, ctx) {
      const { lang, position } = node;
      if (lang == null || Object.hasOwn(bundledLanguages, lang) || isSpecialLang(lang) || !position)
        return;
      const fenceLine = ctx.source.slice(position.start.offset).split("\n", 1)[0] ?? "";
      report({
        file: fileOf(ctx),
        line: position.start.line,
        column: position.start.column + Math.max(0, fenceLine.indexOf(lang)),
        ruleId: "code-language",
        message: `\`${lang}\` is not a code language Shiki knows`,
        skillSection: "Code blocks",
      });
    },
  });
}
