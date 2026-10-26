// @vitest-environment happy-dom
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
import "@artifactory/design-system/attempts-panel";
import { afterEach, expect, test, vi } from "vitest";
import { checked, openPage, seededTransport } from "./seeded-page.ts";

function mountPanel() {
  const template = document.createElement("template");
  template.innerHTML = `
    <artifact-attempts-panel class="attempts-panel">
      <section aria-labelledby="artifact-attempts-heading">
        <h2 id="artifact-attempts-heading"><span data-lang="en">Your attempts</span></h2>
        <p class="attempts-none"><span data-lang="en">No attempts yet.</span></p>
        <ol class="attempts-list"></ol>
        <button type="button" class="attempts-show-all" hidden><span data-lang="en">Show all</span></button>
      </section>
    </artifact-attempts-panel>`;
  document.body.append(template.content);
  const showAll = document.querySelector<HTMLButtonElement>(".attempts-show-all");
  const none = document.querySelector<HTMLElement>(".attempts-none");
  if (showAll === null || none === null) throw new Error("not mounted");
  return { showAll, none };
}

async function openPanelPage(attempts: SavedAttempt[]) {
  const store = openPage(seededTransport(attempts));
  const mounted = mountPanel();
  await checked(store);
  return { store, ...mounted };
}

const listedAttempts = () =>
  [...document.querySelectorAll<HTMLElement>(".attempts-list > li")]
    .filter((row) => !row.hidden)
    .map((row) => ({
      date: row.querySelector("time")?.dateTime,
      state: row.querySelector("span")?.textContent,
    }));

afterEach(() => {
  document.body.innerHTML = "";
});

test("the attempts panel shows the five newest attempts until Show all lists every one and moves focus to the first one it adds", async () => {
  const attempts = Array.from({ length: 7 }, (_, day) => ({
    id: `attempt-${String(day + 1)}`,
    startedAt: `2020-10-0${String(day + 1)}T10:00:00.000Z`,
    answers: [
      {
        questionId: "river",
        response: 1,
        mark: "right" as const,
        answeredAt: `2020-10-0${String(day + 1)}T10:00:00.000Z`,
      },
    ],
  }));

  const { showAll } = await openPanelPage(attempts);

  expect(listedAttempts().map(({ date }) => date)).toEqual([
    "2020-10-07T10:00:00.000Z",
    "2020-10-06T10:00:00.000Z",
    "2020-10-05T10:00:00.000Z",
    "2020-10-04T10:00:00.000Z",
    "2020-10-03T10:00:00.000Z",
  ]);
  expect(showAll.hidden).toBe(false);
  expect(showAll.textContent).toBe("Show all");

  showAll.click();

  expect(listedAttempts()).toHaveLength(7);
  expect(showAll.hidden).toBe(true);
  expect(document.activeElement?.querySelector("time")?.dateTime).toBe("2020-10-02T10:00:00.000Z");
});

test("an artifact without attempts says so", async () => {
  const { none, showAll } = await openPanelPage([]);

  expect(none.hidden).toBe(false);
  expect(listedAttempts()).toEqual([]);
  expect(showAll.hidden).toBe(true);
});

test.each(["load fails", "signed out"] as const)(
  "the attempts panel lists the attempts this device last showed, and keeps them when the first load comes back %s",
  async (outcome) => {
    const attempts = [
      {
        id: "first-attempt",
        startedAt: "2020-10-01T10:00:00.000Z",
        answers: [
          {
            questionId: "river",
            response: 1,
            mark: "right" as const,
            answeredAt: "2020-10-01T10:00:00.000Z",
          },
        ],
      },
    ];
    const transport = seededTransport(attempts);
    transport.forced.add(outcome);
    const store = openPage(transport, undefined, attempts);

    const { none } = mountPanel();

    const listed = [{ date: "2020-10-01T10:00:00.000Z", state: "this attempt" }];
    expect(listedAttempts()).toEqual(listed);
    expect(none.hidden).toBe(true);
    await vi.waitFor(() => {
      expect(store.answers.notices.loadFailed || store.answers.notices.signedOut).toBe(true);
    });
    expect(listedAttempts()).toEqual(listed);
  },
);
