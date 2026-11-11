import { inPageLanguage, mainLanguage } from "./page-language.ts";
import type { Build, Typed } from "./stage-build.ts";
import { StepRow } from "./step-row.ts";
import {
  colourLabel,
  fieldProblem,
  runBuild,
  stageControl,
  stageFields,
  stageGroups,
  stageNodes,
  writtenContent,
  type Control,
  type Field,
  type Shown,
  type StageNodes,
  type Written,
  typedNumber,
  typedText,
} from "./step-applier.ts";

// Numbers in the step's line take a real minus sign, as the page writes them.
const withMinus = (value: number) => String(value).replace("-", "−");

interface Refused {
  tooMany: (most: number) => string;
  failed: string;
  retry: string;
}

// What a refused run asks the owner to change: the option, the options of several groups, or the
// input, which a Stage with a text field can't call numbers.
type Retry = "option" | "options" | "numbers" | "text";

type TextField = Extract<Field, { kind: "text" }>;

interface Wording {
  type: string;
  upTo: string;
  from: string;
  to: string;
  only: string;
  and: string;
  for: string;
  symbol: [string, string];
  character: [string, string];
}

// A text field's whole rule, never the symbol that broke it. The range keeps together on one line,
// as a refused number's bounds do, and the field's name never stands alone on the last line.
const textRule = (wording: Wording, name: string, field: TextField) => {
  const { alphabet, minLength, maxLength } = field;
  const [one, many] = alphabet === undefined ? wording.character : wording.symbol;
  const most = `${String(maxLength)} ${maxLength === 1 ? one : many}`;
  const length =
    minLength === maxLength
      ? most
      : minLength === 0
        ? `${wording.upTo}\u00a0${most}`
        : `${wording.from}${String(minLength)}\u00a0${wording.to}\u00a0${most}`;
  const last = alphabet?.at(-1);
  const symbols =
    alphabet === undefined || last === undefined
      ? ""
      : alphabet.length === 1
        ? `, ${wording.only} ${last},`
        : `, ${wording.only} ${alphabet.slice(0, -1).join(", ")} ${wording.and} ${last},`;
  return `${wording.type} ${length}${symbols} ${wording.for}\u00a0${name}.`;
};

const texts = {
  en: {
    step: (step: number, count: number) => `Step ${String(step)} of ${String(count)}.`,
    line: (line: number) => `Line ${String(line)}.`,
    fault: (line: number, fault: string) => `Line ${String(line)}: ${fault}.`,
    refused: {
      option: {
        tooMany: (most: number) =>
          `That takes more than ${String(most)} steps. Choose another option.`,
        failed: "The steps for this option couldn't be worked out. Choose another option.",
        retry: "Choose another option.",
      },
      options: {
        tooMany: (most: number) =>
          `That takes more than ${String(most)} steps. Choose other options.`,
        failed: "The steps for these options couldn't be worked out. Choose other options.",
        retry: "Choose other options.",
      },
      numbers: {
        tooMany: (most: number) => `That takes more than ${String(most)} steps. Try other numbers.`,
        failed: "The steps for these numbers couldn't be worked out. Try other numbers.",
        retry: "Try other numbers.",
      },
      text: {
        tooMany: (most: number) => `That takes more than ${String(most)} steps. Try another input.`,
        failed: "The steps for this input couldn't be worked out. Try another input.",
        retry: "Try another input.",
      },
    } satisfies Record<Retry, Refused>,
    refusedNumber: (name: string, min: number, max: number) =>
      `Type a whole number from ${withMinus(min)}\u00a0to\u00a0${withMinus(max)} for ${name}.`,
    refusedText: (name: string, field: TextField) =>
      textRule(
        {
          type: "Type",
          upTo: "up\u00a0to",
          from: "",
          to: "to",
          only: "only",
          and: "and",
          for: "for",
          symbol: ["symbol", "symbols"],
          character: ["character", "characters"],
        },
        name,
        field,
      ),
  },
  pt: {
    step: (step: number, count: number) => `Passo ${String(step)} de ${String(count)}.`,
    line: (line: number) => `Linha ${String(line)}.`,
    fault: (line: number, fault: string) => `Linha ${String(line)}: ${fault}.`,
    refused: {
      option: {
        tooMany: (most: number) => `Isso dá mais de ${String(most)} passos. Escolha outra opção.`,
        failed: "Não foi possível montar os passos desta opção. Escolha outra opção.",
        retry: "Escolha outra opção.",
      },
      options: {
        tooMany: (most: number) => `Isso dá mais de ${String(most)} passos. Escolha outras opções.`,
        failed: "Não foi possível montar os passos destas opções. Escolha outras opções.",
        retry: "Escolha outras opções.",
      },
      numbers: {
        tooMany: (most: number) => `Isso dá mais de ${String(most)} passos. Tente outros números.`,
        failed: "Não foi possível montar os passos para esses números. Tente outros números.",
        retry: "Tente outros números.",
      },
      text: {
        tooMany: (most: number) => `Isso dá mais de ${String(most)} passos. Tente outra entrada.`,
        failed: "Não foi possível montar os passos para esta entrada. Tente outra entrada.",
        retry: "Tente outra entrada.",
      },
    } satisfies Record<Retry, Refused>,
    refusedNumber: (name: string, min: number, max: number) =>
      `Digite um número inteiro de ${withMinus(min)}\u00a0a\u00a0${withMinus(max)} para ${name}.`,
    refusedText: (name: string, field: TextField) =>
      textRule(
        {
          type: "Digite",
          upTo: "até",
          from: "de ",
          to: "a",
          only: "só",
          and: "e",
          for: "para",
          symbol: ["símbolo", "símbolos"],
          character: ["caractere", "caracteres"],
        },
        name,
        field,
      ),
  },
};

// Each Stage's step line gets its own ID once a refused field needs to name it.
let refusals = 0;

// DESIGN.md's 44 px Cell Rule, for a drawn part at the drawing's smallest scale.
const target = 44;

// The shapes a step's colour fills: a coloured part's areas, never its label's plate.
const areas = '.fill-surface:not([data-swatch-plate]), [class*="fill-swatch-"]';
const fading = "data-colour-fading";

// One hatching's `fill` can't transition into another's, so a colour change lays the old fill
// under the new one and fades the new one in over it, as the marks' transitions take 0.2s.
interface Fade {
  under: Element;
  animation: Animation;
}

class ArtifactStage extends HTMLElement {
  #build: Promise<Build<string | Typed> | undefined> = Promise.resolve(undefined);
  #nodes: StageNodes = { parts: [], tables: [], code: [], colours: [] };
  #written: Written = { parts: [], tables: [], code: [], colours: [] };
  #control: Control = "choose";
  #retry: Retry = "option";
  #asWritten = new Map<Element, Node[]>();
  #fades = new Map<Element, Fade>();
  #rowToCopy: Element | undefined;
  #stepRows: Element[] = [];
  #row: StepRow | undefined;
  #steps: Shown[] = [];
  #running = 0;

  constructor() {
    super();
    this.addEventListener("change", (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "radio") {
        this.#runChosen();
      }
    });
    this.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#type();
    });
    this.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const choice = event.target.closest<SVGElement>("[data-choice]")?.dataset.choice;
      if (choice !== undefined) this.#chooseInDrawing(choice);
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
    const { control, takes } = stageControl(this);
    this.#control = control;
    this.#retry =
      takes.shape === "option"
        ? "option"
        : takes.shape === "groups"
          ? "options"
          : takes.values.some(({ kind }) => kind === "text")
            ? "text"
            : "numbers";
    this.#rowToCopy = this.#oneTableRowsAsWritten.at(-1)?.cloneNode(true) as Element | undefined;
    const labels = this.#nodes.parts.flatMap((part) => [...part.querySelectorAll(colourLabel)]);
    const cells = this.#nodes.tables.flatMap(({ rows }) => rows.flat());
    for (const element of [...cells, ...labels]) {
      this.#asWritten.set(
        element,
        [...element.childNodes].map((node) => node.cloneNode(true)),
      );
    }
    this.#row = new StepRow(this, (step) => {
      this.#show(step);
    });
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
    return inPageLanguage(this, texts);
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

  // A checked option with no run behind it, such as one a refusal left, chooses again. Option names
  // are unique across a Stage's groups, so the part chooses in its own group and leaves the others.
  #chooseInDrawing(choice: string) {
    const option = this.#options.find(({ value }) => value === choice);
    if (option === undefined || (option.checked && this.#steps.length > 0)) return;
    option.checked = true;
    this.#runChosen();
  }

  // With several groups the run waits for every group's choice, the prompt holding the line.
  #runChosen() {
    const groups = stageGroups(this);
    if (groups.length === 0) {
      const option = this.#options.find(({ checked }) => checked);
      if (option !== undefined) void this.#run(option.value);
      return;
    }
    const chosen: Typed = {};
    for (const { name, options } of groups) {
      const option = options.find(({ checked }) => checked);
      if (option === undefined) return;
      chosen[name] = option.value;
    }
    void this.#run(chosen);
  }

  // The first field refused takes the focus back, drawn dashed, with the reason in the step's line.
  #type() {
    const typed: Typed = {};
    for (const field of this.#fields) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    }
    for (const definition of stageFields(this)) {
      const field = this.#part(
        `.stage-field input[name="${CSS.escape(definition.name)}"]`,
      ) as HTMLInputElement;
      const value = definition.kind === "text" ? typedText(field.value) : typedNumber(field.value);
      if (fieldProblem(definition, value) !== undefined) {
        const label = definition.label ?? definition.name;
        this.#refuse(
          definition.kind === "text"
            ? this.#texts.refusedText(label, definition)
            : this.#texts.refusedNumber(label, definition.min, definition.max),
        );
        field.setAttribute("aria-invalid", "true");
        const say = this.#part(".stage-say");
        say.id ||= `stage-say-${String(++refusals)}`;
        field.setAttribute("aria-describedby", say.id);
        field.focus();
        return;
      }
      typed[definition.name] = value;
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
        : runBuild(build, this.#control, input, this.#written, mainLanguage(this));
    if ("refused" in run) {
      const refused = this.#texts.refused[this.#retry];
      this.#refuse(
        run.refused === "too-many"
          ? refused.tooMany(run.most)
          : run.refused === "fault"
            ? `${this.#texts.fault(run.line, run.fault[mainLanguage(this)])} ${refused.retry}`
            : refused.failed,
      );
      return;
    }
    this.#steps = run.steps;
    this.dataset.stepped = "";
    this.#row?.setCount(run.steps.length);
  }

  #show(step: number) {
    const shown = this.#steps[step - 1];
    if (shown === undefined) return;
    this.#paint(shown);
    const count = this.#steps.length;
    this.#part(".stage-counter").hidden = false;
    this.#part(".stage-current").textContent = String(step);
    this.#part(".stage-count").textContent = String(count);
    this.#part(".stage-say").textContent = shown.say;
    this.#part(".stage-announcement").textContent = [
      this.#texts.step(step, count),
      shown.running === undefined ? "" : this.#texts.line(shown.running),
      shown.say,
    ]
      .filter(Boolean)
      .join(" ");
  }

  #refuse(why: string) {
    ++this.#running;
    this.#steps = [];
    this.#row?.setCount(0);
    this.#paint(undefined);
    this.#part(".stage-counter").hidden = true;
    this.#part(".stage-say").textContent = why;
    this.#part(".stage-announcement").textContent = why;
  }

  // A cell whose text the step changes keeps its written nodes beside the step's text, so print
  // can show the content as written from CSS alone, even when `beforeprint` never fires.
  #paint(shown: Shown | undefined) {
    this.#nodes.parts.forEach((part, index) => {
      const { name = "", labelled = false } = this.#written.parts[index] ?? {};
      const mark = shown?.parts.get(name);
      if (mark === undefined) part.removeAttribute("data-mark");
      else part.setAttribute("data-mark", mark);
      if (labelled) this.#colour(part, shown?.colours.get(name));
    });
    const lineNumbers = this.#written.code.flat().map(({ line }) => line);
    this.#nodes.code.flat().forEach((line, index) => {
      const mark = shown?.lines.get(lineNumbers[index] ?? 0);
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

  // The part's colour as written stays in its classes and its label's written text for print, so a
  // step's colour is an attribute the screen's styles paint from, and its name a second text.
  #colour(part: Element, colour: number | null | undefined) {
    const before = part.getAttribute("data-colour");
    const after = colour === undefined ? null : colour === null ? "none" : String(colour);
    if (before === after) return;
    const fades = (
      matchMedia("(prefers-reduced-motion: no-preference)").matches
        ? [...part.querySelectorAll(areas)].filter((area) => !area.hasAttribute(fading))
        : []
    ).map((area) => {
      const under = area.cloneNode() as SVGElement;
      under.setAttribute(fading, "");
      under.style.fill = getComputedStyle(area).fill;
      under.style.stroke = "none";
      return { area, under };
    });
    if (after === null) part.removeAttribute("data-colour");
    else part.setAttribute("data-colour", after);
    for (const { area, under } of fades) {
      const earlier = this.#fades.get(area);
      earlier?.animation.cancel();
      earlier?.under.remove();
      area.before(under);
      const animation = area.animate({ fillOpacity: [0, 1] }, { duration: 200 });
      this.#fades.set(area, { under, animation });
      const done = () => {
        under.remove();
        if (this.#fades.get(area)?.under === under) this.#fades.delete(area);
      };
      animation.addEventListener("finish", done);
      animation.addEventListener("cancel", done);
    }
    const name =
      colour === undefined || colour === null ? undefined : this.#written.colours[colour - 1];
    for (const label of part.querySelectorAll(colourLabel)) {
      const asWritten = (this.#asWritten.get(label) ?? []).map((node) => node.cloneNode(true));
      const writtenName = asWritten
        .map((node) => node.textContent)
        .join("")
        .trim();
      if (name === undefined || name === writtenName) {
        label.replaceChildren(...asWritten);
        continue;
      }
      const ns = "http://www.w3.org/2000/svg";
      const written = document.createElementNS(ns, "tspan");
      written.classList.add("stage-as-written");
      written.append(...asWritten);
      const stepText = document.createElementNS(ns, "tspan");
      stepText.classList.add("stage-step-text");
      stepText.textContent = name;
      label.replaceChildren(written, stepText);
    }
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
