// LibraryLayout writes this inline, right after the list, so the statuses this device last loaded
// paint with the rows and the load only corrects them. It writes exactly the markup
// library-row-statuses.ts writes, so a load that agrees leaves the rows as they are; seam 3 holds
// both to one literal.
/* global document, localStorage */
{
  const { keptSummariesKey = "" } = document.currentScript?.dataset ?? {};
  /** @type {Partial<Record<string, { progress?: { answered?: unknown, total?: unknown }, finished?: unknown }>>} */
  let kept = {};
  try {
    kept =
      /** @type {typeof kept | null} */ (
        JSON.parse(localStorage.getItem(keptSummariesKey) ?? "{}")
      ) ?? {};
  } catch {
    // A copy that can't be read paints no statuses, and the load fills them in.
  }

  for (const row of document.querySelectorAll(".library-row")) {
    if (!(row instanceof HTMLElement)) continue;
    const artifactId = row.dataset.artifactId ?? "";
    const summary = Object.hasOwn(kept, artifactId) ? kept[artifactId] : undefined;
    const { answered, total } = summary?.progress ?? {};
    if (typeof answered !== "number" || typeof total !== "number" || answered === 0) continue;
    const status = row.appendChild(document.createElement("p"));
    status.className = "library-status";
    status.textContent =
      summary?.finished === true
        ? "Finished"
        : `In progress · ${String(answered)} of ${String(total)} answered`;
  }
}
