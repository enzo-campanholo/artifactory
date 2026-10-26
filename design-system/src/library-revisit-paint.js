// LibraryLayout writes this inline, after the Library questions block it reads, so "To revisit"
// paints with the rows from the statuses this device last loaded, as the statuses do. It writes
// exactly the markup library-revisit.ts writes, so a load that agrees leaves it as it is; seam 3
// holds both to one literal.
/* global document, localStorage */
{
  const { keptSummariesKey = "" } = document.currentScript?.dataset ?? {};
  /** @type {Partial<Record<string, { marks?: Partial<Record<string, string>> }>>} */
  let kept = {};
  try {
    kept =
      /** @type {typeof kept | null} */ (
        JSON.parse(localStorage.getItem(keptSummariesKey) ?? "{}")
      ) ?? {};
  } catch {
    // A copy that can't be read paints nothing, and the load fills the section in.
  }

  /**
   * @param {string} name
   * @param {Record<string, string>} attributes
   * @param {...(Node | string)} children
   */
  const element = (name, attributes, ...children) => {
    const created = document.createElement(name);
    for (const [attribute, value] of Object.entries(attributes)) {
      created.setAttribute(attribute, value);
    }
    created.append(...children);
    return created;
  };

  // typescript-eslint checks the uncast call, not the JSDoc cast TypeScript reads.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const listed =
    /** @type {{ artifactId: string, questions: { id: string, number: number, section?: string }[] }[]} */ (
      JSON.parse(document.getElementById("library-questions")?.textContent ?? "[]")
    );
  const groups = listed.flatMap(({ artifactId, questions }) => {
    const row = document.querySelector(
      `.library-row[data-artifact-id="${CSS.escape(artifactId)}"]`,
    );
    const title = row?.querySelector(":scope > .library-title");
    const summary = Object.hasOwn(kept, artifactId) ? kept[artifactId] : undefined;
    const wrong = questions.filter(({ id }) => summary?.marks?.[id] === "wrong");
    if (!(row instanceof HTMLElement) || !(title instanceof HTMLAnchorElement)) return [];
    if (wrong.length === 0) return [];
    const rows = wrong.map(({ id, number, section }) => {
      const revisitRow = element(
        "li",
        {},
        element("a", { href: `${title.pathname}#q-${id}` }, `Question ${String(number)}`),
      );
      if (section !== undefined) {
        revisitRow.appendChild(element("span", { lang: title.lang })).innerHTML = section;
      }
      return revisitRow;
    });
    const headingId = `library-revisit-${artifactId}`;
    return [
      element(
        "div",
        {
          class: "library-revisit-group",
          "data-artifact-id": artifactId,
          "data-subject": row.dataset.subject ?? "",
        },
        element(
          "h3",
          { class: "library-revisit-title", id: headingId, lang: title.lang },
          title.textContent,
        ),
        element("ol", { class: "revisit-list", "aria-labelledby": headingId }, ...rows),
      ),
    ];
  });
  if (groups.length > 0) {
    document
      .querySelector("library-revisit")
      ?.append(
        element(
          "section",
          { class: "page-close" },
          element(
            "div",
            {},
            element("h2", { class: "page-close-heading" }, "To revisit"),
            ...groups,
          ),
        ),
      );
  }
}
