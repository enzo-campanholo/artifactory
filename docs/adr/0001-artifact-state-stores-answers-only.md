# Artifact state stores answers only

Artifact state stores the owner's answers and nothing derived from them. Progress and scores are always calculated from those answers against the artifact's current version. So when an agent corrects an answer key, earlier attempts are rescored. When it adds a question, finished attempts reopen with that question unanswered. When it removes one, the question's answers are kept but ignored. We chose this over freezing each attempt's score as it was taken. Freezing would mean storing old answer keys or scores alongside every attempt, and it would keep marking the owner wrong on answers that a fix had shown to be right.

## Consequences

A past attempt's score can change after a revision. That is intended, not a bug.
