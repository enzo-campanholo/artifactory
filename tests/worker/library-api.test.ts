import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { apiRequest, putAnswer, useFreshDatabase } from "./requests.ts";

useFreshDatabase();

async function seedAttempt(
  artifactId: string,
  attemptId: string,
  startedAt: string,
  answers: { questionId: string; response: unknown; mark: "right" | "wrong"; answeredAt: string }[],
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("INSERT INTO attempts (id, artifact_id, started_at) VALUES (?1, ?2, ?3)").bind(
      attemptId,
      artifactId,
      startedAt,
    ),
    ...answers.map(({ questionId, response, mark, answeredAt }) =>
      env.DB.prepare(
        `INSERT INTO answers (attempt_id, question_id, response, mark, answered_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      ).bind(attemptId, questionId, JSON.stringify(response), mark, answeredAt),
    ),
  ]);
}

async function library(): Promise<unknown> {
  const response = await apiRequest("GET", "/api/library");
  expect(response.status).toBe(200);
  return response.json();
}

test("the Library gets the build ID stamped into the Worker", async () => {
  expect(await library()).toMatchObject({ buildId: "3e8b1f60-9a2d-4c75-b0e4-6d1f2a9c8b57" });
});

test("an artifact's status is the summary of its latest attempt, the one whose first answer is most recent", async () => {
  await seedAttempt("orbits01", "second-attempt", "2026-10-02T09:00:00.000Z", [
    {
      questionId: "orbit-period",
      response: 2,
      mark: "right",
      answeredAt: "2026-10-02T09:00:00.000Z",
    },
    {
      questionId: "explain-tides",
      response: "The Moon's pull.",
      mark: "wrong",
      answeredAt: "2026-10-02T09:05:00.000Z",
    },
  ]);
  await seedAttempt("orbits01", "first-attempt", "2026-10-01T09:00:00.000Z", [
    {
      questionId: "orbit-period",
      response: 1,
      mark: "wrong",
      answeredAt: "2026-10-01T09:00:00.000Z",
    },
    {
      questionId: "explain-tides",
      response: "Wind.",
      mark: "wrong",
      answeredAt: "2026-10-03T09:00:00.000Z",
    },
  ]);

  expect(await library()).toEqual({
    buildId: "3e8b1f60-9a2d-4c75-b0e4-6d1f2a9c8b57",
    summaries: {
      orbits01: {
        marks: { "orbit-period": "right", "explain-tides": "wrong" },
        progress: { answered: 2, total: 2 },
        score: 1,
        finished: true,
      },
    },
  });
});

test("every started artifact in the question manifest gets a status, so drafts do too", async () => {
  await putAnswer("newton02", crypto.randomUUID(), "first-law", { response: 0, mark: "right" });

  expect(await library()).toEqual({
    buildId: "3e8b1f60-9a2d-4c75-b0e4-6d1f2a9c8b57",
    summaries: {
      newton02: {
        marks: { "first-law": "right" },
        progress: { answered: 1, total: 1 },
        score: 1,
        finished: true,
      },
    },
  });
});

test("artifacts without questions, or no longer in the question manifest, are left out", async () => {
  await seedAttempt("noquest3", "before-questions-removed", "2026-10-01T09:00:00.000Z", [
    {
      questionId: "old-question",
      response: 1,
      mark: "right",
      answeredAt: "2026-10-01T09:00:00.000Z",
    },
  ]);
  await seedAttempt("deleted4", "before-deletion", "2026-10-01T09:00:00.000Z", [
    {
      questionId: "old-question",
      response: 1,
      mark: "right",
      answeredAt: "2026-10-01T09:00:00.000Z",
    },
  ]);

  expect(await library()).toEqual({
    buildId: "3e8b1f60-9a2d-4c75-b0e4-6d1f2a9c8b57",
    summaries: {},
  });
});
