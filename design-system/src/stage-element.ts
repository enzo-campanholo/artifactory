import type { Build, Typed } from "./stage-build.ts";
import {
  numberProblem,
  runBuild,
  stageNodes,
  writtenContent,
  type Shown,
  type StageNodes,
  type Written,
  typedNumber,
} from "./step-applier.ts";

// Numbers in the step's line take a real minus sign, as the page writes them.
const withMinus = (value: number) => String(value).replace("-", "−");

const texts = {
  en: {
    step: (step: number, count: number) => `Step ${String(step)} of ${String(count)}.`,
    line: (line: number) => `Line ${String(line)}.`,
    tooMany: (most: number) => `That takes more than ${String(most)} steps. Choose another option.`,
    failed: "The steps for this option couldn't be worked out. Choose another option.",
    typedTooMany: (most: number) =>
      `That takes more than ${String(most)} steps. Try other numbers.`,
    typedFailed: "The steps for these numbers couldn't be worked out. Try other numbers.",
    refusedNumber: (name: string, min: number, max: number) =>
      `Type a whole number from ${withMinus(min)}\u00a0to\u00a0${withMinus(max)} for ${name}.`,
  },
  pt: {
    step: (step: number, count: number) => `Passo ${String(step)} de ${String(count)}.`,
    line: (line: number) => `Linha ${String(line)}.`,
    tooMany: (most: number) => `Isso dá mais de ${String(most)} passos. Escolha outra opção.`,
    failed: "Não foi possível montar os passos desta opção. Escolha outra opção.",
    typedTooMany: (most: number) => `Isso dá mais de ${String(most)} passos. Tente outros números.`,
    typedFailed: "Não foi possível montar os passos para esses números. Tente outros números.",
    refusedNumber: (name: string, min: number, max: number) =>
      `Digite um número inteiro de ${withMinus(min)}\u00a0a\u00a0${withMinus(max)} para ${name}.`,
  },
};

// Each Stage's step line gets its own ID once a refused field needs to name it.
let refusals = 0;

// DESIGN.md's 44 px Cell Rule, for a drawn part at the drawing's smallest scale.
const target = 44;

class ArtifactStage extends HTMLElement {
  #build: Promise<Build<string | Typed> | undefined> = Promise.resolve(undefined);
  #nodes: StageNodes = { parts: [], tables: [], code: [] };
  #written: Written = { parts: [], tables: [], codeLineCounts: [] };
  #asWritten = new Map<Element, Node[]>();
  #rowToCopy: Element | undefined;
  #stepRows: Element[] = [];
  #steps: Shown[] = [];
  #step = 0;
  #running = 0;

  constructor() {
    super();
    this.addEventListener("change", (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "radio") {
        void this.#run(event.target.value);
      }
    });
    this.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#type();
    });
    this.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (button === this.#part(".stage-back")) this.#go(-1);
      if (button === this.#part(".stage-forward")) this.#go(1);
      const choice = event.target.closest<SVGElement>("[data-choice]")?.dataset.choice;
      if (choice !== undefined) this.#chooseInDrawing(choice);
    });
    this.addEventListener("keydown", (event) => {
      if (!(event.target instanceof HTMLButtonElement)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      this.#go(event.key === "ArrowLeft" ? -1 : 1);
    });
  }

  connectedCallback() {
    const module = this.dataset.module;
    if (module !== undefined) {
      this.#build = (
        import(/* @vite-ignore */ module) as Promise<{ default: Build<string | Typed> }>
      ).then(
        (loaded) => loaded.default,
        () => undefined,
      );
    }
    this.#nodes = stageNodes(this);
    this.#written = writtenContent(this.#nodes);
    this.#rowToCopy = this.#oneTableRowsAsWritten.at(-1)?.cloneNode(true) as Element | undefined;
    for (const cells of this.#nodes.tables.flatMap(({ rows }) => rows)) {
      for (const cell of cells) {
        this.#asWritten.set(
          cell,
          [...cell.childNodes].map((node) => node.cloneNode(true)),
        );
      }
    }
    for (const button of this.querySelectorAll(".step-controls button")) {
      button.removeAttribute("disabled");
      button.setAttribute("aria-disabled", "true");
    }
    // Firefox restores a checked option after a reload, but not the run it chose, and
    // `autocomplete` isn't valid on a radio.
    for (const option of this.#options) option.checked = false;
    for (const field of this.#fields) {
      field.value = field.defaultValue;
      field.removeAttribute("aria-invalid");
    }
    this.#part(".stage-controls").hidden = false;
    this.#linkParts();
  }

  get #options(): HTMLInputElement[] {
    return [...this.querySelectorAll<HTMLInputElement>(".stage-option input")];
  }

  get #fields(): HTMLInputElement[] {
    return [...this.querySelectorAll<HTMLInputElement>(".stage-field input")];
  }

  get #oneTableRowsAsWritten(): Element[] {
    return (this.#nodes.tables[0]?.rows ?? []).flatMap(([cell]) => cell?.parentElement ?? []);
  }

  get #texts() {
    const lang = this.closest("[lang]")?.getAttribute("lang") ?? "en";
    return lang.startsWith("pt") ? texts.pt : texts.en;
  }

  #part(selector: string): HTMLElement {
    const part = this.querySelector<HTMLElement>(selector);
    if (part === null) throw new Error(`artifact-stage has no ${selector}`);
    return part;
  }

  // A drawn part named like an option chooses it too, for the pointer. The options stay the way
  // in for the keyboard and screen readers, so the drawing adds no tab stop.
  #linkParts() {
    const svg = this.querySelector<SVGSVGElement>(".stage-figure svg");
    if (svg === null) return;
    // InlineSvg lets the drawing shrink to `--min-drawing-width`, its smallest scale.
    const smallest = Number.parseFloat(svg.style.getPropertyValue("--min-drawing-width"));
    const units = target / (Math.min(1, smallest / svg.viewBox.baseVal.width) || 1);
    for (const option of this.#options) {
      for (const part of svg.querySelectorAll<SVGGraphicsElement>(
        `[data-part="${CSS.escape(option.value)}"]`,
      )) {
        const box = part.getBBox();
        const width = Math.max(box.width, units);
        const height = Math.max(box.height, units);
        const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        hit.setAttribute("x", String(box.x + (box.width - width) / 2));
        hit.setAttribute("y", String(box.y + (box.height - height) / 2));
        hit.setAttribute("width", String(width));
        hit.setAttribute("height", String(height));
        hit.setAttribute("fill", "transparent");
        part.dataset.choice = option.value;
        // A group holds its hit area behind its shapes; a lone shape gets it just behind itself.
        if (part instanceof SVGGElement) part.prepend(hit);
        else {
          hit.dataset.choice = option.value;
          part.before(hit);
        }
      }
    }
  }

  // A checked option with no run behind it, such as one a refusal left, chooses again.
  #chooseInDrawing(choice: string) {
    const option = this.#options.find(({ value }) => value === choice);
    if (option === undefined || (option.checked && this.#steps.length > 0)) return;
    option.checked = true;
    void this.#run(choice);
  }

  // The first field refused takes the focus back, drawn dashed, with the reason in the step's line.
  #type() {
    const typed: Typed = {};
    for (const field of this.#fields) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    }
    for (const field of this.#fields) {
      const bounds = {
        name: field.name,
        min: Number(field.dataset.min),
        max: Number(field.dataset.max),
      };
      const value = typedNumber(field.value);
      if (numberProblem(bounds, value) !== undefined) {
        const name = field.labels?.[0]?.querySelector("span")?.textContent ?? field.name;
        this.#refuse(this.#texts.refusedNumber(name, bounds.min, bounds.max));
        field.setAttribute("aria-invalid", "true");
        const say = this.#part(".stage-say");
        say.id ||= `stage-say-${String(++refusals)}`;
        field.setAttribute("aria-describedby", say.id);
        field.focus();
        return;
      }
      typed[field.name] = value;
    }
    void this.#run(typed);
  }

  async #run(input: string | Typed) {
    const running = ++this.#running;
    const build = await this.#build;
    if (running !== this.#running) return;
    const run =
      build === undefined
        ? { refused: "no-steps" as const }
        : runBuild(build, input, this.#written);
    if ("refused" in run) {
      const typed = typeof input !== "string";
      this.#refuse(
        run.refused === "too-many"
          ? (typed ? this.#texts.typedTooMany : this.#texts.tooMany)(run.most)
          : typed
            ? this.#texts.typedFailed
            : this.#texts.failed,
      );
      return;
    }
    this.#steps = run.steps;
    this.#step = 1;
    this.dataset.stepped = "";
    this.#show();
  }

  #go(by: number) {
    const step = Math.min(Math.max(this.#step + by, 1), this.#steps.length);
    if (this.#steps.length === 0 || step === this.#step) return;
    this.#step = step;
    this.#show();
  }

  #show() {
    const shown = this.#steps[this.#step - 1];
    if (shown === undefined) return;
    this.#paint(shown);
    const count = this.#steps.length;
    this.#part(".stage-counter").hidden = false;
    this.#part(".stage-current").textContent = String(this.#step);
    this.#part(".stage-count").textContent = String(count);
    this.#part(".stage-say").textContent = shown.say;
    this.#part(".stage-announcement").textContent = [
      this.#texts.step(this.#step, count),
      shown.running === undefined ? "" : this.#texts.line(shown.running),
      shown.say,
    ]
      .filter(Boolean)
      .join(" ");
    this.#part(".stage-back").setAttribute("aria-disabled", String(this.#step === 1));
    this.#part(".stage-forward").setAttribute("aria-disabled", String(this.#step === count));
  }

  #refuse(why: string) {
    ++this.#running;
    this.#steps = [];
    this.#step = 0;
    this.#paint(undefined);
    this.#part(".stage-counter").hidden = true;
    this.#part(".stage-say").textContent = why;
    this.#part(".stage-announcement").textContent = why;
    this.#part(".stage-back").setAttribute("aria-disabled", "true");
    this.#part(".stage-forward").setAttribute("aria-disabled", "true");
  }

  // A cell whose text the step changes keeps its written nodes beside the step's text, so print
  // can show the content as written from CSS alone, even when `beforeprint` never fires.
  #paint(shown: Shown | undefined) {
    this.#nodes.parts.forEach((part, index) => {
      const mark = shown?.parts.get(this.#written.parts[index]?.name ?? "");
      if (mark === undefined) part.removeAttribute("data-mark");
      else part.setAttribute("data-mark", mark);
    });
    this.#nodes.code.flat().forEach((line, index) => {
      const mark = shown?.lines.get(index + 1);
      if (mark === undefined) line.removeAttribute("data-mark");
      else line.setAttribute("data-mark", mark);
    });
    const rowsFromBody = shown?.rowsFromBody === true;
    this.#nodes.tables.forEach(({ rows }, table) => {
      rows.forEach((cells, row) => {
        cells.forEach((cell, column) => {
          const written = this.#written.tables[table]?.rows[row]?.[column] ?? "";
          const { text, mark } = (rowsFromBody
            ? undefined
            : shown?.tables[table]?.[row]?.[column]) ?? {
            text: written,
            mark: undefined,
          };
          const stepText = cell.querySelector(":scope > .stage-step-text");
          if (text !== written && stepText !== null) stepText.textContent = text;
          else if (text !== written) {
            const asWritten = document.createElement("span");
            asWritten.className = "stage-as-written";
            asWritten.append(...[...cell.childNodes]);
            const replaced = document.createElement("span");
            replaced.className = "stage-step-text";
            replaced.textContent = text;
            cell.replaceChildren(asWritten, replaced);
          } else if (stepText !== null) {
            cell.replaceChildren(
              ...(this.#asWritten.get(cell) ?? []).map((node) => node.cloneNode(true)),
            );
          }
          if (mark === undefined) cell.removeAttribute("data-mark");
          else cell.setAttribute("data-mark", mark);
        });
      });
    });
    this.#rewrite(rowsFromBody ? shown.tables[0] : undefined);
  }

  // The rows as written stay in the table for print, hidden on screen, and each of the step's rows
  // copies the last of them, so it keeps the table's alignment and look.
  #rewrite(rows: Shown["tables"][number] | undefined) {
    for (const row of this.#stepRows) row.remove();
    this.#stepRows = [];
    const written = this.#oneTableRowsAsWritten;
    for (const row of written) row.classList.toggle("stage-as-written", rows !== undefined);
    const rowToCopy = this.#rowToCopy;
    if (rows === undefined || rowToCopy === undefined) return;
    this.#stepRows = rows.map((cells) => {
      const row = rowToCopy.cloneNode(true) as Element;
      row.classList.add("stage-step-row");
      [...row.children].forEach((cell, column) => {
        const mark = cells[column]?.mark;
        cell.textContent = cells[column]?.text ?? "";
        if (mark !== undefined) cell.setAttribute("data-mark", mark);
      });
      return row;
    });
    written.at(-1)?.after(...this.#stepRows);
  }
}

customElements.define("artifact-stage", ArtifactStage);
