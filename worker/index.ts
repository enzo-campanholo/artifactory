import type { ArtifactState, LibrarySummaries } from "@artifactory/design-system/saved-state";
import {
  summarize,
  type Answer,
  type Json,
  type Summary,
} from "@artifactory/design-system/scoring";
import buildId from "build-id";
import manifest from "question-manifest";
import { hasValidAccessToken } from "./access.ts";
import { loadAttempts, loadLatestAttemptAnswers, saveAnswer } from "./artifact-state.ts";

const statePath = /^\/api\/state\/([^/]+)$/;
const answerPath = /^\/api\/state\/([^/]+)\/attempts\/([^/]+)\/answers\/([^/]+)$/;
const maxBodyBytes = 8 * 1024;

export default {
  async fetch(request, env) {
    if (!(await hasValidAccessToken(request, env))) {
      return error(401, "a valid Cloudflare Access token is required");
    }
    const { pathname } = new URL(request.url);
    if (pathname === "/api/library" && request.method === "GET") {
      return loadLibrary(env.DB);
    }
    const [, stateArtifactId] = statePath.exec(pathname) ?? [];
    if (stateArtifactId !== undefined && request.method === "GET") {
      return loadState(env.DB, stateArtifactId);
    }
    const [, artifactId, attemptId, questionId] = answerPath.exec(pathname) ?? [];
    if (
      artifactId !== undefined &&
      attemptId !== undefined &&
      questionId !== undefined &&
      request.method === "PUT"
    ) {
      return putAnswer(env.DB, request, artifactId, attemptId, questionId);
    }
    return error(404, "no such API route");
  },
} satisfies ExportedHandler<Cloudflare.Env>;

async function loadState(db: D1Database, artifactId: string): Promise<Response> {
  const artifact = manifestEntry(artifactId);
  if (artifact === undefined) return error(404, "unknown artifact");
  return Response.json({
    contentHash: artifact.contentHash,
    attempts: await loadAttempts(db, artifactId),
  } satisfies ArtifactState);
}

async function loadLibrary(db: D1Database): Promise<Response> {
  const summaries: Record<string, Summary> = {};
  for (const [artifactId, answers] of await loadLatestAttemptAnswers(db)) {
    const questions = manifestEntry(artifactId)?.questions ?? [];
    if (questions.length > 0) summaries[artifactId] = summarize(answers, questions);
  }
  return Response.json({ buildId, summaries } satisfies LibrarySummaries);
}

async function putAnswer(
  db: D1Database,
  request: Request,
  artifactId: string,
  attemptId: string,
  questionId: string,
): Promise<Response> {
  const artifact = manifestEntry(artifactId);
  if (artifact === undefined) return error(404, "unknown artifact");
  if (!artifact.questions.some(({ id }) => id === questionId)) {
    return error(409, "artifact changed");
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
    return error(413, `the answer is over ${String(maxBodyBytes / 1024)} KB of JSON`);
  }
  const answer = parseAnswer(questionId, body);
  if (answer === undefined) return error(400, "the body must be { response, mark }");
  const saved = await saveAnswer(db, artifactId, attemptId, answer);
  switch (saved.outcome) {
    case "saved":
      return Response.json(saved.answer, { status: 201 });
    case "already answered":
      return Response.json(saved.answer, { status: 409 });
    case "attempt belongs to another artifact":
      return error(400, saved.outcome);
  }
}

function manifestEntry(artifactId: string) {
  return Object.hasOwn(manifest, artifactId) ? manifest[artifactId] : undefined;
}

function parseAnswer(questionId: string, body: string): Answer | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || !("response" in parsed)) return undefined;
  if (!("mark" in parsed) || (parsed.mark !== "right" && parsed.mark !== "wrong")) return undefined;
  return { questionId, response: parsed.response as Json, mark: parsed.mark };
}

function error(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
