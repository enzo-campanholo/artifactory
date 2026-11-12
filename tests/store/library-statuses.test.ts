// @vitest-environment happy-dom
import "@artifactory/design-system/state-notices";
import {
  keptLibraryTransport,
  keptSummariesKey,
  memoryLibraryTransport,
  startLibraryStatuses,
  type LibraryStatuses,
} from "@artifactory/design-system/library-statuses";
import { showRowStatuses } from "@artifactory/design-system/library-row-statuses";
import paintFromKeptCopy from "@artifactory/design-system/library-row-statuses-paint?raw";
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
import type { Summary } from "@artifactory/design-system/scoring";
import type { Window as HappyWindow } from "happy-dom";
import { keptAttempts, keptTransport, memoryTransport } from "@artifactory/design-system/state";
import { afterEach, expect, test, vi } from "vitest";

const buildId = "5b7e2c90-1f4a-4d38-a6e1-0c9d8b7a6f52";

const inProgress = {
  marks: { capital: "right" as const },
  progress: { answered: 1, total: 3 },
  score: 1,
  finished: false,
};

const orbitsAttempt = {
  id: "orbits-attempt",
  startedAt: "2026-10-01T10:00:00.000Z",
  answers: [
    { questionId: "capital", response: 2, mark: "right", answeredAt: "2026-10-01T10:00:00.000Z" },
  ],
} satisfies SavedAttempt;

function libraryTransport() {
  return memoryLibraryTransport({ buildId, summaries: { orbits01: inProgress } });
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.restoreAllMocks();
});

function mountLibraryNotices() {
  const template = document.createElement("template");
  template.innerHTML = `
    <artifact-state-notices class="state-notices" role="status">
      <p class="state-notice" data-notice="loadFailed" hidden>
        <span data-lang="en">Couldn't load your progress</span><span class="state-notice-separator">&nbsp;·</span> <button type="button" class="state-notice-action" data-action="retry"><span data-lang="en">Try again</span></button>
      </p>
      <p class="state-notice" data-notice="signedOut" hidden>
        <span data-lang="en">Signed out</span><span class="state-notice-separator">&nbsp;·</span> <button type="button" class="state-notice-action" data-action="reload"><span data-lang="en">Reload to sign in</span></button>
      </p>
      <p class="state-notice" data-notice="libraryUpdated" hidden>
        <span data-lang="en">Library updated</span><span class="state-notice-separator">&nbsp;·</span> <button type="button" class="state-notice-action" data-action="reload"><span data-lang="en">Reload</span></button>
      </p>
    </artifact-state-notices>
    <main class="page"></main>`;
  document.body.append(template.content);
  const retry = document.querySelector("[data-action=retry]");
  if (!(retry instanceof HTMLButtonElement)) throw new Error("no Try again");
  return { retry };
}

const shownNotices = () =>
  [...document.querySelectorAll<HTMLElement>("[data-notice]")]
    .filter((paragraph) => !paragraph.hidden)
    .map((paragraph) => paragraph.textContent.replace(/\s+/g, " ").trim());

async function loaded(statuses: LibraryStatuses) {
  await vi.waitFor(() => {
    expect(statuses.loaded).toBe(true);
  });
}

test("statuses load each artifact's summary, and an artifact without one has no status", async () => {
  const statuses = startLibraryStatuses({ buildId, transport: libraryTransport() });

  expect(statuses.summary("orbits01")).toBeUndefined();
  await loaded(statuses);
  expect(statuses.summary("orbits01")).toEqual(inProgress);
  expect(statuses.summary("newton02")).toBeUndefined();
  expect(statuses.notices).toEqual({ loadFailed: false, signedOut: false, libraryUpdated: false });
});

test.each(["focus", "online"])(
  "a failed load shows a notice, and the statuses retry it on %s",
  async (event) => {
    const transport = libraryTransport();
    transport.forced.add("load fails");

    const statuses = startLibraryStatuses({ buildId, transport });

    await vi.waitFor(() => {
      expect(statuses.notices.loadFailed).toBe(true);
    });
    transport.forced.delete("load fails");
    window.dispatchEvent(new Event(event));
    await loaded(statuses);
    expect(statuses.notices.loadFailed).toBe(false);
    expect(statuses.summary("orbits01")).toEqual(inProgress);
  },
);

test("signing out shows a notice and stops loading", async () => {
  const transport = libraryTransport();
  transport.forced.add("signed out");

  const statuses = startLibraryStatuses({ buildId, transport });

  await vi.waitFor(() => {
    expect(statuses.notices.signedOut).toBe(true);
  });
  transport.forced.delete("signed out");
  window.dispatchEvent(new Event("online"));
  document.dispatchEvent(new Event("visibilitychange"));
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(statuses.loaded).toBe(false);
});

test("a sign-out after a failed load shows only the signed-out notice", async () => {
  const transport = libraryTransport();
  transport.forced.add("load fails");
  const statuses = startLibraryStatuses({ buildId, transport });
  await vi.waitFor(() => {
    expect(statuses.notices.loadFailed).toBe(true);
  });
  transport.forced.add("signed out");

  document.dispatchEvent(new Event("visibilitychange"));

  await vi.waitFor(() => {
    expect(statuses.notices).toEqual({ loadFailed: false, signedOut: true, libraryUpdated: false });
  });
});

test("the statuses a load returns are kept on the device, and a sign-out forgets them with every artifact's answers", async () => {
  const transport = libraryTransport();
  await keptTransport(memoryTransport({ contentHash: "orbits", attempts: [orbitsAttempt] })).load(
    "orbits01",
  );
  const statuses = startLibraryStatuses({ buildId, transport: keptLibraryTransport(transport) });

  await loaded(statuses);
  expect(JSON.parse(localStorage.getItem(keptSummariesKey) ?? "null")).toEqual({
    orbits01: inProgress,
  });
  transport.forced.add("signed out");
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.waitFor(() => {
    expect(statuses.notices.signedOut).toBe(true);
  });
  expect(localStorage.getItem(keptSummariesKey)).toBeNull();
  expect(keptAttempts("orbits01")).toEqual([]);
});

test("statuses still load when the device can't keep them", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  });

  const statuses = startLibraryStatuses({
    buildId,
    transport: keptLibraryTransport(libraryTransport()),
  });

  await loaded(statuses);
  expect(statuses.summary("orbits01")).toEqual(inProgress);
});

test("a failed load shows 'Couldn't load your progress · Try again' in the band, and Try again loads the statuses and moves focus to the page", async () => {
  const transport = libraryTransport();
  transport.forced.add("load fails");
  const statuses = startLibraryStatuses({ buildId, transport });
  const { retry } = mountLibraryNotices();
  await vi.waitFor(() => {
    expect(shownNotices()).toEqual(["Couldn't load your progress · Try again"]);
  });
  transport.forced.delete("load fails");
  retry.focus();

  retry.click();

  expect(retry.getAttribute("aria-disabled")).toBe("true");
  await loaded(statuses);
  expect(shownNotices()).toEqual([]);
  expect(retry.hasAttribute("aria-disabled")).toBe(false);
  expect(document.activeElement).toBe(document.querySelector("main.page"));
});

test("a newer build of the Library shows a notice", async () => {
  const transport = libraryTransport();
  transport.forced.add("library updated");

  const statuses = startLibraryStatuses({ buildId, transport });

  await loaded(statuses);
  expect(statuses.notices.libraryUpdated).toBe(true);
  expect(statuses.summary("orbits01")).toEqual(inProgress);
});

test.each([
  ["returning to the tab", () => document.dispatchEvent(new Event("visibilitychange"))],
  [
    "coming back from the back/forward cache",
    () => window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true })),
  ],
])("%s reloads the statuses", async (_, comeBack) => {
  const transport = libraryTransport();
  const statuses = startLibraryStatuses({ buildId, transport });
  await loaded(statuses);
  const finished = {
    marks: { capital: "right" as const, river: "wrong" as const, bridge: "right" as const },
    progress: { answered: 3, total: 3 },
    score: 2,
    finished: true,
  };
  transport.summaries.orbits01 = finished;

  comeBack();

  await vi.waitFor(() => {
    expect(statuses.summary("orbits01")).toEqual(finished);
  });
});

test("a failed reload keeps the statuses already shown, without a notice", async () => {
  const transport = libraryTransport();
  const statuses = startLibraryStatuses({ buildId, transport });
  await loaded(statuses);
  transport.forced.add("load fails");
  const reloaded = new Promise<void>((resolve) => {
    const stop = statuses.subscribe(() => {
      stop();
      resolve();
    });
  });

  document.dispatchEvent(new Event("visibilitychange"));

  await reloaded;
  expect(statuses.summary("orbits01")).toEqual(inProgress);
  expect(statuses.notices.loadFailed).toBe(false);
});

const finishedOrbits = {
  marks: { capital: "right" as const, river: "wrong" as const, bridge: "right" as const },
  progress: { answered: 3, total: 3 },
  score: 2,
  finished: true,
};

const unanswered = { marks: {}, progress: { answered: 0, total: 4 }, score: 0, finished: false };

function mountLibraryRows() {
  const template = document.createElement("template");
  template.innerHTML = `
    <ol class="library-list">
      <li class="library-row" data-artifact-id="orbits01"><a class="library-title" href="/orbits/">Orbits</a></li>
      <li class="library-row" data-artifact-id="newton02"><a class="library-title" href="/newton/">Newton</a></li>
      <li class="library-row" data-artifact-id="krebs003"><a class="library-title" href="/krebs/">Krebs</a></li>
    </ol>`;
  document.body.append(template.content);
}

const rowStatuses = () =>
  [...document.querySelectorAll<HTMLElement>(".library-row")].map((row) => [
    row.dataset.artifactId,
    row.querySelector(".library-status")?.textContent,
  ]);

test("each row shows its latest attempt's status: finished, in progress, or nothing before the first answer", async () => {
  const transport = memoryLibraryTransport({
    buildId,
    summaries: { orbits01: finishedOrbits, newton02: inProgress, krebs003: unanswered },
  });
  const statuses = startLibraryStatuses({ buildId, transport });
  mountLibraryRows();

  showRowStatuses(statuses);

  await vi.waitFor(() => {
    expect(rowStatuses()).toEqual([
      ["orbits01", "Finished"],
      ["newton02", "In progress · 1 of 3 answered"],
      ["krebs003", undefined],
    ]);
  });
});

test("a row's status goes when a load reports no answers in its latest attempt", async () => {
  const transport = libraryTransport();
  const statuses = startLibraryStatuses({ buildId, transport });
  mountLibraryRows();
  showRowStatuses(statuses);
  await vi.waitFor(() => {
    expect(rowStatuses()[0]).toEqual(["orbits01", "In progress · 1 of 3 answered"]);
  });
  transport.summaries.orbits01 = unanswered;

  document.dispatchEvent(new Event("visibilitychange"));

  await vi.waitFor(() => {
    expect(document.querySelector(".library-status")).toBeNull();
  });
});

const keptStatuses = { orbits01: finishedOrbits, newton02: inProgress, krebs003: unanswered };

const rowsFromKeptStatuses =
  '<li class="library-row" data-artifact-id="orbits01"><a class="library-title" href="/orbits/">Orbits</a><p class="library-status">Finished</p></li>' +
  '<li class="library-row" data-artifact-id="newton02"><a class="library-title" href="/newton/">Newton</a><p class="library-status">In progress · 1 of 3 answered</p></li>' +
  '<li class="library-row" data-artifact-id="krebs003"><a class="library-title" href="/krebs/">Krebs</a></li>';

function openLibraryBeforeLoad(summaries: Record<string, Summary>) {
  const transport = memoryLibraryTransport({ buildId, summaries });
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const statuses = startLibraryStatuses({
    buildId,
    transport: { load: () => released.then(() => transport.load()) },
  });
  mountLibraryRows();
  return { statuses, release };
}

// Runs the inline script LibraryLayout writes right after the list, as the page does.
function paintedFromKeptCopy(kept: string | null) {
  if (kept !== null) localStorage.setItem(keptSummariesKey, kept);
  (window as unknown as HappyWindow).happyDOM.settings.enableJavaScriptEvaluation = true;
  const script = document.createElement("script");
  script.dataset.keptSummariesKey = keptSummariesKey;
  script.textContent = paintFromKeptCopy;
  document.body.append(script);
  return document.querySelector(".library-list");
}

const rowsMarkup = () =>
  [...document.querySelectorAll(".library-row")].map((row) => row.outerHTML).join("");

const statusNodes = () =>
  [...document.querySelectorAll(".library-status")].flatMap((status) => [
    status,
    status.firstChild,
  ]);

test("this device's copy paints the rows' statuses before the load, and a load that agrees leaves them as they are", async () => {
  const { statuses, release } = openLibraryBeforeLoad(keptStatuses);

  paintedFromKeptCopy(JSON.stringify(keptStatuses));
  const painted = statusNodes();

  expect(rowsMarkup()).toBe(rowsFromKeptStatuses);
  showRowStatuses(statuses);
  release();
  await loaded(statuses);
  expect(rowsMarkup()).toBe(rowsFromKeptStatuses);
  const shown = statusNodes();
  expect(shown).toHaveLength(painted.length);
  expect(shown.every((node, index) => node === painted[index])).toBe(true);
});

test("the store paints the same rows from the same statuses", async () => {
  const { statuses, release } = openLibraryBeforeLoad(keptStatuses);

  showRowStatuses(statuses);
  release();

  await loaded(statuses);
  expect(rowsMarkup()).toBe(rowsFromKeptStatuses);
});

test("a load that differs from this device's copy corrects the painted statuses", async () => {
  const { statuses, release } = openLibraryBeforeLoad({
    orbits01: inProgress,
    krebs003: inProgress,
  });
  paintedFromKeptCopy(JSON.stringify(keptStatuses));
  expect(rowsMarkup()).toBe(rowsFromKeptStatuses);

  showRowStatuses(statuses);
  release();

  await loaded(statuses);
  expect(rowStatuses()).toEqual([
    ["orbits01", "In progress · 1 of 3 answered"],
    ["newton02", undefined],
    ["krebs003", "In progress · 1 of 3 answered"],
  ]);
});

test.each([
  { copy: "no copy", kept: null },
  { copy: "a copy that can't be read", kept: "{not json" },
  { copy: "a copy that isn't an object", kept: "[1]" },
  {
    copy: "a copy with progress that isn't numbers",
    kept: '{"orbits01":{"progress":{"answered":"1","total":3}}}',
  },
])("$copy paints no statuses, and the load fills them in", async ({ kept }) => {
  const { statuses, release } = openLibraryBeforeLoad(keptStatuses);

  paintedFromKeptCopy(kept);

  expect(document.querySelector(".library-status")).toBeNull();
  showRowStatuses(statuses);
  release();
  await loaded(statuses);
  expect(rowsMarkup()).toBe(rowsFromKeptStatuses);
});
