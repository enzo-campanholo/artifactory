import type { ArtifactState, LibrarySummaries, SavedAnswer } from "./saved-state.ts";
import type { Answer } from "./scoring.ts";

export type LoadOutcome<State> =
  { outcome: "loaded"; state: State } | { outcome: "failed" | "signed out" };

type SaveOutcome =
  | { outcome: "saved" | "already answered"; answer: SavedAnswer }
  | { outcome: "failed" | "signed out" };

export interface Transport {
  load(artifactId: string): Promise<LoadOutcome<ArtifactState>>;
  save(artifactId: string, attemptId: string, answer: Answer): Promise<SaveOutcome>;
}

export interface LibraryTransport {
  load(): Promise<LoadOutcome<LibrarySummaries>>;
}

// Sent so that Cloudflare Access answers an expired session with 401 instead of a login redirect.
const headers = { "X-Requested-With": "XMLHttpRequest" };

async function loadOverHttp<State>(path: string): Promise<LoadOutcome<State>> {
  try {
    const response = await fetch(path, { headers });
    if (response.status === 401) return { outcome: "signed out" };
    if (!response.ok) return { outcome: "failed" };
    return { outcome: "loaded", state: (await response.json()) as State };
  } catch {
    return { outcome: "failed" };
  }
}

export function httpTransport(): Transport {
  const statePath = (artifactId: string) => `/api/state/${encodeURIComponent(artifactId)}`;
  return {
    load(artifactId) {
      return loadOverHttp<ArtifactState>(statePath(artifactId));
    },
    async save(artifactId, attemptId, { questionId, response, mark }) {
      try {
        const saved = await fetch(
          `${statePath(artifactId)}/attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`,
          {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ response, mark }),
          },
        );
        if (saved.status === 201) {
          return { outcome: "saved", answer: (await saved.json()) as SavedAnswer };
        }
        if (saved.status === 401) return { outcome: "signed out" };
        if (saved.status === 409) {
          // Without a saved answer, the 409 means the question isn't in the deployed manifest.
          const body = (await saved.json()) as SavedAnswer | { error: string };
          if ("answeredAt" in body) return { outcome: "already answered", answer: body };
        }
        return { outcome: "failed" };
      } catch {
        return { outcome: "failed" };
      }
    },
  };
}

export function httpLibraryTransport(): LibraryTransport {
  return {
    load() {
      return loadOverHttp<LibrarySummaries>("/api/library");
    },
  };
}
