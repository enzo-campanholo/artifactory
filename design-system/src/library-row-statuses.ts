import type { LibraryStatuses } from "./library-statuses.ts";
import type { Summary } from "./scoring.ts";

function statusText({ progress: { answered, total }, finished }: Summary): string {
  if (answered === 0) return "";
  return finished ? "Finished" : `In progress · ${String(answered)} of ${String(total)} answered`;
}

function show(statuses: LibraryStatuses) {
  if (!statuses.loaded) return;
  for (const row of document.querySelectorAll<HTMLElement>(".library-row")) {
    const rowSummary = statuses.summary(row.dataset.artifactId ?? "");
    const text = rowSummary === undefined ? "" : statusText(rowSummary);
    let status = row.querySelector(".library-status");
    if (text === "") {
      status?.remove();
      continue;
    }
    if (status === null) {
      status = row.appendChild(document.createElement("p"));
      status.className = "library-status";
    }
    if (status.textContent !== text) status.textContent = text;
  }
}

export function showRowStatuses(statuses: LibraryStatuses): void {
  statuses.subscribe(() => {
    show(statuses);
  });
  show(statuses);
}
