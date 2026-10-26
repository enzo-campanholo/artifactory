import { goTo, measureNotices } from "./go-to.ts";

const textEntry =
  "textarea, input:not([type=radio], [type=checkbox], [type=button], [type=submit]), [contenteditable]";
// Small scrolls, such as iOS settling after a fling, don't change the bar.
const scrollStep = 4;
// Long enough for a smooth scroll to a question to finish.
const holdAfterJump = 1000;
// The frame's CSS hides the bar and the contents sheet from this width.
const wide = "(width >= 64rem)";

class ArtifactFrame extends HTMLElement {
  #holdBarUntil = 0;

  constructor() {
    super();
    this.addEventListener("click", (event) => {
      this.#click(event);
    });
  }

  connectedCallback() {
    this.#followNotices();
    this.#markCurrentSection();
    this.#showBarOnScrollUp();
    this.#closeSheetWhenWide();
  }

  #closeSheetWhenWide() {
    const sheet = this.querySelector<HTMLDialogElement>(".artifact-sheet");
    if (sheet === null) return;
    matchMedia(wide).addEventListener("change", ({ matches }) => {
      if (matches) sheet.close();
    });
  }

  #followNotices() {
    const notices = document.querySelector<HTMLElement>(".state-notices");
    if (notices === null) return;
    new ResizeObserver(measureNotices).observe(notices);
  }

  #markCurrentSection() {
    const links = [...this.querySelectorAll<HTMLAnchorElement>(".artifact-section-link")];
    const headings = [...new Set(links.map((link) => link.getAttribute("href") ?? ""))]
      .map((href) => document.getElementById(href.slice(1)))
      .filter((heading) => heading !== null);
    const contents = this.querySelector<HTMLElement>(".artifact-rail .artifact-sections");
    const barContents = this.querySelector(".artifact-bar [data-part=contents]");
    if (headings.length === 0) return;
    let current: string | undefined;
    let frame = 0;
    const inTopQuarter = (candidate: HTMLElement) => {
      const { top } = candidate.getBoundingClientRect();
      return top <= innerHeight / 4;
    };
    const update = () => {
      frame = 0;
      const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
      const linked = headings.find(({ id }) => location.hash === `#${encodeURI(id)}`);
      const followed =
        linked !== undefined && linked.getBoundingClientRect().top >= 0 && inTopQuarter(linked);
      const heading = followed
        ? linked
        : atEnd
          ? headings.at(-1)
          : (headings.findLast(inTopQuarter) ?? headings[0]);
      const href = heading === undefined ? undefined : `#${heading.id}`;
      if (href === current) return;
      current = href;
      for (const link of links) {
        if (link.getAttribute("href") === href) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      }
      if (barContents !== null && heading !== undefined) {
        const [word, of] = document.documentElement.lang.startsWith("pt")
          ? ["Sumário", "de"]
          : ["Contents", "of"];
        const index = headings.indexOf(heading);
        barContents.textContent = `${word} · ${String(index + 1)} ${of} ${String(headings.length)}`;
      }
      if (contents !== null) keepInView(contents, contents.querySelector("[aria-current]"));
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("hashchange", schedule);
    update();
  }

  #showBarOnScrollUp() {
    const bar = this.querySelector<HTMLElement>(".artifact-bar");
    const masthead = this.querySelector(".artifact-masthead");
    if (bar === null || masthead === null) return;
    let mastheadInView = true;
    let typing = false;
    let lastY = scrollY;
    // A reload restores the scroll position in steps after the page has loaded, some of them up,
    // so only scrolls after the owner's first input move the bar.
    let ownerScrolls = false;
    for (const type of ["pointerdown", "touchstart", "wheel", "keydown"]) {
      addEventListener(
        type,
        () => {
          ownerScrolls = true;
        },
        { capture: true, once: true, passive: true },
      );
    }
    const show = (shown: boolean) => {
      const focused = bar.contains(document.activeElement);
      bar.toggleAttribute("data-shown", focused || (shown && !typing && !mastheadInView));
    };
    new IntersectionObserver(([entry]) => {
      mastheadInView = entry?.isIntersecting ?? false;
      if (mastheadInView) show(false);
    }).observe(masthead);
    addEventListener(
      "scroll",
      () => {
        const step = scrollY - lastY;
        if (Math.abs(step) < scrollStep) return;
        lastY = scrollY;
        if (!ownerScrolls || performance.now() < this.#holdBarUntil) return;
        show(step < 0);
      },
      { passive: true },
    );
    document.addEventListener("focusin", ({ target }) => {
      if (!(target instanceof HTMLElement) || target.closest("dialog") !== null) return;
      if (bar.contains(target)) {
        show(true);
        return;
      }
      typing = target.matches(textEntry);
      const covered = target.getBoundingClientRect().top >= bar.getBoundingClientRect().top;
      if (typing || covered) show(false);
    });
    document.addEventListener("focusout", () => {
      typing = false;
    });
  }

  #click(event: MouseEvent) {
    if (!(event.target instanceof Element)) return;
    const sheet = this.querySelector<HTMLDialogElement>(".artifact-sheet");
    const action = event.target.closest<HTMLElement>("[data-action]")?.dataset.action;
    if (event.target.closest(".artifact-bar") !== null) this.#holdBar();
    if (action === "toggle-contents") this.#toggleContents();
    if (action === "open-contents" && sheet !== null) {
      sheet.showModal();
      centreIn(sheet, sheet.querySelector("[aria-current]"));
    }
    if (action === "close-contents" || (event.target === sheet && outside(sheet, event))) {
      sheet?.close();
    }
    const link = event.target.closest<HTMLAnchorElement>(".artifact-sheet a[href^='#']");
    if (sheet !== null && link !== null) this.#goFromSheet(event, sheet, link);
  }

  // Going from the sheet closes it first, so focus lands on the target and not back on the bar.
  #goFromSheet(event: MouseEvent, sheet: HTMLDialogElement, link: HTMLAnchorElement) {
    const href = link.getAttribute("href") ?? "";
    const target = document.getElementById(href.slice(1));
    if (target === null) return;
    event.preventDefault();
    sheet.close();
    this.#holdBar();
    goTo(target, href);
  }

  #holdBar() {
    this.#holdBarUntil = performance.now() + holdAfterJump;
  }

  #toggleContents() {
    const toggle = this.querySelector(".artifact-fold-toggle");
    const list = this.querySelector<HTMLElement>(".artifact-fold-list");
    if (toggle === null || list === null) return;
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    list.hidden = !open;
  }
}

function outside(element: Element, { clientX, clientY }: MouseEvent) {
  const { top, right, bottom, left } = element.getBoundingClientRect();
  return clientX < left || clientX > right || clientY < top || clientY > bottom;
}

function centreIn(scroller: HTMLElement, item: Element | null) {
  if (item === null) return;
  const box = scroller.getBoundingClientRect();
  const { top, height } = item.getBoundingClientRect();
  scroller.scrollTop += top - box.top - (scroller.clientHeight - height) / 2;
}

function keepInView(scroller: HTMLElement, item: Element | null) {
  if (item === null || scroller.scrollHeight <= scroller.clientHeight) return;
  const box = scroller.getBoundingClientRect();
  const { top, bottom } = item.getBoundingClientRect();
  if (top < box.top) scroller.scrollTop -= box.top - top;
  else if (bottom > box.bottom) scroller.scrollTop += bottom - box.bottom;
}

customElements.define("artifact-frame", ArtifactFrame);
