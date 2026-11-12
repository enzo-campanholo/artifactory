import { inPageLanguage, mainLanguage } from "./page-language.ts";
import type { Build } from "./stage-build.ts";
import { StageOnPage, type Field, type Retry, type RunInput, type Shown } from "./stage-on-page.ts";
import { StepRow } from "./step-row.ts";

// Numbers in the step's line take a real minus sign, as the page writes them.
const withMinus = (value: number) => String(value).replace("-", "−");

interface Refused {
  tooMany: (most: number) => string;
  failed: string;
  retry: string;
}

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
  #build: Promise<Build<RunInput> | undefined> = Promise.resolve(undefined);
  #page: StageOnPage | undefined;
  #fades = new Map<Element, Fade>();
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
      this.#runTyped();
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
        import(/* @vite-ignore */ module) as Promise<{ default: Build<RunInput> }>
      ).then(
        (loaded) => loaded.default,
        () => undefined,
      );
    }
    const page = new StageOnPage(this, (part, recolour) => {
      this.#fade(part, recolour);
    });
    this.#page = page;
    this.#row = new StepRow(this, (step) => {
      this.#show(step);
    });
    page.open();
    this.#linkParts(page);
  }

  // `pnpm look` and the catalog find what to press through the Stage's module, not its classes.
  get onPage(): StageOnPage | undefined {
    return this.#page;
  }

  get #texts() {
    return inPageLanguage(this, texts);
  }

  // A drawn part named like an option chooses it too, for the pointer. The options stay the way
  // in for the keyboard and screen readers, so the drawing adds no tab stop.
  #linkParts(page: StageOnPage) {
    const svg = page.drawing;
    if (svg === null) return;
    // InlineSvg lets the drawing shrink to `--min-drawing-width`, its smallest scale.
    const smallest = Number.parseFloat(svg.style.getPropertyValue("--min-drawing-width"));
    const units = target / (Math.min(1, smallest / svg.viewBox.baseVal.width) || 1);
    for (const option of page.options) {
      for (const part of page.partsNamed(option.value)) {
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
    const option = this.#page?.options.find(({ value }) => value === choice);
    if (option === undefined || (option.checked && this.#steps.length > 0)) return;
    option.checked = true;
    this.#runChosen();
  }

  #runChosen() {
    const chosen = this.#page?.chosen();
    if (chosen !== undefined) void this.#run(chosen);
  }

  // The first field refused takes the focus back, drawn dashed, with the reason in the step's line.
  #runTyped() {
    const typed = this.#page?.typed();
    if (typed === undefined) return;
    if ("input" in typed) {
      void this.#run(typed.input);
      return;
    }
    const { refused, field } = typed;
    const label = field.label ?? field.name;
    this.#refuse(
      field.kind === "text"
        ? this.#texts.refusedText(label, field)
        : this.#texts.refusedNumber(label, field.min, field.max),
      refused,
    );
    refused.focus();
  }

  async #run(input: RunInput) {
    const running = ++this.#running;
    const build = await this.#build;
    if (running !== this.#running) return;
    const run =
      build === undefined || this.#page === undefined
        ? { refused: "no-steps" as const }
        : this.#page.run(build, input);
    if ("refused" in run) {
      const refused = this.#texts.refused[this.#page?.retry ?? "option"];
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
    this.#row?.showFirstOf(run.steps.length);
  }

  #show(step: number) {
    const shown = this.#steps[step - 1];
    if (shown === undefined) return;
    const count = this.#steps.length;
    this.#page?.show(
      shown,
      step,
      count,
      [
        this.#row?.said(step),
        shown.running === undefined ? "" : this.#texts.line(shown.running),
        shown.say,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  #refuse(why: string, field?: HTMLInputElement) {
    ++this.#running;
    this.#steps = [];
    this.#row?.showFirstOf(0);
    this.#page?.refuse(why, field);
  }

  #fade(part: Element, recolour: () => void) {
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
    recolour();
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
  }
}

customElements.define("artifact-stage", ArtifactStage);
