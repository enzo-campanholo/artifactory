import type { StageHost } from "../src/stage-on-page.ts";

// The catalog presses and types through the Stage's module, as `pnpm look` does, never its classes.
export async function runCatalogStages(): Promise<void> {
  // Until the element is defined, nothing stops a submitted form from leaving the page.
  await customElements.whenDefined("artifact-stage");

  for (const run of document.querySelectorAll<HTMLElement>("[data-catalog-run]")) {
    const stage = run.querySelector<StageHost>("artifact-stage");
    const onPage = stage?.onPage;
    const start =
      run.dataset.catalogRun === "start"
        ? onPage?.start
        : onPage?.options.find(({ value }) => value === run.dataset.catalogRun);
    const forward =
      stage?.querySelector<HTMLButtonElement>(".step-controls > button:last-of-type") ?? null;
    if (start === undefined || stage === null || forward === null) continue;
    start.click();
    const stepTo = () => {
      if (!stage.hasAttribute("data-count")) {
        requestAnimationFrame(stepTo);
        return;
      }
      for (let step = 1; step < Number(run.dataset.catalogStep); step++) forward.click();
    };
    stepTo();
  }

  // Types as the owner would and presses Start, so the page opens on a refusal. The refusal takes
  // focus to the field; here it mustn't scroll the page there, and is given back.
  for (const typing of document.querySelectorAll<HTMLElement>("[data-catalog-type]")) {
    const [name = "", value = ""] = (typing.dataset.catalogType ?? "").split("=");
    const field = typing.querySelector<StageHost>("artifact-stage")?.onPage?.field(name);
    const form = field?.form;
    if (field === undefined || form === undefined || form === null) continue;
    field.focus = () => {
      HTMLElement.prototype.focus.call(field, { preventScroll: true });
    };
    field.value = value;
    form.requestSubmit();
    field.blur();
  }
}
