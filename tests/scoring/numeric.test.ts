import { check, numericKeyProblem, parseNumber } from "@artifactory/design-system/scoring";
import { describe, expect, test } from "vitest";

describe("the number syntax", () => {
  test("a decimal comma and a decimal point give the same number", () => {
    expect(parseNumber("3,14")).toEqual({ number: 3.14 });
    expect(parseNumber("3.14")).toEqual({ number: 3.14 });
  });

  test("a number may start with a plus, a hyphen or a minus sign", () => {
    expect(parseNumber("+2,5")).toEqual({ number: 2.5 });
    expect(parseNumber("-2,5")).toEqual({ number: -2.5 });
    expect(parseNumber("−2,5")).toEqual({ number: -2.5 });
  });

  test("scientific notation and simple fractions are numbers", () => {
    expect(parseNumber("6,02e23")).toEqual({ number: 602000000000000000000000 });
    expect(parseNumber("1.6E-19")).toEqual({ number: 0.00000000000000000016 });
    expect(parseNumber("-2/3")).toEqual({ number: -0.6666666666666666 });
  });

  test("whitespace around a number is ignored", () => {
    expect(parseNumber("  9,81\t")).toEqual({ number: 9.81 });
  });

  test.each([
    ["both separators", "1.000,5"],
    ["more than one separator", "1.000.000"],
    ["no digit before the separator", ",5"],
    ["no digit after the separator", "5."],
    ["a space inside", "1 000"],
    ["a sign after the start", "2-"],
    ["pi", "π"],
    ["a square root", "√2"],
    ["times ten to the power", "2×10^3"],
    ["an expression", "1+2"],
    ["a zero denominator", "1/0"],
    ["a decimal inside a fraction", "1,5/2"],
    ["an exponent inside a fraction", "1e2/3"],
    ["a result that isn't finite", "1e400"],
    ["words", "abc"],
    ["nothing", "  "],
  ])("%s isn't a number: %s", (_, text) => {
    expect(parseNumber(text)).toEqual({ refused: "not-a-number" });
  });

  test.each(["1.000", "2,500", "-3,142"])(
    "one separator before exactly three digits is refused as ambiguous: %s",
    (text) => {
      expect(parseNumber(text)).toEqual({ refused: "ambiguous" });
    },
  );

  test("three digits after a whole part of zero aren't ambiguous", () => {
    expect(parseNumber("0,125")).toEqual({ number: 0.125 });
    expect(parseNumber("0.125")).toEqual({ number: 0.125 });
    expect(parseNumber("00,125")).toEqual({ number: 0.125 });
    expect(parseNumber("-00.125")).toEqual({ number: -0.125 });
  });
});

describe("the numeric check", () => {
  test("without a tolerance, an answer is right only when it is the key's number", () => {
    expect(check("numeric", "3/4", { value: "0.75" })).toBe("right");
    expect(check("numeric", "0,75", { value: "3/4" })).toBe("right");
    expect(check("numeric", "6.02e23", { value: "602000000000000000000000" })).toBe("right");
    expect(check("numeric", "0,76", { value: "0.75" })).toBe("wrong");
  });

  test("a key with three decimals means what it says", () => {
    expect(check("numeric", "2,5", { value: "2.500" })).toBe("right");
    expect(check("numeric", "2500", { value: "2.500" })).toBe("wrong");
  });

  test("with a tolerance, an answer is right up to and including its edges", () => {
    const gravity = { value: "9.81", tolerance: 0.01 };

    expect(check("numeric", "9,80", gravity)).toBe("right");
    expect(check("numeric", "9,82", gravity)).toBe("right");
    expect(check("numeric", "9,79", gravity)).toBe("wrong");
    expect(check("numeric", "9.83", gravity)).toBe("wrong");
  });

  test("tolerance edges hold for very small and very large numbers", () => {
    const charge = { value: "1.6e-19", tolerance: 1e-21 };
    const avogadro = { value: "6.02e23", tolerance: 1e21 };

    expect(check("numeric", "1,61e-19", charge)).toBe("right");
    expect(check("numeric", "1,59e-19", charge)).toBe("right");
    expect(check("numeric", "1,62e-19", charge)).toBe("wrong");
    expect(check("numeric", "6,03e23", avogadro)).toBe("right");
    expect(check("numeric", "6,04e23", avogadro)).toBe("wrong");
  });

  test("a relative tolerance is a fraction of the key's value, edges included", () => {
    const onePercent = { value: "200", relativeTolerance: 0.01 };

    expect(check("numeric", "198", onePercent)).toBe("right");
    expect(check("numeric", "202", onePercent)).toBe("right");
    expect(check("numeric", "197,9", onePercent)).toBe("wrong");
    expect(check("numeric", "-200", { value: "-200", relativeTolerance: 0.01 })).toBe("right");
    expect(check("numeric", "-198", { value: "-200", relativeTolerance: 0.01 })).toBe("right");
  });

  test("a zero tolerance checks exactly", () => {
    expect(check("numeric", "0,3", { value: "0.3", tolerance: 0 })).toBe("right");
    expect(check("numeric", "0.30000000000000004", { value: "0.3", tolerance: 0 })).toBe("wrong");
  });

  test("an answer that isn't typed text, or isn't a number, is wrong", () => {
    expect(check("numeric", 0.75, { value: "0.75" })).toBe("wrong");
    expect(check("numeric", null, { value: "0.75" })).toBe("wrong");
    expect(check("numeric", "três quartos", { value: "0.75" })).toBe("wrong");
    expect(check("numeric", "7,500", { value: "7.5" })).toBe("wrong");
  });
});

describe("the numeric key's rules", () => {
  test("a key that isn't a number is refused", () => {
    expect(numericKeyProblem({ value: "π/2" })).toBe(
      '`answer` is "π/2", which isn\'t a number; write it like "9.81", "-3/4" or "6.02e23"',
    );
  });

  test("a key written with a decimal comma is refused", () => {
    expect(numericKeyProblem({ value: "9,81" })).toBe(
      '`answer` is "9,81"; write its decimals after `.`, not `,`',
    );
  });

  test("a key with both tolerances is refused", () => {
    expect(numericKeyProblem({ value: "9.81", tolerance: 0.01, relativeTolerance: 0.001 })).toBe(
      "give it `tolerance` or `relativeTolerance`, not both",
    );
  });

  test.each([
    ["tolerance", -0.01, "-0.01"],
    ["relativeTolerance", -0.5, "-0.5"],
    ["tolerance", Number.NaN, "NaN"],
    ["tolerance", Number.POSITIVE_INFINITY, "Infinity"],
    ["relativeTolerance", Number.NEGATIVE_INFINITY, "-Infinity"],
  ])(
    "a negative or infinite tolerance, or one that isn't a number, is refused: %s %s",
    (name, tolerance, written) => {
      expect(numericKeyProblem({ value: "9.81", [name]: tolerance })).toBe(
        `\`${name}\` is ${written}; give it a finite number, zero or more`,
      );
    },
  );

  test.each(["0", "-0.0", "0/7"])("a relative tolerance on a zero key is refused: %s", (value) => {
    expect(numericKeyProblem({ value, relativeTolerance: 0.01 })).toBe(
      "`relativeTolerance` is a fraction of `answer`, which is zero; give it a `tolerance` instead",
    );
  });

  test.each([
    { value: "9.81" },
    { value: "2.500" },
    { value: "-3/4", relativeTolerance: 0.01 },
    { value: "6.02e23", relativeTolerance: 0 },
    { value: "0", tolerance: 0.1 },
    { value: "9.81", tolerance: 0 },
  ])("a key that can work has no problem: %o", (key) => {
    expect(numericKeyProblem(key)).toBeUndefined();
  });
});
