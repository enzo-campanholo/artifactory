import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { checkTimeout } from "../check/fixture-repo.ts";
import {
  announcement,
  button,
  counted,
  openBuiltPage,
  press,
  radio,
  saying,
  textField,
  textOf,
  type BuiltPage,
} from "./built-page.ts";
import { stageFiles, stageSlug } from "./stage-fixture.ts";

let page: BuiltPage | undefined;

// Each Stage's said line, found by its prompt before any run.
const saidLines = new Map<string, Element>();

beforeAll(async () => {
  page = await openBuiltPage(stageFiles, stageSlug);
  for (const [label, prompt] of [
    ["Começar em", "Escolha um vértice para começar."],
    ["Sair de", "Escolha de onde sair e um sentido."],
    ["Contar até n", "Digite um número e uma palavra e comece."],
  ] as const) {
    saidLines.set(label, saying(stageLabelled(label), prompt));
  }
}, checkTimeout);

afterAll(async () => {
  await page?.close();
});

function saidLine(label: string): Element {
  const line = saidLines.get(label);
  if (line === undefined) throw new Error(`no said line for "${label}"`);
  return line;
}

function stageLabelled(label: string): HTMLElement {
  const stage = [...document.querySelectorAll<HTMLElement>("artifact-stage")].find((found) =>
    [...found.querySelectorAll("legend")].some((legend) => textOf(legend) === label),
  );
  if (stage === undefined) throw new Error(`no Stage labelled "${label}"`);
  return stage;
}

function part(stage: Element, name: string): Element {
  const found = stage.querySelector(`[data-part="${name}"]`);
  if (found === null) throw new Error(`no drawn part ${name}`);
  return found;
}

function marks(stage: Element, names: string[]): Record<string, string | null> {
  return Object.fromEntries(
    names.map((name) => [name, part(stage, name).getAttribute("data-mark")]),
  );
}

// A cell a step rewrites keeps its text as written beside the step's, for print, and only the page's
// CSS, which happy-dom doesn't apply, hides it on screen. So a rewritten cell is checked to contain
// the step's text, and a cell back as written to hold exactly its own.
function cell(stage: Element, row: string, column: string): Element {
  const table = stage.querySelector("table");
  const columns = [...(table?.querySelectorAll("thead th") ?? [])].map((header) => textOf(header));
  const at = columns.indexOf(column);
  const found = [...(table?.querySelectorAll("tbody tr") ?? [])].find(
    (tr) => tr.firstElementChild !== null && textOf(tr.firstElementChild) === row,
  )?.children[at];
  if (found === undefined) throw new Error(`no cell at ${row}, ${column}`);
  return found;
}

function codeLine(stage: Element, text: string): Element {
  const found = [...stage.querySelectorAll("pre *")].find((line) => textOf(line) === text);
  if (found === undefined) throw new Error(`no code line "${text}"`);
  return found;
}

// A choice whose run doesn't start, or a refusal, ends without a step to wait for.
const settled = () => new Promise((resolve) => setTimeout(resolve, 100));

describe("a Stage with one choice", () => {
  const prompt = "Escolha um vértice para começar.";
  let stage: HTMLElement;
  let said: Element;

  beforeAll(() => {
    stage = stageLabelled("Começar em");
    said = saidLine("Começar em");
  });

  test("shows the prompt and counts no step before a choice", () => {
    expect(textOf(said)).toBe(prompt);
    expect(counted(stage)).toBe("");
    expect(textOf(announcement(stage))).toBe("");
    expect(marks(stage, ["A", "B", "C"])).toEqual({ A: null, B: null, C: null });
  });

  test("shows each step's marks, rewritten cells and said line", async () => {
    radio(stage, "A").click();
    await vi.waitFor(() => {
      expect(counted(stage)).toBe("1 de 3");
    });
    expect(textOf(said)).toBe("Começa em A, com chave 0.");
    expect(textOf(announcement(stage))).toBe("Passo 1 de 3. Começa em A, com chave 0.");
    expect(marks(stage, ["A", "B", "C", "A-B", "B-C", "A-C"])).toEqual({
      A: "reversed",
      B: null,
      C: null,
      "A-B": null,
      "B-C": null,
      "A-C": null,
    });
    expect(textOf(cell(stage, "A", "Chave"))).toContain("0");
    expect(cell(stage, "A", "Chave").getAttribute("data-mark")).toBe("strong");

    button(stage, "Próximo passo").click();
    expect(counted(stage)).toBe("2 de 3");
    expect(textOf(said)).toBe("B entra pela aresta A-B, de peso 1.");
    expect(marks(stage, ["A", "B", "C", "A-B", "B-C", "A-C"])).toEqual({
      A: "strong",
      B: "reversed",
      C: null,
      "A-B": "strong",
      "B-C": null,
      "A-C": "dashed",
    });
    expect(textOf(cell(stage, "B", "Chave"))).toContain("1");
    expect(cell(stage, "B", "Chave").getAttribute("data-mark")).toBe("strong");
    expect(textOf(cell(stage, "B", "Pai"))).toContain("A");
    expect(cell(stage, "B", "Vértice").getAttribute("data-mark")).toBe("reversed");
    expect(cell(stage, "A", "Chave").getAttribute("data-mark")).toBeNull();

    button(stage, "Próximo passo").click();
    expect(counted(stage)).toBe("3 de 3");
    expect(textOf(said)).toBe("C entra pela aresta B-C, de peso 2.");
    expect(marks(stage, ["A", "B", "C", "A-B", "B-C", "A-C"])).toEqual({
      A: "strong",
      B: "strong",
      C: "reversed",
      "A-B": "strong",
      "B-C": "strong",
      "A-C": "muted",
    });
    expect(textOf(cell(stage, "C", "Chave"))).toContain("2");
    expect(textOf(cell(stage, "C", "Pai"))).toContain("B");
    expect(cell(stage, "B", "Vértice").getAttribute("data-mark")).toBeNull();

    button(stage, "Passo anterior").click();
    button(stage, "Passo anterior").click();
    expect(counted(stage)).toBe("1 de 3");
    expect(textOf(cell(stage, "B", "Chave"))).toBe("∞");
    expect(textOf(cell(stage, "B", "Pai"))).toBe("—");
    expect(textOf(cell(stage, "C", "Pai"))).toBe("—");
  });

  test("a drawn part named like an option chooses it", async () => {
    part(stage, "C").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(textOf(said)).toBe("Começa em C, com chave 0.");
    });
    expect(radio(stage, "C").checked).toBe(true);
    expect(counted(stage)).toBe("1 de 3");
    expect(marks(stage, ["A", "B", "C"])).toEqual({ A: null, B: null, C: "reversed" });
  });
});

describe("the step row on a Stage", () => {
  let stage: HTMLElement;
  let back: HTMLButtonElement;
  let forward: HTMLButtonElement;

  beforeAll(async () => {
    stage = stageLabelled("Começar em");
    back = button(stage, "Passo anterior");
    forward = button(stage, "Próximo passo");
    radio(stage, "B").click();
    await vi.waitFor(() => {
      expect(textOf(announcement(stage))).toBe("Passo 1 de 3. Começa em B, com chave 0.");
    });
  });

  test("its buttons are usable once the element is connected", () => {
    expect([back.disabled, forward.disabled]).toEqual([false, false]);
  });

  test("moves a step with the buttons and the arrow keys, and refuses past either end", () => {
    expect(counted(stage)).toBe("1 de 3");
    expect(back.getAttribute("aria-disabled")).toBe("true");
    expect(forward.getAttribute("aria-disabled")).toBe("false");

    back.click();
    press(back, "ArrowLeft");
    expect(counted(stage)).toBe("1 de 3");

    forward.click();
    expect(counted(stage)).toBe("2 de 3");
    expect(textOf(announcement(stage))).toBe("Passo 2 de 3. A entra pela aresta A-B, de peso 1.");
    expect(back.getAttribute("aria-disabled")).toBe("false");

    press(forward, "ArrowRight");
    expect(counted(stage)).toBe("3 de 3");
    expect(forward.getAttribute("aria-disabled")).toBe("true");

    forward.click();
    press(forward, "ArrowRight");
    expect(counted(stage)).toBe("3 de 3");
    expect(textOf(announcement(stage))).toBe("Passo 3 de 3. C entra pela aresta B-C, de peso 2.");

    press(forward, "ArrowLeft");
    expect(counted(stage)).toBe("2 de 3");
    back.click();
    expect(counted(stage)).toBe("1 de 3");
    expect(back.getAttribute("aria-disabled")).toBe("true");
    expect(forward.getAttribute("aria-disabled")).toBe("false");
  });
});

describe("a Stage with two choice groups", () => {
  const prompt = "Escolha de onde sair e um sentido.";
  let stage: HTMLElement;
  let said: Element;

  beforeAll(() => {
    stage = stageLabelled("Sair de");
    said = saidLine("Sair de");
  });

  test("starts the run only once every group has a choice", async () => {
    radio(stage, "P").click();
    await settled();
    expect(textOf(said)).toBe(prompt);
    expect(counted(stage)).toBe("");

    radio(stage, "volta").click();
    await vi.waitFor(() => {
      expect(counted(stage)).toBe("1 de 2");
    });
    expect(textOf(said)).toBe("Sai de P, na volta.");
    expect(textOf(cell(stage, "início", "Escolha"))).toContain("P");
  });

  test("runs again from step 1 when either group changes", async () => {
    button(stage, "Próximo passo").click();
    expect(textOf(said)).toBe("Chega ao fim da volta.");

    radio(stage, "Q").click();
    await vi.waitFor(() => {
      expect(textOf(said)).toBe("Sai de Q, na volta.");
    });
    expect(counted(stage)).toBe("1 de 2");

    button(stage, "Próximo passo").click();
    radio(stage, "ida").click();
    await vi.waitFor(() => {
      expect(textOf(said)).toBe("Sai de Q, na ida.");
    });
    expect(counted(stage)).toBe("1 de 2");
    expect(textOf(cell(stage, "início", "Escolha"))).toContain("Q");
  });
});

describe("a Stage with typed input", () => {
  let stage: HTMLElement;
  let said: Element;
  let n: HTMLInputElement;
  let w: HTMLInputElement;

  beforeAll(() => {
    stage = stageLabelled("Contar até n");
    said = saidLine("Contar até n");
    n = textField(stage, "n");
    w = textField(stage, "w");
  });

  test("runs its first example, marking the line each step runs", async () => {
    expect([n.value, w.value]).toEqual(["2", "ab"]);
    button(stage, "Começar").click();
    await vi.waitFor(() => {
      expect(counted(stage)).toBe("1 de 3");
    });
    expect(textOf(announcement(stage))).toBe("Passo 1 de 3. Linha 2. Volta 1, lendo ab.");
    expect(codeLine(stage, "repete n vezes").getAttribute("data-mark")).toBe("reversed");
    expect(textOf(cell(stage, "contado", "Valor"))).toContain("1");

    button(stage, "Próximo passo").click();
    button(stage, "Próximo passo").click();
    expect(textOf(announcement(stage))).toBe("Passo 3 de 3. Linha 3. Devolve 2.");
    expect(codeLine(stage, "repete n vezes").getAttribute("data-mark")).toBeNull();
    expect(codeLine(stage, "devolve n").getAttribute("data-mark")).toBe("reversed");
    expect(textOf(cell(stage, "contado", "Valor"))).toBe("2");
    expect(cell(stage, "contado", "Variável").getAttribute("data-mark")).toBe("reversed");
  });

  test("refuses a number that breaks its field's rule at that field", () => {
    n.value = "0";
    button(stage, "Começar").click();
    const refusal = "Digite um número inteiro de 1 a 300 para n.";
    expect(textOf(said)).toBe(refusal);
    expect(textOf(announcement(stage))).toBe(refusal);
    expect(n.getAttribute("aria-invalid")).toBe("true");
    expect(w.hasAttribute("aria-invalid")).toBe(false);
    expect(document.activeElement).toBe(n);
    expect(counted(stage)).toBe("");
  });

  test("refuses text that breaks its field's rule at that field", () => {
    n.value = "2";
    w.value = "abz";
    button(stage, "Começar").click();
    expect(textOf(said)).toBe("Digite até 4 símbolos, só a e b, para w.");
    expect(w.getAttribute("aria-invalid")).toBe("true");
    expect(n.hasAttribute("aria-invalid")).toBe(false);
    expect(document.activeElement).toBe(w);
  });
});

describe("a refused run", () => {
  test("says the refusal and counts no step", async () => {
    const stage = stageLabelled("Contar até n");
    const said = saidLine("Contar até n");
    textField(stage, "n").value = "250";
    textField(stage, "w").value = "ab";
    button(stage, "Começar").click();
    const refusal = "Isso dá mais de 200 passos. Tente outra entrada.";
    await vi.waitFor(() => {
      expect(textOf(said)).toBe(refusal);
    });
    await settled();
    expect(textOf(announcement(stage))).toBe(refusal);
    expect(counted(stage)).toBe("");
    expect(textField(stage, "n").hasAttribute("aria-invalid")).toBe(false);
    expect(codeLine(stage, "repete n vezes").getAttribute("data-mark")).toBeNull();
    expect(button(stage, "Próximo passo").getAttribute("aria-disabled")).toBe("true");
    expect(button(stage, "Passo anterior").getAttribute("aria-disabled")).toBe("true");
  });
});

describe("a Stage whose steps colour parts", () => {
  let stage: HTMLElement;

  beforeAll(() => {
    stage = stageLabelled("Colorir a partir de");
  });

  function colours(): Record<string, [string | null, string]> {
    return Object.fromEntries(
      ["X", "Y"].map((name) => {
        const label = part(stage, name).querySelector("text[data-swatch]");
        return [name, [part(stage, name).getAttribute("data-colour"), label?.textContent ?? ""]];
      }),
    );
  }

  test("gives each part its swatch and its colour's name at each step", async () => {
    expect(colours()).toEqual({ X: [null, ""], Y: [null, ""] });
    radio(stage, "X").click();
    await vi.waitFor(() => {
      expect(counted(stage)).toBe("1 de 2");
    });
    expect(colours()).toEqual({ X: ["1", "R"], Y: [null, ""] });

    button(stage, "Próximo passo").click();
    expect(textOf(announcement(stage))).toBe(
      "Passo 2 de 2. Y fica com G, pois a aresta o liga a X.",
    );
    expect(colours()).toEqual({ X: ["1", "R"], Y: ["2", "G"] });

    button(stage, "Passo anterior").click();
    expect(colours()).toEqual({ X: ["1", "R"], Y: [null, ""] });

    part(stage, "Y").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(colours()).toEqual({ X: [null, ""], Y: ["1", "R"] });
    });
  });
});
