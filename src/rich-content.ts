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
              hastPlugins: [tableScrollers, shownLineNumbers],
            }),
            shikiConfig: { theme: "css-variables" },
          },
          vite: { plugins: [diagrams(root, report)] },
        });
      },
    },
  };
}

// A fence's `start=N` in its info string, after the language: the number its first line shows.
const startInInfo = /(?<=^|\s)start(?:=(\S*))?(?=\s|$)/;

function fenceStart(info: string): { written: string; first: number | undefined } | undefined {
  const found = startInInfo.exec(info);
  if (found === null) return undefined;
  const value = found[1] ?? "";
  const first = /^(?:0|[1-9]\d*)$/.test(value) ? Number(value) : undefined;
  return {
    written: found[0],
    first: first !== undefined && Number.isSafeInteger(first) ? first : undefined,
  };
}

declare module "satteri" {
  interface DataMap {
    // Each fence's code and the number its first line shows, in the document's order.
    fenceStarts: { code: string; first: number }[];
  }
}

// Each code line carries the number the page shows for it, which the design system's gutter,
// Stepper and Stage all read. Satteri hands Shiki no info string once raw HTML is on, as math
// needs, so a Shiki transformer can't see `start`: the code visitor keeps each fence's start in
// the document's data, and this plugin, which runs after highlighting, finds a block's by its code.
const shownLineNumbers = defineHastPlugin({
  name: "artifactory-shown-line-numbers",
  element: {
    filter: ["pre"],
    visit(pre, ctx) {
      const code = pre.children.find(
        (child) => child.type === "element" && child.tagName === "code",
      );
      if (code === undefined) return;
      const fences = ctx.data.fenceStarts ?? [];
      const text = ctx.textContent(code);
      const index = fences.findIndex((fence) => fence.code === text);
      const [fence] = index === -1 ? [] : fences.splice(index, 1);
      let shown = fence?.first ?? 1;
      for (const line of code.type === "element" ? code.children : []) {
        if (line.type !== "element" || !String(line.properties.class).split(" ").includes("line"))
          continue;
        ctx.setProperty(line, "data-line", String(shown));
        shown += 1;
      }
    },
  },
});

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
      const { lang, meta, position } = node;
      const start = fenceStart(meta ?? "");
      (ctx.data.fenceStarts ??= []).push({ code: node.value, first: start?.first ?? 1 });
      if (!position) return;
      const fenceLine = ctx.source.slice(position.start.offset).split("\n", 1)[0] ?? "";
      const atFence = (ruleId: string, written: string, from: number, message: string) => {
        report({
          file: fileOf(ctx),
          line: position.start.line,
          column: position.start.column + Math.max(0, fenceLine.indexOf(written, from)),
          ruleId,
          message,
          skillSection: "Code blocks",
        });
      };
      if (lang != null && !Object.hasOwn(bundledLanguages, lang) && !isSpecialLang(lang)) {
        atFence("code-language", lang, 0, `\`${lang}\` is not a code language Shiki knows`);
      }
      if (start !== undefined && start.first === undefined) {
        atFence(
          "code-start",
          start.written,
          fenceLine.indexOf(meta ?? ""),
          `\`${start.written}\` must give the number of the block's first line, a whole number from 0, such as \`start=0\``,
        );
      }
    },
  });
}
