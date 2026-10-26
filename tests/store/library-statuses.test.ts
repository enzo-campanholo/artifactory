// @vitest-environment happy-dom
import "@artifactory/design-system/state-notices";
import {
  keptLibraryTransport,
  keptSummariesKey,
  memoryLibraryTransport,
  startLibraryStatuses,
  type LibraryStatuses,
} from "@artifactory/design-system/library-statuses";
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
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
