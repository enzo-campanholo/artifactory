import type { Answer, Json, Mark } from "@artifactory/design-system/scoring";
import type { SavedAnswer, SavedAttempt } from "@artifactory/design-system/saved-state";

interface AnswerRow {
  question_id: string;
  response: string;
  mark: Mark;
  answered_at: string;
}

type SaveOutcome =
  | { outcome: "saved" | "already answered"; answer: SavedAnswer }
  | { outcome: "attempt belongs to another artifact" };

export async function loadAttempts(db: D1Database, artifactId: string): Promise<SavedAttempt[]> {
  const { results } = await db
    .prepare(
      `SELECT attempts.id, attempts.started_at, question_id, response, mark, answered_at
       FROM attempts LEFT JOIN answers ON answers.attempt_id = attempts.id
       WHERE attempts.artifact_id = ?1
       ORDER BY attempts.started_at, attempts.rowid, answers.answered_at, answers.rowid`,
    )
    .bind(artifactId)
    .all<{ id: string; started_at: string } & (AnswerRow | Record<keyof AnswerRow, null>)>();
  const attempts = new Map<string, SavedAttempt>();
  for (const row of results) {
    const attempt = attempts.get(row.id) ?? { id: row.id, startedAt: row.started_at, answers: [] };
    if (row.question_id !== null) attempt.answers.push(savedAnswer(row));
    attempts.set(row.id, attempt);
  }
  return [...attempts.values()];
}

export async function loadLatestAttemptAnswers(
  db: D1Database,
): Promise<Map<string, SavedAnswer[]>> {
  // Ties on `started_at` go to the attempt saved first, as in the browser's latest-attempt rule.
  const { results } = await db
    .prepare(
      `WITH ranked AS (
         SELECT id, artifact_id,
           ROW_NUMBER() OVER (PARTITION BY artifact_id ORDER BY started_at DESC, rowid) AS rank
         FROM attempts
       )
       SELECT artifact_id, question_id, response, mark, answered_at
       FROM ranked JOIN answers ON answers.attempt_id = ranked.id
       WHERE rank = 1`,
    )
    .all<{ artifact_id: string } & AnswerRow>();
  const latest = new Map<string, SavedAnswer[]>();
  for (const row of results) {
    latest.set(row.artifact_id, [...(latest.get(row.artifact_id) ?? []), savedAnswer(row)]);
  }
  return latest;
}

export async function saveAnswer(
  db: D1Database,
  artifactId: string,
  attemptId: string,
  answer: Answer,
): Promise<SaveOutcome> {
  const answeredAt = new Date().toISOString();
  try {
    const [, insertedAnswer] = await db.batch([
      db
        .prepare(
          `INSERT INTO attempts (id, artifact_id, started_at) VALUES (?1, ?2, ?3)
           ON CONFLICT (id) DO NOTHING`,
        )
        .bind(attemptId, artifactId, answeredAt),
      db
        .prepare(
          `INSERT INTO answers (attempt_id, question_id, response, mark, answered_at)
           SELECT id, ?2, ?3, ?4, ?5 FROM attempts WHERE id = ?1 AND artifact_id = ?6`,
        )
        .bind(
          attemptId,
          answer.questionId,
          JSON.stringify(answer.response),
          answer.mark,
          answeredAt,
          artifactId,
        ),
    ]);
    return insertedAnswer?.meta.changes === 0
      ? { outcome: "attempt belongs to another artifact" }
      : { outcome: "saved", answer: { ...answer, answeredAt } };
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("UNIQUE constraint failed")))
      throw error;
    const saved = await db
      .prepare(
        `SELECT question_id, response, mark, answered_at FROM answers
         WHERE attempt_id = ?1 AND question_id = ?2`,
      )
      .bind(attemptId, answer.questionId)
      .first<AnswerRow>();
    if (saved === null) throw error;
    return { outcome: "already answered", answer: savedAnswer(saved) };
  }
}

function savedAnswer(row: AnswerRow): SavedAnswer {
  return {
    questionId: row.question_id,
    response: JSON.parse(row.response) as Json,
    mark: row.mark,
    answeredAt: row.answered_at,
  };
}
