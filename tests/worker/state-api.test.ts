import type { SavedAnswer } from "@artifactory/design-system/saved-state";
import { env } from "cloudflare:workers";
import { describe, expect, test } from "vitest";
import { apiRequest, putAnswer, useFreshDatabase } from "./requests.ts";

useFreshDatabase();

const attemptId = "6f9a2c84-1d3e-4b57-9a0c-2e8f71d4b6a3";
const isoTime = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

async function saveAnswer(
  artifactId: string,
  attempt: string,
  questionId: string,
  answer: object,
): Promise<SavedAnswer> {
  return (await putAnswer(artifactId, attempt, questionId, answer)).json<SavedAnswer>();
}

describe("saving an answer", () => {
  test("the first answer to a question is saved, and a later one gets the saved answer back", async () => {
    const first = await putAnswer("orbits01", attemptId, "orbit-period", {
      response: 2,
      mark: "right",
    });
    expect(first.status).toBe(201);
    const saved = await first.json<SavedAnswer>();
    expect(saved).toEqual({
      questionId: "orbit-period",
      response: 2,
      mark: "right",
      answeredAt: saved.answeredAt,
    });
    expect(saved.answeredAt).toMatch(isoTime);

    const later = await putAnswer("orbits01", attemptId, "orbit-period", {
      response: 1,
      mark: "wrong",
    });
    expect(later.status).toBe(409);
    expect(await later.json()).toEqual(saved);
  });

  test("a retried answer gets its own saved answer back", async () => {
    const answer = { response: "Tides come from the Moon's pull.", mark: "right" };
    const saved = await saveAnswer("orbits01", attemptId, "explain-tides", answer);

    const retry = await putAnswer("orbits01", attemptId, "explain-tides", answer);

    expect(retry.status).toBe(409);
    expect(await retry.json()).toEqual(saved);
    expect(saved).toMatchObject({ questionId: "explain-tides", ...answer });
  });

  test("an artifact ID that isn't in the question manifest is not found", async () => {
    const response = await putAnswer("missing9", attemptId, "orbit-period", {
      response: 2,
      mark: "right",
    });

    expect(response.status).toBe(404);
  });

  test("a question ID that isn't in the artifact's question manifest means the artifact changed", async () => {
    const response = await putAnswer("orbits01", attemptId, "first-law", {
      response: 0,
      mark: "right",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "artifact changed" });
  });

  test("an attempt that belongs to another artifact is rejected", async () => {
    await putAnswer("orbits01", attemptId, "orbit-period", { response: 2, mark: "right" });

    const response = await putAnswer("newton02", attemptId, "first-law", {
      response: 0,
      mark: "right",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "attempt belongs to another artifact" });
  });

  test("a response of up to about 8 KB of JSON is saved, and a larger one is rejected", async () => {
    const fits = await putAnswer("orbits01", attemptId, "explain-tides", {
      response: "a".repeat(7_900),
      mark: "right",
    });
    const tooLarge = await putAnswer("orbits01", crypto.randomUUID(), "explain-tides", {
      response: "a".repeat(8_300),
      mark: "right",
    });

    expect(fits.status).toBe(201);
    expect(tooLarge.status).toBe(413);
  });

  test.each([
    ["a mark that isn't right or wrong", { response: 2, mark: "maybe" }],
    ["no mark", { response: 2 }],
    ["no response", { mark: "right" }],
    ["a body that isn't an object", [2, "right"]],
  ])("an answer with %s is rejected", async (_case, body) => {
    const response = await putAnswer("orbits01", attemptId, "orbit-period", body);

    expect(response.status).toBe(400);
  });

  test("a body that isn't JSON is rejected", async () => {
    const response = await apiRequest(
      "PUT",
      `/api/state/orbits01/attempts/${attemptId}/answers/orbit-period`,
      { body: "response=2&mark=right" },
    );

    expect(response.status).toBe(400);
  });

  test("an answer that fails to save leaves no attempt behind", async () => {
    await env.DB.exec(
      "CREATE TRIGGER answers_fail BEFORE INSERT ON answers BEGIN SELECT RAISE(ABORT, 'disk full'); END",
    );

    const saving = putAnswer("orbits01", attemptId, "orbit-period", { response: 2, mark: "right" });

    await expect(saving).rejects.toThrow("disk full");
    await env.DB.exec("DROP TRIGGER answers_fail");
    expect(await (await apiRequest("GET", "/api/state/orbits01")).json()).toEqual({
      contentHash: "5f1c0d2a9b7e4c13",
      attempts: [],
    });
  });
});

describe("loading an artifact's state", () => {
  test("every attempt comes back with its answers and the artifact's content hash", async () => {
    const firstAttempt = crypto.randomUUID();
    const secondAttempt = crypto.randomUUID();
    const periodFirst = await saveAnswer("orbits01", firstAttempt, "orbit-period", {
      response: 1,
      mark: "wrong",
    });
    const tidesFirst = await saveAnswer("orbits01", firstAttempt, "explain-tides", {
      response: "Wind.",
      mark: "wrong",
    });
    const periodSecond = await saveAnswer("orbits01", secondAttempt, "orbit-period", {
      response: 2,
      mark: "right",
    });
    await saveAnswer("newton02", crypto.randomUUID(), "first-law", { response: 0, mark: "right" });

    const response = await apiRequest("GET", "/api/state/orbits01");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contentHash: "5f1c0d2a9b7e4c13",
      attempts: [
        { id: firstAttempt, startedAt: periodFirst.answeredAt, answers: [periodFirst, tidesFirst] },
        { id: secondAttempt, startedAt: periodSecond.answeredAt, answers: [periodSecond] },
      ],
    });
  });

  test("an artifact without saved answers, even one without questions, has no attempts", async () => {
    const response = await apiRequest("GET", "/api/state/noquest3");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contentHash: "0b9e44c1d7a2f650", attempts: [] });
  });

  test("an artifact ID that isn't in the question manifest is not found", async () => {
    const response = await apiRequest("GET", "/api/state/missing9");

    expect(response.status).toBe(404);
  });
});
