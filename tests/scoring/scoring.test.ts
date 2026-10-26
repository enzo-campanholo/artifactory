import { check, summarize, type Question } from "@artifactory/design-system/scoring";
import { describe, expect, test } from "vitest";

const capital: Question = { id: "capital", kind: "single-choice", key: 2 };
const river: Question = { id: "river", kind: "single-choice", key: 1 };
const mountain: Question = { id: "mountain", kind: "single-choice", key: 3 };

describe("single choice", () => {
  test("the option the key names is right and any other option is wrong", () => {
    expect(check("single-choice", 2, 2)).toBe("right");
    expect(check("single-choice", 1, 2)).toBe("wrong");
    expect(check("single-choice", 3, 2)).toBe("wrong");
  });
});

describe("summarize", () => {
  test("progress counts answered questions and the score counts right ones", () => {
    const summary = summarize(
      [
        { questionId: "capital", response: 2, mark: "right" },
        { questionId: "river", response: 3, mark: "wrong" },
      ],
      [capital, river, mountain],
    );

    expect(summary).toEqual({
      marks: { capital: "right", river: "wrong" },
      progress: { answered: 2, total: 3 },
      score: 1,
      finished: false,
    });
  });

  test("an attempt with every question answered is finished", () => {
    const summary = summarize(
      [
        { questionId: "capital", response: 2, mark: "right" },
        { questionId: "river", response: 1, mark: "right" },
      ],
      [capital, river],
    );

    expect(summary.progress).toEqual({ answered: 2, total: 2 });
    expect(summary.score).toBe(2);
    expect(summary.finished).toBe(true);
  });

  test("a corrected key rescores an auto-checked answer against the current key", () => {
    const correctedRiver: Question = { id: "river", kind: "single-choice", key: 3 };
    const correctedGravity: Question = { id: "gravity", kind: "numeric", key: { value: "9.8" } };

    const summary = summarize(
      [
        { questionId: "capital", response: 2, mark: "right" },
        { questionId: "river", response: 3, mark: "wrong" },
        { questionId: "gravity", response: "9,8", mark: "wrong" },
      ],
      [capital, correctedRiver, correctedGravity],
    );

    expect(summary.marks).toEqual({ capital: "right", river: "right", gravity: "right" });
    expect(summary.score).toBe(3);
  });

  test("a widened tolerance rescores a numeric answer against the current key", () => {
    const widenedGravity: Question = {
      id: "gravity",
      kind: "numeric",
      key: { value: "9.81", tolerance: 0.05 },
    };

    const summary = summarize(
      [{ questionId: "gravity", response: "9,78", mark: "wrong" }],
      [widenedGravity],
    );

    expect(summary.marks).toEqual({ gravity: "right" });
    expect(summary.score).toBe(1);
  });

  test("a self-checked answer keeps the mark the owner gave it", () => {
    const essay: Question = { id: "essay", kind: "open-question" };
    const proof: Question = { id: "proof", kind: "open-question" };

    const summary = summarize(
      [
        { questionId: "essay", response: "Because of the tides.", mark: "right" },
        { questionId: "proof", response: "By induction.", mark: "wrong" },
      ],
      [essay, proof],
    );

    expect(summary.marks).toEqual({ essay: "right", proof: "wrong" });
    expect(summary.score).toBe(1);
  });

  test("a question added to a finished attempt reopens it with that question unanswered", () => {
    const answers = [
      { questionId: "capital", response: 2, mark: "right" as const },
      { questionId: "river", response: 1, mark: "right" as const },
    ];

    const beforeTheAddition = summarize(answers, [capital, river]);
    const withAddedQuestion = summarize(answers, [capital, river, mountain]);

    expect(beforeTheAddition.finished).toBe(true);
    expect(withAddedQuestion.finished).toBe(false);
    expect(withAddedQuestion.progress).toEqual({ answered: 2, total: 3 });
    expect(withAddedQuestion.marks).toEqual({ capital: "right", river: "right" });
  });

  test("an answer to a removed question is ignored, and counts again when its ID returns", () => {
    const answers = [
      { questionId: "capital", response: 2, mark: "right" as const },
      { questionId: "river", response: 1, mark: "right" as const },
    ];

    const withRiverRemoved = summarize(answers, [capital, mountain]);
    const withRiverBack = summarize(answers, [capital, river, mountain]);

    expect(withRiverRemoved).toEqual({
      marks: { capital: "right" },
      progress: { answered: 1, total: 2 },
      score: 1,
      finished: false,
    });
    expect(withRiverBack).toEqual({
      marks: { capital: "right", river: "right" },
      progress: { answered: 2, total: 3 },
      score: 2,
      finished: false,
    });
  });

  test("an attempt with no answers has no progress and scores zero", () => {
    expect(summarize([], [capital, river])).toEqual({
      marks: {},
      progress: { answered: 0, total: 2 },
      score: 0,
      finished: false,
    });
  });
});
