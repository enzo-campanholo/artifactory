import { httpLibraryTransport, httpTransport } from "@artifactory/design-system/http-transports";
import { exports } from "cloudflare:workers";
import { afterEach, describe, expect, test, vi } from "vitest";
import { accessToken, useFreshDatabase } from "./requests.ts";

useFreshDatabase();

const workerFetch = globalThis.fetch;

// The transports fetch same-origin paths, as on the deployed site, so only those reach the Worker under test.
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
const isoTime = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

describe("loading an artifact's state", () => {
  test("a load is loaded, with the attempts and answers saved before it", async () => {
    await routeFetchToWorker({ signedIn: true });
    const transport = httpTransport();
    const period = await transport.save("orbits01", attemptId, {
      questionId: "orbit-period",
      response: 1,
      mark: "wrong",
    });
    const tides = await transport.save("orbits01", attemptId, {
      questionId: "explain-tides",
      response: "The Moon's pull.",
      mark: "right",
    });
    if (period.outcome !== "saved" || tides.outcome !== "saved") {
      throw new Error("The answers before the load weren't saved");
    }

    expect(await transport.load("orbits01")).toEqual({
      outcome: "loaded",
      state: {
        contentHash: "5f1c0d2a9b7e4c13",
        attempts: [
          {
            id: attemptId,
            startedAt: period.answer.answeredAt,
            answers: [period.answer, tides.answer],
          },
        ],
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
  test("a first answer is saved, and comes back with the time it was answered", async () => {
    await routeFetchToWorker({ signedIn: true });

    const saving = await httpTransport().save("orbits01", attemptId, {
      questionId: "orbit-period",
      response: 2,
      mark: "right",
    });

    const answeredAt = "answer" in saving ? saving.answer.answeredAt : "";
    expect(saving).toEqual({
      outcome: "saved",
      answer: { questionId: "orbit-period", response: 2, mark: "right", answeredAt },
    });
    expect(answeredAt).toMatch(isoTime);
  });

  test("an answer to a question the attempt already answered gets the first answer back", async () => {
    await routeFetchToWorker({ signedIn: true });
    const transport = httpTransport();
    const first = await transport.save("orbits01", attemptId, {
      questionId: "orbit-period",
      response: 2,
      mark: "right",
    });
    if (first.outcome !== "saved") throw new Error("The first answer wasn't saved");

    expect(
      await transport.save("orbits01", attemptId, {
        questionId: "orbit-period",
        response: 1,
        mark: "wrong",
      }),
    ).toEqual({ outcome: "already answered", answer: first.answer });
  });

  test("a save without an Access token is signed out", async () => {
    await routeFetchToWorker({ signedIn: false });

    expect(
      await httpTransport().save("orbits01", attemptId, {
        questionId: "orbit-period",
        response: 2,
        mark: "right",
      }),
    ).toEqual({ outcome: "signed out" });
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
  test("a load is loaded, with the latest attempts' summaries and the build ID", async () => {
    await routeFetchToWorker({ signedIn: true });
    const transport = httpTransport();
    await transport.save("orbits01", attemptId, {
      questionId: "orbit-period",
      response: 2,
      mark: "right",
    });
    await transport.save("newton02", crypto.randomUUID(), {
      questionId: "first-law",
      response: 1,
      mark: "wrong",
    });

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
          newton02: {
            marks: { "first-law": "wrong" },
            progress: { answered: 1, total: 1 },
            score: 0,
            finished: true,
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
