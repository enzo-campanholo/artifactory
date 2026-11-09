// @vitest-environment happy-dom
import "@artifactory/design-system/numeric-question-element";
import type { NumericKey } from "@artifactory/design-system/scoring";
import type { MemoryTransport } from "@artifactory/design-system/state";
import { afterEach, expect, test, vi } from "vitest";
import { isDisabled } from "./minimal-question.ts";
import { checked, openPage, savedAttempts, seededTransport } from "./seeded-page.ts";

const gravity: NumericKey = { value: "9.81", tolerance: 0.01 };

function mountNumericQuestion(lang: "en" | "pt-BR", key: NumericKey, unit = "", explanation = "") {
  const template = document.createElement("template");
  const unitPart =
    unit === "" ? "" : `<span class="numeric-question-unit" id="q-gravity--unit">${unit}</span>`;
  template.innerHTML = `
    <div lang="${lang}">
      <artifact-numeric id="q-gravity" class="question" data-question-id="gravity" data-question-kind="numeric" inert="">
        <form>
          <fieldset aria-describedby="q-gravity--prompt">
            <div class="question-prompt" id="q-gravity--prompt"><p>How fast does a dropped stone speed up?</p></div>
            <div class="numeric-question-answer">
              <label for="q-gravity--field">Your answer</label>
              <div class="numeric-question-field">
                <input id="q-gravity--field" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" maxlength="100" required${unit === "" ? "" : ' aria-describedby="q-gravity--unit"'}>
                ${unitPart}
              </div>
            </div>
            <div class="question-actions">
              <button type="submit" class="question-check" aria-disabled="true">Check</button>
            </div>
          </fieldset>
          ${explanation === "" ? "" : `<div class="question-explanation" hidden><p>${explanation}</p></div>`}
          <p class="question-status" role="status" tabindex="-1"></p>
          <div class="question-recovery" hidden></div>
        </form>
      </artifact-numeric>
    </div>`;
  template.content
    .querySelector("artifact-numeric")
    ?.setAttribute("data-question-key", JSON.stringify(key));
  document.body.replaceChildren(template.content);
  const question = document.querySelector<HTMLElement>("artifact-numeric");
  const field = document.querySelector("input");
  const check = document.querySelector("button");
  if (question === null || field === null || check === null) throw new Error("not mounted");
  return { question, field, check };
}

async function loadedNumericQuestion(
  transport: MemoryTransport,
  {
    lang = "en",
    key = gravity,
    unit = "m/s²",
    explanation = "",
  }: { lang?: "en" | "pt-BR"; key?: NumericKey; unit?: string; explanation?: string } = {},
) {
  const store = openPage(transport, [{ id: "gravity", kind: "numeric", key }]);
  const mounted = mountNumericQuestion(lang, key, unit, explanation);
  await checked(store);
  return { ...mounted, store };
}

function type(field: HTMLInputElement, text: string) {
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("a number saves once with the check's mark and locks showing the text as typed", async () => {
  const transport = seededTransport();
  const { question, field, check } = await loadedNumericQuestion(transport);
  type(field, "9,80");

  check.click();

  expect(isDisabled(field)).toBe(true);
  expect(question.dataset.mark).toBe("right");
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });
  check.click();
  expect(field.value).toBe("9,80");
  const [attempt] = await savedAttempts(transport);
  expect(attempt?.answers).toMatchObject([
    { questionId: "gravity", response: "9,80", mark: "right" },
  ]);
});

test.each([
  ["en", "abc", "Write one number, like 2.5, −3/4 or 6.02e23."],
  ["pt-BR", "1.000,5", "Escreva um número, como 2,5; −3/4 ou 6,02e23."],
  ["en", "2,500", "2,500 could be thousands or a decimal: write 2500 or 2,5000."],
  ["pt-BR", "−1.000e3", "−1.000e3 pode ser milhar ou decimal: escreva −1000e3 ou −1.0000e3."],
] as const)(
  "on a page in %s, checking %s refuses it with a message, saves nothing and stays open",
  async (lang, typed, message) => {
    const transport = seededTransport();
    const { question, field, check } = await loadedNumericQuestion(transport, { lang });
    type(field, typed);

    check.click();

    expect(field.validationMessage).toBe(message);
    expect(field.value).toBe(typed);
    expect(isDisabled(field)).toBe(false);
    expect(question.dataset.status).toBeUndefined();
    expect(await savedAttempts(transport)).toEqual([]);
  },
);

test("a refused input's message clears on the next input, and a number then saves", async () => {
  const transport = seededTransport();
  const { question, field, check } = await loadedNumericQuestion(transport);
  type(field, "π");
  check.click();

  type(field, "3,14");

  expect(field.validationMessage).toBe("");
  check.click();
  expect(question.dataset.mark).toBe("wrong");
});

test("checking an empty field asks for a number in the page's language", async () => {
  const transport = seededTransport();
  const { field, check } = await loadedNumericQuestion(transport, { lang: "pt-BR" });

  check.click();

  expect(field.validationMessage).toBe("Escreva um número primeiro.");
  expect(await savedAttempts(transport)).toEqual([]);
});

function answered(response: string, mark: "right" | "wrong") {
  return seededTransport([
    {
      id: "first-attempt",
      startedAt: "2026-10-01T10:00:00.000Z",
      answers: [{ questionId: "gravity", response, mark, answeredAt: "2026-10-01T10:00:00.000Z" }],
    },
  ]);
}

// What a screen reader reads after the field's name.
function description(field: HTMLInputElement): string[] {
  return (field.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? `no element #${id}`);
}

test.each([
  [{ value: "9.81", tolerance: 0.01 }, "m/s²", "9,81 ± 0,01 m/s²", "9.81 ± 0.01 m/s²"],
  [{ value: "3/4" }, "", "3/4", "3/4"],
  [{ value: "6.02e23" }, "mol⁻¹", "6,02 × 10²³ mol⁻¹", "6.02 × 10²³ mol⁻¹"],
  [{ value: "-1.6E-19" }, "C", "−1,6 × 10⁻¹⁹ C", "−1.6 × 10⁻¹⁹ C"],
  [{ value: "+9.81" }, "m/s²", "9,81 m/s²", "9.81 m/s²"],
  [{ value: "1e+05" }, "Pa", "1 × 10⁵ Pa", "1 × 10⁵ Pa"],
  [{ value: "-0.5", tolerance: 0.05 }, "", "−0,5 ± 0,05", "−0.5 ± 0.05"],
  [{ value: "9.81", relativeTolerance: 0.01 }, "m/s²", "9,81 m/s² ± 1 %", "9.81 m/s² ± 1 %"],
  [{ value: "200", relativeTolerance: 0.075 }, "N", "200 N ± 7,5 %", "200 N ± 7.5 %"],
  [{ value: "9.81" }, "m/s²", "9,81 m/s²", "9.81 m/s²"],
  [{ value: "9.81", tolerance: 0 }, "m/s²", "9,81 m/s²", "9.81 m/s²"],
] satisfies [NumericKey, string, string, string][])(
  "a saved wrong answer to %j shows the right answer in the page's convention",
  async (key, unit, inPortuguese, inEnglish) => {
    const unitDescription = unit === "" ? [] : [unit];
    for (const [lang, line] of [
      ["pt-BR", `Resposta certa: ${inPortuguese}`],
      ["en", `Right answer: ${inEnglish}`],
    ] as const) {
      const { question, field } = await loadedNumericQuestion(answered("12", "wrong"), {
        lang,
        key,
        unit,
      });

      expect(question.dataset.mark).toBe("wrong");
      expect(field.value).toBe("12");
      expect(description(field)).toEqual([...unitDescription, line]);
    }
  },
);

test("a right answer shows no right answer", async () => {
  const { question, field } = await loadedNumericQuestion(answered("9.81", "right"));

  expect(question.dataset.mark).toBe("right");
  expect(description(field)).toEqual(["m/s²"]);
  expect(document.body.textContent).not.toContain("Right answer");
});

test("an open question shows no right answer", async () => {
  const { field } = await loadedNumericQuestion(seededTransport());

  expect(description(field)).toEqual(["m/s²"]);
  expect(document.body.textContent).not.toContain("Right answer");
});

test("starting over removes the right answer and reopens the field empty", async () => {
  const { field, store } = await loadedNumericQuestion(answered("12", "wrong"));

  store.answers.startOver();

  expect(field.value).toBe("");
  expect(isDisabled(field)).toBe(false);
  expect(description(field)).toEqual(["m/s²"]);
  expect(document.body.textContent).not.toContain("Right answer");
});

const workedSolution = "From d = gt²/2, g = 2 · 4.905 m / (1 s)² = 9.81 m/s².";

function shownExplanation(): HTMLElement | null {
  const explanation = document.querySelector<HTMLElement>(".question-explanation");
  return explanation === null || explanation.hidden ? null : explanation;
}

function follows(later: Node | null, earlier: Node | null): boolean {
  return (
    later !== null &&
    earlier !== null &&
    (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

test("a saved wrong answer shows the explanation after the right-answer line, which with the unit still alone describes the field", async () => {
  const { field } = await loadedNumericQuestion(answered("12", "wrong"), {
    explanation: workedSolution,
  });

  const explanation = shownExplanation();
  expect(explanation?.textContent).toBe(workedSolution);
  expect(follows(explanation, document.querySelector(".numeric-question-right-answer"))).toBe(true);
  expect(description(field)).toEqual(["m/s²", "Right answer: 9.81 ± 0.01 m/s²"]);
});

test("a saved right answer shows the explanation after the locked field and its unit, which alone describes the field", async () => {
  const { field } = await loadedNumericQuestion(answered("9.81", "right"), {
    explanation: workedSolution,
  });

  const explanation = shownExplanation();
  expect(explanation?.textContent).toBe(workedSolution);
  expect(follows(explanation, document.querySelector(".numeric-question-unit"))).toBe(true);
  expect(isDisabled(field)).toBe(true);
  expect(description(field)).toEqual(["m/s²"]);
});

test("the explanation stays hidden through a refused input and while saving, and shows once the answer saves", async () => {
  const { question, field, check } = await loadedNumericQuestion(seededTransport(), {
    explanation: workedSolution,
  });
  expect(shownExplanation()).toBeNull();
  type(field, "abc");
  check.click();
  expect(shownExplanation()).toBeNull();

  type(field, "12");
  check.click();

  expect(question.dataset.status).toBe("saving");
  expect(shownExplanation()).toBeNull();
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });
  expect(shownExplanation()?.textContent).toBe(workedSolution);
  expect(description(field)).toEqual(["m/s²", "Right answer: 9.81 ± 0.01 m/s²"]);
});

test("starting over hides the explanation along with the right-answer line", async () => {
  const { field, store } = await loadedNumericQuestion(answered("12", "wrong"), {
    explanation: workedSolution,
  });
  expect(shownExplanation()).not.toBeNull();

  store.answers.startOver();

  expect(shownExplanation()).toBeNull();
  expect(description(field)).toEqual(["m/s²"]);
});
