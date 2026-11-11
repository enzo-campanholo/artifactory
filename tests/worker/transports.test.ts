import { httpLibraryTransport, httpTransport } from "@artifactory/design-system/http-transports";
import type { SavedAnswer } from "@artifactory/design-system/saved-state";
import type { Answer } from "@artifactory/design-system/scoring";
import { exports } from "cloudflare:workers";
import { afterEach, describe, expect, test, vi } from "vitest";
import { accessToken, useFreshDatabase } from "./requests.ts";

useFreshDatabase();

const workerFetch = globalThis.fetch;

// The transports fetch same-origin paths, as on the deployed site. Only those go to the Worker
// under test: its own request for Access's keys shares this global fetch.
async function routeFetchToWorker({ signedIn }: { signedIn: boolean }): Promise<void> {
  const assertion = signedIn ? await accessToken() : null;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input !== "string" || !input.startsWith("/")) return workerFetch(input, init);
    const headers = new Headers(init?.headers);
    if (assertion !== null) headers.set("Cf-Access-Jwt-Assertion", assertion);
    return exports.default.fetch(
      new Request(`https://artifactory.test${input}`, { ...init, headers }),
    );
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const attemptId = "6f9a2c84-1d3e-4b57-9a0c-2e8f71d4b6a3";
const rightPeriod: Answer = { questionId: "orbit-period", response: 2, mark: "right" };

async function savedAnswer(answer: Answer): Promise<SavedAnswer> {
  const saving = await httpTransport().save("orbits01", attemptId, answer);
  if (saving.outcome !== "saved") throw new Error(`The answer came back ${saving.outcome}`);
  return saving.answer;
}

describe("loading an artifact's state", () => {
  test("a load is loaded, with the answers saved before it", async () => {
    await routeFetchToWorker({ signedIn: true });
    const saved = await savedAnswer(rightPeriod);

    expect(await httpTransport().load("orbits01")).toEqual({
      outcome: "loaded",
      state: {
        contentHash: "5f1c0d2a9b7e4c13",
        attempts: [{ id: attemptId, startedAt: saved.answeredAt, answers: [saved] }],
      },
    });
  });

  test("a load without an Access token is signed out", async () => {
    await routeFetchToWorker({ signedIn: false });

    expect(await httpTransport().load("orbits01")).toEqual({ outcome: "signed out" });
  });

  test("a load of an artifact the question manifest doesn't have fails", async () => {
    await routeFetchToWorker({ signedIn: true });

    expect(await httpTransport().load("missing9")).toEqual({ outcome: "failed" });
  });
});

describe("saving an answer", () => {
  test("a first answer is saved", async () => {
    await routeFetchToWorker({ signedIn: true });

    expect(await httpTransport().save("orbits01", attemptId, rightPeriod)).toMatchObject({
      outcome: "saved",
      answer: rightPeriod,
    });
  });

  test("an answer to a question the attempt already answered gets the first answer back", async () => {
    await routeFetchToWorker({ signedIn: true });
    const first = await savedAnswer(rightPeriod);

    expect(
      await httpTransport().save("orbits01", attemptId, {
        questionId: "orbit-period",
        response: 1,
        mark: "wrong",
      }),
    ).toEqual({ outcome: "already answered", answer: first });
  });

  test("a save without an Access token is signed out", async () => {
    await routeFetchToWorker({ signedIn: false });

    expect(await httpTransport().save("orbits01", attemptId, rightPeriod)).toEqual({
      outcome: "signed out",
    });
  });

  test("a save to a question the artifact's question manifest doesn't have fails", async () => {
    await routeFetchToWorker({ signedIn: true });

    expect(
      await httpTransport().save("orbits01", attemptId, {
        questionId: "first-law",
        response: 0,
        mark: "right",
      }),
    ).toEqual({ outcome: "failed" });
  });
});

describe("loading the Library", () => {
  test("a load is loaded, with the latest attempt's summary and the build ID", async () => {
    await routeFetchToWorker({ signedIn: true });
    await savedAnswer(rightPeriod);

    expect(await httpLibraryTransport().load()).toEqual({
      outcome: "loaded",
      state: {
        buildId: "3e8b1f60-9a2d-4c75-b0e4-6d1f2a9c8b57",
        summaries: {
          orbits01: {
            marks: { "orbit-period": "right" },
            progress: { answered: 1, total: 2 },
            score: 1,
            finished: false,
          },
        },
      },
    });
  });

  test("a load without an Access token is signed out", async () => {
    await routeFetchToWorker({ signedIn: false });

    expect(await httpLibraryTransport().load()).toEqual({ outcome: "signed out" });
  });
});
