import { whenLibraryStatusesStart, type LibraryStatuses } from "./library-statuses.ts";
import {
  libraryQuestionsInDocument,
  questionAnchor,
  type PlacedQuestion,
} from "./question-markers.ts";
import { toRevisit } from "./scoring.ts";

function listedRow(artifactId: string): { title: HTMLAnchorElement; subject: string } {
  const row = document.querySelector<HTMLElement>(
    `.library-row[data-artifact-id="${CSS.escape(artifactId)}"]`,
  );
  const title = row?.querySelector<HTMLAnchorElement>(":scope > .library-title");
  const subject = row?.dataset.subject;
  if (title == null || subject === undefined) {
    throw new Error(`The page doesn't list ${artifactId}`);
  }
  return { title, subject };
}

function element<K extends keyof HTMLElementTagNameMap>(
  name: K,
  attributes: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const created = document.createElement(name);
  for (const [attribute, value] of Object.entries(attributes)) {
    created.setAttribute(attribute, value);
  }
  created.append(...children);
  return created;
}

function group(artifactId: string, wrong: PlacedQuestion[]): HTMLElement {
  const { title, subject } = listedRow(artifactId);
  const rows = wrong.map(({ id, number, section }) => {
    const row = element(
      "li",
      {},
      element(
        "a",
        { href: `${title.pathname}#${questionAnchor(id)}` },
        `Question ${String(number)}`,
      ),
    );
    if (section !== undefined) {
      row.appendChild(element("span", { lang: title.lang })).innerHTML = section;
    }
    return row;
  });
  const headingId = `library-revisit-${artifactId}`;
  return element(
    "div",
    { class: "library-revisit-group", "data-artifact-id": artifactId, "data-subject": subject },
    element(
      "h3",
      { class: "library-revisit-title", id: headingId, lang: title.lang },
      title.textContent,
    ),
    element("ol", { class: "revisit-list", "aria-labelledby": headingId }, ...rows),
  );
}

function revisitGroups(statuses: LibraryStatuses): HTMLElement[] {
  return libraryQuestionsInDocument().flatMap(({ artifactId, questions }) => {
    const wrong = toRevisit(questions, statuses.summary(artifactId)?.marks ?? {});
    return wrong.length === 0 ? [] : [group(artifactId, wrong)];
  });
}

class LibraryRevisit extends HTMLElement {
  #statuses: LibraryStatuses | undefined;

  connectedCallback() {
    whenLibraryStatusesStart((statuses) => {
      if (this.#statuses !== undefined) return;
      this.#statuses = statuses;
      statuses.subscribe(() => {
        this.#show(statuses);
      });
      this.#show(statuses);
    });
  }

  #show(statuses: LibraryStatuses) {
    if (!statuses.loaded) return;
    const groups = revisitGroups(statuses);
    const shown = document.createElement("div");
    if (groups.length > 0) {
      shown.append(
        element(
          "section",
          { class: "page-close" },
          // One item of the close's grid, so its gap doesn't space the heading and the groups.
          element(
            "div",
            {},
            element("h2", { class: "page-close-heading" }, "To revisit"),
            ...groups,
          ),
        ),
      );
    }
    if (shown.innerHTML !== this.innerHTML) this.replaceChildren(...shown.childNodes);
  }
}

customElements.define("library-revisit", LibraryRevisit);
