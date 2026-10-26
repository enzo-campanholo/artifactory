CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  started_at TEXT NOT NULL
);

CREATE INDEX attempts_by_artifact ON attempts (artifact_id, started_at);

CREATE TABLE answers (
  attempt_id TEXT NOT NULL REFERENCES attempts (id),
  question_id TEXT NOT NULL,
  response TEXT NOT NULL,
  mark TEXT NOT NULL CHECK (mark IN ('right', 'wrong')),
  answered_at TEXT NOT NULL,
  PRIMARY KEY (attempt_id, question_id)
);
