// @vitest-environment happy-dom
import { expect, test, vi } from "vitest";
import {
  artifactId,
  earlierAttempt,
  checked,
  nextChange,
  openPage,
  returnToTab,
  savedAttempts,
  seededTransport,
} from "./seeded-page.ts";

test("the store loads the latest attempt's saved answers", async () => {
  const transport = seededTransport([
    {
      id: "first-attempt",
      startedAt: "2026-10-01T10:00:00.000Z",
      answers: [
        {
          questionId: "capital",
          response: 2,
          mark: "right",
          answeredAt: "2026-10-01T10:00:00.000Z",
        },
      ],
    },
  ]);

  const store = openPage(transport);

  expect(store.answers.checked).toBe(false);
  expect(store.answers.get("capital")).toBeUndefined();
  await checked(store);
  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saved" });
  expect(store.answers.get("river")).toBeUndefined();
});

test("the store scores its answers and attempts by the page's questions", async () => {
  const transport = seededTransport([
    {
      id: "first-attempt",
      startedAt: "2026-10-01T10:00:00.000Z",
      answers: [
        {
          questionId: "capital",
          response: 2,
          mark: "wrong",
          answeredAt: "2026-10-01T10:00:00.000Z",
        },
        { questionId: "river", response: 1, mark: "right", answeredAt: "2026-10-01T10:01:00.000Z" },
        {
          questionId: "bridge",
          response: 4,
          mark: "right",
          answeredAt: "2026-10-01T10:02:00.000Z",
        },
      ],
    },
  ]);

  const store = openPage(transport);
  await checked(store);

  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saved" });
  expect(store.answers.shownAttempt).toMatchObject({ score: 3, toRevisit: [] });
  expect(store.answers.attempts.map(({ finished }) => finished)).toEqual([true]);
});

test("a saved answer shows as saving until the transport confirms it", async () => {
  const store = openPage(seededTransport());
  await checked(store);
  const statuses: (string | undefined)[] = [];
  store.answers.subscribe(() => statuses.push(store.answers.get("capital")?.status));

  const saving = store.answers.save("capital", 2, "right");

  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saving" });
  await saving;
  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saved" });
  expect(statuses).toEqual(["saving", "saved"]);
});

test("an attempt exists from its first saved answer, and later answers join it", async () => {
  const transport = seededTransport();
  const store = openPage(transport);
  await checked(store);

  expect(await savedAttempts(transport)).toEqual([]);
  await store.answers.save("capital", 2, "right");
  await store.answers.save("river", 3, "wrong");

  const attempts = await savedAttempts(transport);
  expect(attempts).toHaveLength(1);
  expect(
    attempts[0]?.answers.map(({ questionId, response, mark }) => ({ questionId, response, mark })),
  ).toEqual([
    { questionId: "capital", response: 2, mark: "right" },
    { questionId: "river", response: 3, mark: "wrong" },
  ]);
});

test("each page that starts without saved answers makes up its own attempt ID", async () => {
  const firstTransport = seededTransport();
  const secondTransport = seededTransport();
  for (const transport of [firstTransport, secondTransport]) {
    const store = openPage(transport);
    await checked(store);
    await store.answers.save("capital", 2, "right");
  }

  const [first] = await savedAttempts(firstTransport);
  const [second] = await savedAttempts(secondTransport);
  expect(first?.id).toMatch(/\S/);
  expect(second?.id).toMatch(/\S/);
  expect(first?.id).not.toBe(second?.id);
});

test("a page opened after an answer was saved shows that answer as saved", async () => {
  const transport = seededTransport();
  const firstPage = openPage(transport);
  await checked(firstPage);
  await firstPage.answers.save("capital", 1, "wrong");

  const reopened = openPage(transport);
  await checked(reopened);

  expect(reopened.answers.get("capital")).toEqual({ response: 1, mark: "wrong", status: "saved" });
});

test("an answer already given on another device replaces yours, with a notice", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  await transport.save(artifactId, "first-attempt", {
    questionId: "capital",
    response: 1,
    mark: "wrong",
  });

  await store.answers.save("capital", 2, "right");

  expect(store.answers.get("capital")).toEqual({
    response: 1,
    mark: "wrong",
    status: "answered-elsewhere",
  });
});

test.each(["focus", "online"])(
  "a failed save stays as not saved, and the store retries it on %s",
  async (event) => {
    const transport = seededTransport();
    const store = openPage(transport);
    await checked(store);
    transport.forced.add("save fails");

    await store.answers.save("capital", 2, "right");

    expect(store.answers.get("capital")).toEqual({
      response: 2,
      mark: "right",
      status: "not-saved",
    });
    transport.forced.delete("save fails");
    window.dispatchEvent(new Event(event));
    await vi.waitFor(() => {
      expect(store.answers.get("capital")?.status).toBe("saved");
    });
    const [attempt] = await savedAttempts(transport);
    expect(attempt?.answers).toMatchObject([{ questionId: "capital", response: 2, mark: "right" }]);
  },
);

test("a retried answer that returns your own answer counts as saved", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  transport.forced.add("save fails");
  await store.answers.save("capital", 2, "right");
  transport.forced.delete("save fails");
  await transport.save(artifactId, "first-attempt", {
    questionId: "capital",
    response: 2,
    mark: "right",
  });

  window.dispatchEvent(new Event("online"));

  await vi.waitFor(() => {
    expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saved" });
  });
});

test.each(["focus", "online"])(
  "a failed first load leaves the answers unchecked under a notice, and the store retries it on %s",
  async (event) => {
    const transport = seededTransport([earlierAttempt]);
    transport.forced.add("load fails");

    const store = openPage(transport);

    await vi.waitFor(() => {
      expect(store.answers.notices.loadFailed).toBe(true);
    });
    expect(store.answers.checked).toBe(false);
    transport.forced.delete("load fails");
    window.dispatchEvent(new Event(event));
    await checked(store);
    expect(store.answers.notices.loadFailed).toBe(false);
    expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
  },
);

test("signing out stops retrying and names every answer that was lost", async () => {
  const transport = seededTransport();
  const store = openPage(transport);
  await checked(store);
  transport.forced.add("save fails");
  await store.answers.save("capital", 2, "right");
  transport.forced.delete("save fails");
  transport.forced.add("signed out");

  await store.answers.save("river", 3, "wrong");
  await store.answers.save("bridge", 4, "right");

  expect(store.answers.notices).toMatchObject({
    signedOut: true,
    lostAnswers: ["capital", "river", "bridge"],
  });
  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "lost" });
  expect(store.answers.get("bridge")).toEqual({ response: 4, mark: "right", status: "lost" });
  transport.forced.delete("signed out");
  window.dispatchEvent(new Event("online"));
  document.dispatchEvent(new Event("visibilitychange"));
  expect(await savedAttempts(transport)).toEqual([]);
  expect(store.answers.get("capital")?.status).toBe("lost");
});

test("signing out before the first load leaves the answers unchecked under a notice", async () => {
  const transport = seededTransport([earlierAttempt]);
  transport.forced.add("signed out");

  const store = openPage(transport);

  await vi.waitFor(() => {
    expect(store.answers.notices.signedOut).toBe(true);
  });
  expect(store.answers.checked).toBe(false);
  expect(store.answers.notices.lostAnswers).toEqual([]);
});

test.each([
  ["returning to the tab", returnToTab],
  [
    "coming back from the back/forward cache",
    () => window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true })),
  ],
])("%s adds answers saved on another device, with a notice", async (_, comeBack) => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  await transport.save(artifactId, "first-attempt", {
    questionId: "capital",
    response: 1,
    mark: "wrong",
  });

  comeBack();

  await vi.waitFor(() => {
    expect(store.answers.get("capital")).toEqual({
      response: 1,
      mark: "wrong",
      status: "answered-elsewhere",
    });
  });
  expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
});

test("a refresh replaces an unsaved answer to a question answered elsewhere, with a notice", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  transport.forced.add("save fails");
  await store.answers.save("capital", 2, "right");
  transport.forced.delete("save fails");
  await transport.save(artifactId, "first-attempt", {
    questionId: "capital",
    response: 1,
    mark: "wrong",
  });

  returnToTab();

  await vi.waitFor(() => {
    expect(store.answers.get("capital")).toEqual({
      response: 1,
      mark: "wrong",
      status: "answered-elsewhere",
    });
  });
});

test("returning to the tab while the answers are loading asks the transport for them once", async () => {
  const transport = seededTransport([earlierAttempt]);
  let loads = 0;
  const store = openPage({
    ...transport,
    load(id) {
      loads += 1;
      return transport.load(id);
    },
  });
  await checked(store);

  returnToTab();
  returnToTab();
  window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  await nextChange(store);
  returnToTab();

  expect(loads).toBe(3);
});

test("a refresh switches to a newer attempt started on another device, with a notice", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  await transport.save(artifactId, "second-attempt", {
    questionId: "capital",
    response: 1,
    mark: "wrong",
  });

  returnToTab();

  await vi.waitFor(() => {
    expect(store.answers.notices.attemptSwitched).toBe(true);
  });
  expect(store.answers.get("capital")).toEqual({ response: 1, mark: "wrong", status: "saved" });
  expect(store.answers.get("river")).toBeUndefined();
});

test("an answer sent to an attempt another device has replaced joins that older attempt, and the next refresh switches", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  await transport.save(artifactId, "second-attempt", {
    questionId: "bridge",
    response: 4,
    mark: "right",
  });

  await store.answers.save("capital", 2, "right");

  expect(store.answers.get("capital")?.status).toBe("saved");
  const older = (await savedAttempts(transport)).find(({ id }) => id === "first-attempt");
  expect(older?.answers.map(({ questionId }) => questionId)).toEqual(["river", "capital"]);
  returnToTab();
  await vi.waitFor(() => {
    expect(store.answers.notices.attemptSwitched).toBe(true);
  });
  expect(store.answers.get("bridge")).toEqual({ response: 4, mark: "right", status: "saved" });
  expect(store.answers.get("capital")).toBeUndefined();
});

test("a refresh that finds a different content hash flags the artifact as updated", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  expect(store.answers.notices.artifactUpdated).toBe(false);
  transport.forced.add("artifact updated");

  returnToTab();

  await vi.waitFor(() => {
    expect(store.answers.notices.artifactUpdated).toBe(true);
  });
  expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
});

test("an unsaved answer doesn't outlive a reload", async () => {
  const transport = seededTransport();
  const store = openPage(transport);
  await checked(store);
  transport.forced.add("save fails");
  await store.answers.save("capital", 2, "right");

  const reloaded = openPage(transport);
  await checked(reloaded);

  expect(reloaded.answers.get("capital")).toBeUndefined();
});

test("a failed refresh keeps the answers shown, with no load-failed notice", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  transport.forced.add("load fails");

  const refreshed = nextChange(store);

  returnToTab();
  await refreshed;

  expect(store.answers.notices.loadFailed).toBe(false);
  expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
});
