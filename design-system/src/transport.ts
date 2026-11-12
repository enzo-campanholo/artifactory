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
