import { expect, vi } from "vitest";
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
import type { Question } from "@artifactory/design-system/scoring";
import {
  memoryTransport,
  startStore,
  type MemoryTransport,
  type Store,
  type Transport,
} from "@artifactory/design-system/state";

export const artifactId = "abcd1234";
const contentHash = "4f1e9c0d2b7a6e35";

export function seededTransport(attempts: SavedAttempt[] = []): MemoryTransport {
  return memoryTransport({ contentHash, attempts });
}

export const capital: Question = { id: "capital", kind: "single-choice", key: 2 };
export const river: Question = { id: "river", kind: "single-choice", key: 1 };
const bridge: Question = { id: "bridge", kind: "single-choice", key: 4 };

export function openPage(
  transport: Transport,
  questions: Question[] = [capital, river, bridge],
  startFrom: SavedAttempt[] = [],
): Store {
  return startStore({ artifactId, contentHash, questions, transport, startFrom });
}

// The check takes the server's state when the page asks for it, and returns it on release().
export function heldCheck(transport: MemoryTransport) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const held: Transport = {
    load(id) {
      const loading = transport.load(id);
      return released.then(() => loading);
    },
    save: (id, attemptId, answer) => transport.save(id, attemptId, answer),
  };
  return { held, release };
}

export const neverChecked: Transport = {
  load: () => new Promise<never>(() => undefined),
  save: () => new Promise<never>(() => undefined),
};

export async function savedAttempts(transport: MemoryTransport): Promise<SavedAttempt[]> {
  const loading = await transport.load(artifactId);
  if (loading.outcome !== "loaded") throw new Error(`the transport's load ${loading.outcome}`);
  return loading.state.attempts;
}

export const earlierAttempt = {
  id: "first-attempt",
  startedAt: "2020-10-01T10:00:00.000Z",
  answers: [
    { questionId: "river", response: 3, mark: "wrong", answeredAt: "2020-10-01T10:00:00.000Z" },
  ],
} satisfies SavedAttempt;

export function returnToTab() {
  document.dispatchEvent(new Event("visibilitychange"));
}

export function nextChange(store: Store): Promise<void> {
  return new Promise((resolve) => {
    const stop = store.answers.subscribe(() => {
      stop();
      resolve();
    });
  });
}

export async function checked(store: Store) {
  await vi.waitFor(() => {
    expect(store.answers.checked).toBe(true);
  });
}
