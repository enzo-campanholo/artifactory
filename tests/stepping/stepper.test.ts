import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { checkTimeout } from "../check/fixture-repo.ts";
import {
  announcement,
  button,
  counted,
  openBuiltPage,
  press,
  textOf,
  type BuiltPage,
} from "./built-page.ts";
import { stepperFiles, stepperSlug } from "./stepper-fixture.ts";

let page: BuiltPage | undefined;

beforeAll(async () => {
  page = await openBuiltPage(stepperFiles, stepperSlug);
}, checkTimeout);

afterAll(async () => {
  await page?.close();
});

// The fixture's Steppers, in the order the page has them.
function stepper(which: "code blocks" | "one block" | "figure"): HTMLElement {
  const order = ["code blocks", "one block", "figure"];
  const found = document.querySelectorAll<HTMLElement>("artifact-stepper")[order.indexOf(which)];
  if (found === undefined) throw new Error(`no ${which} Stepper`);
  return found;
}

function codeLine(host: Element, text: string): Element {
  const found = [...host.querySelectorAll("pre *")].find((line) => textOf(line) === text);
  if (found === undefined) throw new Error(`no code line "${text}"`);
  return found;
}

describe.each(["code blocks", "one block", "figure"] as const)(
  "the step row on a %s Stepper",
  (which) => {
    let host: HTMLElement;
    let back: HTMLButtonElement;
    let forward: HTMLButtonElement;

    beforeAll(() => {
      host = stepper(which);
      back = button(host, "Previous step");
      forward = button(host, "Next step");
    });

    test("its buttons are usable once the element is connected", () => {
      expect([back.disabled, forward.disabled]).toEqual([false, false]);
    });

    test("moves a step with the buttons and the arrow keys, and refuses past either end", () => {
      expect(counted(host)).toBe("1 of 3");
      expect(back.getAttribute("aria-disabled")).toBe("true");
      expect(forward.getAttribute("aria-disabled")).toBe("false");

      back.click();
      press(back, "ArrowLeft");
      expect(counted(host)).toBe("1 of 3");

      forward.click();
      expect(counted(host)).toBe("2 of 3");
      expect(back.getAttribute("aria-disabled")).toBe("false");
      expect(forward.getAttribute("aria-disabled")).toBe("false");

      press(forward, "ArrowRight");
      expect(counted(host)).toBe("3 of 3");
      expect(forward.getAttribute("aria-disabled")).toBe("true");

      forward.click();
      press(forward, "ArrowRight");
      expect(counted(host)).toBe("3 of 3");

      press(forward, "ArrowLeft");
      expect(counted(host)).toBe("2 of 3");
      back.click();
      expect(counted(host)).toBe("1 of 3");
      expect(back.getAttribute("aria-disabled")).toBe("true");
      expect(forward.getAttribute("aria-disabled")).toBe("false");
    });
  },
);

describe("a code Stepper", () => {
  test("announces its step, with the lines its block marks and its caption", () => {
    const host = stepper("code blocks");
    const forward = button(host, "Next step");
    forward.click();
    expect(textOf(announcement(host))).toBe("Step 2 of 3. Line 2. Push 3.");
    forward.click();
    expect(textOf(announcement(host))).toBe("Step 3 of 3. Add them.");
    button(host, "Previous step").click();
    button(host, "Previous step").click();
    expect(textOf(announcement(host))).toBe("Step 1 of 3. Push 2.");
  });

  test("with one block, lights each step's lines and announces them", () => {
    const host = stepper("one block");
    const lit = () =>
      ["push 2", "push 3", "add"].filter((line) => !codeLine(host, line).hasAttribute("data-off"));
    expect(lit()).toEqual(["push 2"]);

    button(host, "Next step").click();
    expect(lit()).toEqual(["push 3", "add"]);
    expect(textOf(announcement(host))).toBe("Step 2 of 3. Lines 2 to 3.");

    press(button(host, "Next step"), "ArrowRight");
    expect(lit()).toEqual(["push 2", "add"]);
    expect(textOf(announcement(host))).toBe("Step 3 of 3. Lines 1 and 3.");

    button(host, "Previous step").click();
    expect(lit()).toEqual(["push 3", "add"]);
    expect(textOf(announcement(host))).toBe("Step 2 of 3. Lines 2 to 3.");
  });
});

describe("a figure Stepper", () => {
  test("shows the parts of each step, and announces it with its caption", () => {
    const host = stepper("figure");
    const shown = () =>
      ["1", "2-", "3"].filter(
        (steps) => !host.querySelector(`[data-step="${steps}"]`)?.hasAttribute("data-off"),
      );
    expect(shown()).toEqual(["1"]);

    button(host, "Next step").click();
    expect(shown()).toEqual(["2-"]);
    expect(textOf(announcement(host))).toBe("Step 2 of 3. A ring.");

    button(host, "Next step").click();
    expect(shown()).toEqual(["2-", "3"]);
    expect(textOf(announcement(host))).toBe("Step 3 of 3. A disc in the ring.");

    press(button(host, "Previous step"), "ArrowLeft");
    press(button(host, "Previous step"), "ArrowLeft");
    expect(shown()).toEqual(["1"]);
    expect(textOf(announcement(host))).toBe("Step 1 of 3. A dot.");
  });
});
