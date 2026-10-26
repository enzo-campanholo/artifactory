// @vitest-environment happy-dom
import {
  keptLibraryTransport,
  memoryLibraryTransport,
} from "@artifactory/design-system/library-statuses";
import { keptTransport } from "@artifactory/design-system/state";
import { afterEach, expect, test } from "vitest";
import { artifactId, checked, earlierAttempt, openPage, seededTransport } from "./seeded-page.ts";

const ownerMark = "artifactory-owner";
const marked = () => localStorage.getItem(ownerMark) !== null;
const library = () =>
  memoryLibraryTransport({ buildId: "5b7e2c90-1f4a-4d38-a6e1-0c9d8b7a6f52", summaries: {} });

afterEach(() => {
  localStorage.clear();
});

test("a load of an artifact's state marks the device as the owner's", async () => {
  await keptTransport(seededTransport()).load(artifactId);

  expect(marked()).toBe(true);
});

test("a saved answer marks the device as the owner's", async () => {
  const saving = await keptTransport(seededTransport()).save(artifactId, "first-attempt", {
    questionId: "capital",
    response: 2,
    mark: "right",
  });

  expect(saving.outcome).toBe("saved");
  expect(marked()).toBe(true);
});

test("an answer the server already had marks the device as the owner's", async () => {
  const saving = await keptTransport(seededTransport([earlierAttempt])).save(
    artifactId,
    earlierAttempt.id,
    { questionId: "river", response: 1, mark: "right" },
  );

  expect(saving.outcome).toBe("already answered");
  expect(marked()).toBe(true);
});

test("a load of the Library's statuses marks the device as the owner's", async () => {
  await keptLibraryTransport(library()).load();

  expect(marked()).toBe(true);
});

test.each(["load fails", "signed out"] as const)(
  "a load that %s leaves the device unmarked, for an artifact and for the Library",
  async (forced) => {
    const transport = seededTransport();
    transport.forced.add(forced);
    const libraryTransport = library();
    libraryTransport.forced.add(forced);

    await keptTransport(transport).load(artifactId);
    await keptLibraryTransport(libraryTransport).load();

    expect(marked()).toBe(false);
  },
);

test("answering on throwaway state leaves the device unmarked", async () => {
  const store = openPage(seededTransport());
  await checked(store);

  await store.answers.save("capital", 2, "right");

  expect(store.answers.get("capital")?.status).toBe("saved");
  expect(marked()).toBe(false);
});

test("signing out keeps the owner mark", async () => {
  const transport = seededTransport([earlierAttempt]);
  const libraryTransport = library();
  await keptLibraryTransport(libraryTransport).load();
  const store = openPage(keptTransport(transport));
  await checked(store);
  transport.forced.add("signed out");
  libraryTransport.forced.add("signed out");

  await store.answers.save("capital", 1, "wrong");
  await keptLibraryTransport(libraryTransport).load();

  expect(marked()).toBe(true);
});
