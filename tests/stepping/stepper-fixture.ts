import { artifact } from "./built-page.ts";

export const stepperSlug = "stack-machine";

// A frame on every step, a dot on step 1 only, a ring from step 2 on and a disc on step 3.
const rings = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">',
  '  <rect x="4" y="4" width="32" height="32" class="fill-tint stroke-text" />',
  '  <circle data-step="2-" cx="20" cy="20" r="12" class="stroke-text" fill="none" />',
  '  <circle data-step="1" cx="20" cy="20" r="2" class="fill-text" />',
  '  <circle data-step="3" cx="20" cy="20" r="6" class="fill-text" />',
  "</svg>",
  "",
].join("\n");

export const stepperFiles = {
  [`artifacts/${stepperSlug}/index.mdx`]: artifact(
    [
      "id: st4ckm4c",
      "title: Stack machine",
      "subject: Compilers",
      "lang: en",
      "published: 2026-10-15",
    ],
    [
      'import Stepper from "@artifactory/design-system/stepper";',
      'import rings from "./rings.svg?raw";',
      "",
      '<Stepper captions={["Push 2.", "Push 3.", "Add them."]}>',
      "",
      "```text",
      "push 2",
      "```",
      "",
      "```text {2}",
      "push 2",
      "push 3",
      "```",
      "",
      "```text",
      "add",
      "```",
      "",
      "</Stepper>",
      "",
      '<Stepper lines={["1", "2-3", "1, 3"]}>',
      "",
      "```text",
      "push 2",
      "push 3",
      "add",
      "```",
      "",
      "</Stepper>",
      "",
      '<Stepper figure={rings} alt="A square frame with a dot, then a ring, then a disc inside the ring." captions={["A dot.", "A ring.", "A disc in the ring."]} />',
    ],
  ),
  [`artifacts/${stepperSlug}/rings.svg`]: rings,
};
