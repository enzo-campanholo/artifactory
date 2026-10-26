// @vitest-environment happy-dom
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
import { keptSummariesKey } from "@artifactory/design-system/library-statuses";
import { keptAttempts, keptTransport } from "@artifactory/design-system/state";
import { afterEach, expect, test, vi } from "vitest";
import {
  artifactId,
  capital,
  checked,
  earlierAttempt,
  heldCheck,
  openPage,
  river,
  savedAttempts,
  seededTransport,
} from "./seeded-page.ts";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const riverAnswered = earlierAttempt;
const capitalAnswered = {
  questionId: "capital",
  response: 1,
  mark: "wrong",
  answeredAt: "2020-10-01T10:05:00.000Z",
} as const;

function changesOf(store: ReturnType<typeof openPage>) {
  let changes = 0;
  store.answers.subscribe(() => {
    changes += 1;
  });
  return () => changes;
}

test("a page shows the answers this device last showed before the server's answers arrive", () => {
  const store = openPage(seededTransport([riverAnswered]), undefined, [riverAnswered]);

  expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
  expect(store.answers.shownAttempt.stoppingPoint?.id).toBe("bridge");
  expect(store.answers.attempts.map(({ id, shown }) => ({ id, shown }))).toEqual([
    { id: "first-attempt", shown: true },
  ]);
});

test("a check that finds the same answers changes nothing on the page", async () => {
  const { held, release } = heldCheck(seededTransport([riverAnswered]));
  const store = openPage(held, undefined, [riverAnswered]);
  const changes = changesOf(store);

  release();
  await checked(store);
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(changes()).toBe(0);
  expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
});

test.each<[string, SavedAttempt[], Record<string, unknown>]>([
  [
    "a newer attempt",
    [
      riverAnswered,
      { id: "second-attempt", startedAt: "2020-10-02T10:00:00.000Z", answers: [capitalAnswered] },
    ],
    { capital: { response: 1, mark: "wrong", status: "saved" }, river: undefined },
  ],
  [
    "more answers",
    [{ ...riverAnswered, answers: [...riverAnswered.answers, capitalAnswered] }],
    {
      capital: { response: 1, mark: "wrong", status: "saved" },
      river: { response: 3, mark: "wrong", status: "saved" },
    },
  ],
  ["fewer answers", [{ ...riverAnswered, answers: [] }], { capital: undefined, river: undefined }],
])(
  "a check that finds %s shows the server's answers once, with no notice",
  async (_, onServer, shown) => {
    const store = openPage(seededTransport(onServer), undefined, [riverAnswered]);
    const changes = changesOf(store);

    await checked(store);

    expect(changes()).toBe(1);
    for (const [questionId, answer] of Object.entries(shown)) {
      expect(store.answers.get(questionId)).toEqual(answer);
    }
    expect(store.answers.notices).toMatchObject({ attemptSwitched: false, loadFailed: false });
  },
);

test("an answer given before the check keeps its place, and the check adds what another device answered", async () => {
  const transport = seededTransport([
    { ...riverAnswered, answers: [...riverAnswered.answers, capitalAnswered] },
  ]);
  const { held, release } = heldCheck(transport);
  const store = openPage(held, undefined, [riverAnswered]);

  await store.answers.save("bridge", 4, "right");
  release();
  await checked(store);

  expect(store.answers.get("bridge")).toEqual({ response: 4, mark: "right", status: "saved" });
  expect(store.answers.get("capital")).toEqual({
    response: 1,
    mark: "wrong",
    status: "answered-elsewhere",
  });
  expect(store.answers.notices.attemptSwitched).toBe(false);
});

test("an answer saved before the check on a page with no copy stays on its own attempt", async () => {
  const { held, release } = heldCheck(seededTransport([riverAnswered]));
  const store = openPage(held);

  await store.answers.save("capital", 2, "right");
  release();
  await checked(store);

  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saved" });
  expect(store.answers.get("river")).toBeUndefined();
  expect(store.answers.notices.attemptSwitched).toBe(false);
});

test("an answer still saving when the check arrives on a page with no copy stays on its own attempt", async () => {
  const transport = seededTransport([riverAnswered]);
  const { held, release } = heldCheck(transport);
  let confirm!: () => void;
  const confirmed = new Promise<void>((resolve) => {
    confirm = resolve;
  });
  const store = openPage({
    load: (id) => held.load(id),
    save: async (id, attemptId, answer) => {
      await confirmed;
      return transport.save(id, attemptId, answer);
    },
  });

  const saving = store.answers.save("capital", 2, "right");
  release();
  await checked(store);

  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saving" });
  expect(store.answers.get("river")).toBeUndefined();
  expect(store.answers.notices.attemptSwitched).toBe(false);
  confirm();
  await saving;
  expect(store.answers.get("capital")?.status).toBe("saved");
  expect(store.answers.attempts.find(({ shown }) => shown)?.id).not.toBe(riverAnswered.id);
});

test("an answer given before a check that finds a newer attempt is kept in its own attempt, and the page switches with a notice", async () => {
  const transport = seededTransport([
    riverAnswered,
    { id: "second-attempt", startedAt: "2020-10-02T10:00:00.000Z", answers: [capitalAnswered] },
  ]);
  const { held, release } = heldCheck(transport);
  const store = openPage(held, undefined, [riverAnswered]);

  await store.answers.save("bridge", 4, "right");
  release();
  await checked(store);

  expect(store.answers.notices.attemptSwitched).toBe(true);
  expect(store.answers.get("capital")).toEqual({ response: 1, mark: "wrong", status: "saved" });
  const first = store.answers.attempts.find(({ id }) => id === riverAnswered.id);
  expect(first?.answers.map(({ questionId }) => questionId)).toEqual(["river", "bridge"]);
});

test("a copy taken before the artifact was revised shows only the questions it has now, and raises no notice", async () => {
  const copied: SavedAttempt = {
    ...riverAnswered,
    answers: [{ ...capitalAnswered, questionId: "removed-question" }, ...riverAnswered.answers],
  };
  const store = openPage(seededTransport([copied]), [capital, river], [copied]);

  expect(store.answers.get("removed-question")).toBeUndefined();
  expect(store.answers.shownAttempt.progress).toEqual({ answered: 1, total: 2 });
  await checked(store);
  expect(store.answers.notices.artifactUpdated).toBe(false);
});

test("a failed check keeps the page as it started under a notice, and a retry checks it again", async () => {
  const transport = seededTransport([
    { ...riverAnswered, answers: [...riverAnswered.answers, capitalAnswered] },
  ]);
  transport.forced.add("load fails");
  const store = openPage(transport, undefined, [riverAnswered]);

  await vi.waitFor(() => {
    expect(store.answers.notices.loadFailed).toBe(true);
  });
  expect(store.answers.checked).toBe(false);
  expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
  transport.forced.delete("load fails");
  store.answers.retry();
  await checked(store);

  expect(store.answers.notices.loadFailed).toBe(false);
  expect(store.answers.get("capital")).toEqual({ response: 1, mark: "wrong", status: "saved" });
});

test("a retried check that finds the same answers only puts the notice away", async () => {
  const transport = seededTransport([riverAnswered]);
  transport.forced.add("load fails");
  const store = openPage(transport, undefined, [riverAnswered]);
  await vi.waitFor(() => {
    expect(store.answers.notices.loadFailed).toBe(true);
  });
  const changes = changesOf(store);
  transport.forced.delete("load fails");

  store.answers.retry();
  await checked(store);

  expect(changes()).toBe(1);
  expect(store.answers.notices.loadFailed).toBe(false);
  expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
});

test("the answers each load and save return are kept on the device, and the next page starts from them", async () => {
  const transport = seededTransport([riverAnswered]);
  const store = openPage(keptTransport(transport));
  await checked(store);
  expect(keptAttempts(artifactId)).toEqual([riverAnswered]);

  await store.answers.save("capital", 1, "wrong");

  const reopened = openPage(keptTransport(transport), undefined, keptAttempts(artifactId));
  expect(reopened.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
  expect(reopened.answers.get("capital")).toEqual({ response: 1, mark: "wrong", status: "saved" });
  expect(keptAttempts(artifactId)).toEqual(await savedAttempts(transport));
});

test("a device with no copy of an artifact starts it from no answers", () => {
  expect(keptAttempts(artifactId)).toEqual([]);
});

test("signing out forgets every artifact's copy on the device, and the Library's statuses", async () => {
  const transport = seededTransport([riverAnswered]);
  localStorage.setItem(keptSummariesKey, "{}");
  await keptTransport(transport).load("another-artifact");
  const store = openPage(keptTransport(transport));
  await checked(store);
  transport.forced.add("signed out");

  await store.answers.save("capital", 1, "wrong");

  expect(keptAttempts(artifactId)).toEqual([]);
  expect(keptAttempts("another-artifact")).toEqual([]);
  expect(localStorage.getItem(keptSummariesKey)).toBeNull();
});

test("answers still load and save when the device can't keep them", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  });
  const store = openPage(keptTransport(seededTransport([riverAnswered])));

  await checked(store);
  await store.answers.save("capital", 1, "wrong");

  expect(store.answers.get("river")?.status).toBe("saved");
  expect(store.answers.get("capital")?.status).toBe("saved");
});
