// @vitest-environment happy-dom
import { expect, test, vi } from "vitest";
import {
  artifactId,
  capital,
  earlierAttempt,
  checked,
  nextChange,
  openPage,
  returnToTab,
  savedAttempts,
  seededTransport,
} from "./seeded-page.ts";

test("the page opens on the attempt whose first answer is most recent, not the one answered last", async () => {
  const transport = seededTransport([
    {
      id: "evening-attempt",
      startedAt: "2026-10-02T18:00:00.000Z",
      answers: [
        { questionId: "river", response: 1, mark: "right", answeredAt: "2026-10-02T18:00:00.000Z" },
      ],
    },
    {
      id: "morning-attempt",
      startedAt: "2026-10-02T08:00:00.000Z",
      answers: [
        {
          questionId: "capital",
          response: 2,
          mark: "right",
          answeredAt: "2026-10-02T08:00:00.000Z",
        },
        {
          questionId: "bridge",
          response: 4,
          mark: "wrong",
          answeredAt: "2026-10-03T20:00:00.000Z",
        },
      ],
    },
  ]);

  const store = openPage(transport);
  await checked(store);

  expect(store.answers.get("river")).toEqual({ response: 1, mark: "right", status: "saved" });
  expect(store.answers.get("capital")).toBeUndefined();
  expect(store.answers.get("bridge")).toBeUndefined();
});

test("Start over clears the answers and saves nothing until the new attempt's first answer", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);

  store.answers.startOver();

  expect(store.answers.get("river")).toBeUndefined();
  expect(await savedAttempts(transport)).toEqual([earlierAttempt]);
  await store.answers.save("river", 1, "right");
  const attempts = await savedAttempts(transport);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(earlierAttempt);
  expect(attempts[1]?.id).not.toBe(earlierAttempt.id);
  expect(attempts[1]?.answers).toMatchObject([{ questionId: "river", response: 1, mark: "right" }]);
});

test("leaving without answering after Start over reopens on the earlier attempt", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  store.answers.startOver();

  const reopened = openPage(transport);
  await checked(reopened);

  expect(await savedAttempts(transport)).toEqual([earlierAttempt]);
  expect(reopened.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
});

test("returning to the tab after Start over stays on the new attempt, before and after its first answer", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  store.answers.startOver();

  returnToTab();
  await nextChange(store);

  expect(store.answers.get("river")).toBeUndefined();
  await store.answers.save("capital", 2, "right");
  returnToTab();
  await nextChange(store);
  expect(store.answers.get("river")).toBeUndefined();
  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saved" });
  expect(store.answers.notices.attemptSwitched).toBe(false);
});

test("an answer that failed to save before Start over is still retried into its own attempt", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  transport.forced.add("save fails");
  await store.answers.save("capital", 2, "right");
  store.answers.startOver();
  transport.forced.delete("save fails");

  window.dispatchEvent(new Event("online"));

  await vi.waitFor(async () => {
    const [earlier] = await savedAttempts(transport);
    expect(earlier?.answers.map(({ questionId }) => questionId)).toEqual(["river", "capital"]);
  });
  expect(store.answers.get("capital")).toBeUndefined();
});

test("Undo after Start over brings back the earlier attempt, and its next answer saves into it", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  store.answers.startOver();
  expect(store.answers.notices.startedOver).toBe(true);

  store.answers.undoStartOver();

  expect(store.answers.notices.startedOver).toBe(false);
  expect(store.answers.get("river")).toEqual({ response: 3, mark: "wrong", status: "saved" });
  expect(store.answers.attempts).toMatchObject([{ id: earlierAttempt.id, shown: true }]);
  await store.answers.save("capital", 2, "right");
  expect(await savedAttempts(transport)).toMatchObject([
    { id: earlierAttempt.id, answers: [{ questionId: "river" }, { questionId: "capital" }] },
  ]);
});

test("Undo after Start over keeps an answer that hadn't saved yet, and it still saves into the earlier attempt", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  transport.forced.add("save fails");
  await store.answers.save("capital", 2, "right");
  store.answers.startOver();

  store.answers.undoStartOver();

  expect(store.answers.get("capital")?.status).toBe("not-saved");
  transport.forced.delete("save fails");
  window.dispatchEvent(new Event("online"));
  await vi.waitFor(() => {
    expect(store.answers.get("capital")?.status).toBe("saved");
  });
  const [earlier] = await savedAttempts(transport);
  expect(earlier?.answers.map(({ questionId }) => questionId)).toEqual(["river", "capital"]);
});

test("the owner's next answer after Start over puts away its Undo, which then does nothing", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  store.answers.startOver();

  await store.answers.save("capital", 2, "right");
  store.answers.undoStartOver();

  expect(store.answers.notices.startedOver).toBe(false);
  expect(store.answers.get("river")).toBeUndefined();
  expect(store.answers.get("capital")).toEqual({ response: 2, mark: "right", status: "saved" });
});

test("a switch to another device's attempt after Start over puts away its Undo", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  store.answers.startOver();
  await transport.save(artifactId, "second-attempt", {
    questionId: "capital",
    response: 1,
    mark: "wrong",
  });

  returnToTab();
  await nextChange(store);

  expect(store.answers.notices).toMatchObject({ attemptSwitched: true, startedOver: false });
});

test("a refresh switches to another device's newer attempt even while your attempt's first answer isn't saved", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  store.answers.startOver();
  transport.forced.add("save fails");
  await store.answers.save("river", 1, "right");
  transport.forced.delete("save fails");
  await transport.save(artifactId, "second-attempt", {
    questionId: "capital",
    response: 1,
    mark: "wrong",
  });

  returnToTab();
  await nextChange(store);

  expect(store.answers.notices.attemptSwitched).toBe(true);
  expect(store.answers.get("capital")).toEqual({ response: 1, mark: "wrong", status: "saved" });
});

test("the page lists every saved attempt, and the new one from its first answer", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  store.answers.startOver();

  expect(store.answers.attempts).toEqual([{ ...earlierAttempt, shown: false, finished: false }]);
  await store.answers.save("capital", 2, "right");

  expect(store.answers.attempts).toMatchObject([
    { ...earlierAttempt, shown: false },
    { answers: [{ questionId: "capital", response: 2, mark: "right" }], shown: true },
  ]);
});

test("a refresh that finds the first answer of your attempt before its save is confirmed doesn't undo a later Start over", async () => {
  const transport = seededTransport([earlierAttempt]);
  let confirm: () => void = () => undefined;
  const store = openPage({
    ...transport,
    async save(id, attemptId, answer) {
      const outcome = await transport.save(id, attemptId, answer);
      await new Promise<void>((resolve) => (confirm = resolve));
      return outcome;
    },
  });
  await checked(store);
  store.answers.startOver();
  const saving = store.answers.save("capital", 2, "right");
  await vi.waitFor(async () => {
    expect(await savedAttempts(transport)).toHaveLength(2);
  });

  store.answers.startOver();
  returnToTab();
  await nextChange(store);
  confirm();
  await saving;

  expect(store.answers.get("capital")).toBeUndefined();
  expect(store.answers.notices.attemptSwitched).toBe(false);
});

test("Start over puts away the notice of a switch to another device's attempt", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  await transport.save(artifactId, "second-attempt", {
    questionId: "capital",
    response: 1,
    mark: "wrong",
  });
  returnToTab();
  await nextChange(store);
  expect(store.answers.notices.attemptSwitched).toBe(true);

  store.answers.startOver();

  expect(store.answers.notices.attemptSwitched).toBe(false);
});

test("the owner's next answer puts away the notice of a switch to another device's attempt", async () => {
  const transport = seededTransport([earlierAttempt]);
  const store = openPage(transport);
  await checked(store);
  await transport.save(artifactId, "second-attempt", {
    questionId: "capital",
    response: 1,
    mark: "wrong",
  });
  returnToTab();
  await nextChange(store);
  expect(store.answers.notices.attemptSwitched).toBe(true);

  await store.answers.save("river", 1, "right");

  expect(store.answers.notices.attemptSwitched).toBe(false);
});

test("an answer confirmed while a refresh is loading stays listed in its attempt", async () => {
  const transport = seededTransport([earlierAttempt]);
  let release: () => void = () => undefined;
  let holdLoads = false;
  const store = openPage({
    ...transport,
    async load(id) {
      const outcome = await transport.load(id);
      if (holdLoads) await new Promise<void>((resolve) => (release = resolve));
      return outcome;
    },
  });
  await checked(store);
  holdLoads = true;
  returnToTab();

  await store.answers.save("capital", 2, "right");
  const refreshed = nextChange(store);
  release();
  await refreshed;

  expect(store.answers.attempts).toMatchObject([
    { id: earlierAttempt.id, answers: [{ questionId: "river" }, { questionId: "capital" }] },
  ]);
});

const answeredAt = "2026-10-01T10:00:00.000Z";

test("the page's questions are numbered in page order, from 1", () => {
  const store = openPage(seededTransport());

  expect(store.answers.questions).toEqual([
    { id: "capital", kind: "single-choice", key: 2, number: 1 },
    { id: "river", kind: "single-choice", key: 1, number: 2 },
    { id: "bridge", kind: "single-choice", key: 4, number: 3 },
  ]);
});

test("an attempt without answers stops at question 1, with nothing to revisit", async () => {
  const store = openPage(seededTransport());
  await checked(store);

  expect(store.answers.shownAttempt).toMatchObject({
    progress: { answered: 0, total: 3 },
    score: 0,
    toRevisit: [],
    stoppingPoint: { id: "capital", number: 1 },
  });
});

test.each([
  [["capital"], "river"],
  [["river"], "bridge"],
  [["capital", "bridge"], "river"],
])(
  "with %j answered, the stopping point is the first unanswered question after the last one answered, wrapping to the first: %s",
  async (answered, stoppingPoint) => {
    const store = openPage(seededTransport());
    await checked(store);

    for (const questionId of answered) await store.answers.save(questionId, 0, "wrong");

    expect(store.answers.shownAttempt.stoppingPoint?.id).toBe(stoppingPoint);
  },
);

test("an attempt with every question answered has no stopping point", async () => {
  const store = openPage(
    seededTransport([
      {
        id: "first-attempt",
        startedAt: answeredAt,
        answers: [
          { questionId: "capital", response: 2, mark: "right", answeredAt },
          { questionId: "river", response: 3, mark: "wrong", answeredAt },
          { questionId: "bridge", response: 4, mark: "right", answeredAt },
        ],
      },
    ]),
  );
  await checked(store);

  expect(store.answers.shownAttempt).toMatchObject({
    progress: { answered: 3, total: 3 },
    score: 2,
    toRevisit: [{ id: "river", number: 2 }],
  });
  expect(store.answers.shownAttempt.stoppingPoint).toBeUndefined();
});

test("an answer marked wrong is listed to revisit only once it's saved, and the score counts only saved answers", async () => {
  const transport = seededTransport();
  const store = openPage(transport);
  await checked(store);
  const toRevisit = () => store.answers.shownAttempt.toRevisit.map(({ id }) => id);

  const saving = store.answers.save("capital", 1, "wrong");
  expect(toRevisit()).toEqual([]);
  await saving;
  expect(toRevisit()).toEqual(["capital"]);

  transport.forced.add("save fails");
  await store.answers.save("river", 3, "wrong");
  await store.answers.save("bridge", 4, "right");
  expect(store.answers.get("river")?.status).toBe("not-saved");
  transport.forced.delete("save fails");
  transport.forced.add("signed out");
  window.dispatchEvent(new Event("online"));
  await vi.waitFor(() => {
    expect(store.answers.get("river")?.status).toBe("lost");
  });

  expect(toRevisit()).toEqual(["capital"]);
  expect(store.answers.shownAttempt).toMatchObject({
    progress: { answered: 3, total: 3 },
    score: 0,
  });
});

test("an answer given first on another device is listed to revisit when it's wrong", async () => {
  const transport = seededTransport();
  const store = openPage(transport, [capital, { id: "tides", kind: "open-question" }]);
  await checked(store);
  transport.forced.add("answered elsewhere");

  await store.answers.save("tides", "The Moon.", "right");

  expect(store.answers.get("tides")?.status).toBe("answered-elsewhere");
  expect(store.answers.shownAttempt.toRevisit).toMatchObject([{ id: "tides", number: 2 }]);
});
