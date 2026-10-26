import type { Answer, Question, Summary } from "./scoring.ts";

export interface SavedAnswer extends Answer {
  answeredAt: string;
}

export interface SavedAttempt {
  id: string;
  startedAt: string;
  answers: SavedAnswer[];
}

export interface ArtifactState {
  contentHash: string;
  attempts: SavedAttempt[];
}

export interface LibrarySummaries {
  buildId: string;
  summaries: Record<string, Summary>;
}

export type QuestionManifest = Record<string, { contentHash: string; questions: Question[] }>;
