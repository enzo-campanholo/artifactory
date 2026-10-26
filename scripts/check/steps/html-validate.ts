import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { HtmlValidate, Parser, type Message } from "html-validate";
import { readEntry } from "../../../src/artifacts.ts";
import type { Failure } from "../../../src/check-failure.ts";
import { locate } from "../../../src/source-locator.ts";
import type { Step } from "../step.ts";

const htmlValidate = new HtmlValidate({
  extends: ["html-validate:recommended", "html-validate:document"],
  rules: {
    // Every script and stylesheet is the site's own, served from the same origin.
    "require-sri": ["error", { target: "crossorigin" }],
    // Shiki colours code with inline styles. Artifacts can't add their own: the artifact checks
    // reject a `style` attribute.
    "no-inline-style": "off",
    // A question's fieldset is named by its prompt through `aria-labelledby`, because a prompt can
    // hold paragraphs, which a legend can't.
    "wcag/h71": "off",
  },
});

const artifactPage = /<html\b[^>]*\sdata-artifact-id=/;

export const htmlValidation: Step = {
  name: "html-validate",
  async run(root) {
    const dist = join(root, "dist");
    const pages = (await readdir(dist, { recursive: true }))
      .filter((file) => file.endsWith(".html"))
      .sort();
    const failures: Failure[] = [];
    for (const page of pages) {
      const html = await readFile(join(dist, page), "utf8");
      const { results } = await htmlValidate.validateString(html, page);
      const messages = results.flatMap((result) => result.messages);
      if (messages.length === 0) continue;
      failures.push(
        ...(artifactPage.test(html)
          ? await artifactFailures(root, page, html, messages)
          : messages.map((message) => platformFailure(page, message))),
      );
    }
    return failures;
  },
};

function platformFailure(page: string, { line, column, ruleId, message }: Message): Failure {
  return {
    file: `dist/${page}`,
    line,
    column,
    ruleId: `html-validate/${ruleId}`,
    message,
    skillSection: "Platform changes",
  };
}

async function artifactFailures(
  root: string,
  page: string,
  html: string,
  messages: Message[],
): Promise<Failure[]> {
  const { file, source } = await readEntry(root, dirname(page));
  const config = await htmlValidate.getConfigFor(page);
  const document = new Parser(config).parseHtml({
    data: html,
    filename: page,
    line: 1,
    column: 1,
    offset: 0,
  });
  return messages.map(({ selector, ruleId, message }) => {
    const element = selector === null ? null : document.querySelector(selector);
    const { position } = locate(source, {
      kind: "element",
      text: element?.textContent ?? "",
      attribute: (name) => {
        const value = element?.getAttribute(name)?.value;
        return typeof value === "string" ? value : undefined;
      },
    });
    return {
      file,
      ...position,
      ruleId: `html-validate/${ruleId}`,
      message,
      skillSection: "HTML",
    };
  });
}
