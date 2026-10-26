// @vitest-environment happy-dom
import "@artifactory/design-system/state-notices";
import { afterEach, expect, test, vi } from "vitest";
import {
  earlierAttempt,
  checked,
  nextChange,
  openPage,
  returnToTab,
  seededTransport,
} from "./seeded-page.ts";

function mountNotices() {
  const template = document.createElement("template");
  template.innerHTML = `
    <artifact-state-notices class="state-notices" role="status">
      <p class="state-notice" data-notice="loadFailed" hidden>
        <span data-lang="en">Couldn't check your answers</span><span class="state-notice-separator">&nbsp;·</span> <button type="button" class="state-notice-action" data-action="retry"><span data-lang="en">Try again</span></button>
      </p>
      <p class="state-notice" data-notice="signedOut" hidden>
        <span data-lang="en">Signed out</span><span class="state-notice-separator">&nbsp;·</span> <button type="button" class="state-notice-action" data-action="reload"><span data-lang="en">Reload to sign in</span></button><span class="state-notices-lost" hidden><span class="state-notice-separator">&nbsp;·</span> <span class="state-notices-lost-count"></span><span class="state-notice-separator">&nbsp;·</span> <a class="state-notice-action" data-action="go-to-lost"></a></span>
      </p>
      <p class="state-notice" data-notice="artifactUpdated" hidden>
        <span data-lang="en">This artifact was updated</span><span class="state-notice-separator">&nbsp;·</span> <button type="button" class="state-notice-action" data-action="reload"><span data-lang="en">Reload</span></button>
      </p>
      <p class="state-notice" data-notice="attemptSwitched" hidden>
        <span data-lang="en">Switched to your latest attempt, from another device</span>
      </p>
      <p class="state-notice" data-notice="startedOver" hidden>
        <span data-lang="en">Started over</span><span class="state-notice-separator">&nbsp;·</span> <button type="button" class="state-notice-action" data-action="undo-start-over"><span data-lang="en">Undo</span></button>
      </p>
    </artifact-state-notices>
    <main id="artifact-text">
      <div id="q-capital" class="question" data-question-id="capital"></div>
      <div id="q-river" class="question" data-question-id="river"></div>
    </main>`;
  document.body.append(template.content);
  const notice = (name: string) => {
    const paragraph = document.querySelector<HTMLElement>(`[data-notice=${name}]`);
    if (paragraph === null) throw new Error(`no ${name} notice`);
    return paragraph;
  };
  const retry = () => {
    const button = notice("loadFailed").querySelector("button");
    if (button === null) throw new Error("no Try again");
    return button;
  };
  return { notice, retry };
}

const shownNotices = () =>
  [...document.querySelectorAll<HTMLElement>("[data-notice]")]
    .filter((paragraph) => !paragraph.hidden)
    .map((paragraph) => {
      const shown = paragraph.cloneNode(true) as HTMLElement;
      for (const hidden of shown.querySelectorAll("[hidden]")) hidden.remove();
      return shown.textContent.replace(/\s+/g, " ").trim();
    });

afterEach(() => {
  document.body.innerHTML = "";
});

test("a failed check shows 'Couldn't check your answers · Try again', and Try again checks them and moves focus to the text", async () => {
  const transport = seededTransport();
  transport.forced.add("load fails");
  const store = openPage(transport);
  const { retry } = mountNotices();
  await vi.waitFor(() => {
    expect(shownNotices()).toEqual(["Couldn't check your answers · Try again"]);
  });
  transport.forced.delete("load fails");
  retry().focus();

  retry().click();

  expect(retry().getAttribute("aria-disabled")).toBe("true");
  await checked(store);
  expect(shownNotices()).toEqual([]);
  expect(retry().hasAttribute("aria-disabled")).toBe(false);
  expect(document.activeElement?.id).toBe("artifact-text");
});

test("Try again on a check that fails again turns the action back on and rewrites the notice, so it's announced again", async () => {
  const transport = seededTransport();
  transport.forced.add("load fails");
  const store = openPage(transport);
  const { notice, retry } = mountNotices();
  await vi.waitFor(() => {
    expect(shownNotices()).toEqual(["Couldn't check your answers · Try again"]);
  });
  const rewritten: Node[] = [];
  new MutationObserver((records) => {
    rewritten.push(...records.flatMap(({ addedNodes }) => [...addedNodes]));
  }).observe(notice("loadFailed"), { childList: true, subtree: true });

  retry().click();
  expect(retry().getAttribute("aria-disabled")).toBe("true");
  await nextChange(store);

  expect(retry().hasAttribute("aria-disabled")).toBe(false);
  expect(shownNotices()).toEqual(["Couldn't check your answers · Try again"]);
  await vi.waitFor(() => {
    expect(rewritten.map(({ textContent }) => textContent)).toContain(
      "Couldn't check your answers",
    );
  });
});

test("a sign-out after a failed check shows only 'Signed out · Reload to sign in'", async () => {
  const transport = seededTransport();
  transport.forced.add("load fails");
  openPage(transport);
  mountNotices();
  await vi.waitFor(() => {
    expect(shownNotices()).toEqual(["Couldn't check your answers · Try again"]);
  });
  transport.forced.add("signed out");

  returnToTab();

  await vi.waitFor(() => {
    expect(shownNotices()).toEqual(["Signed out · Reload to sign in"]);
  });
});

test("a sign-out shows 'Signed out · Reload to sign in', counts the lost answers and links the first question", async () => {
  const transport = seededTransport();
  const store = openPage(transport);
  const { notice } = mountNotices();
  await checked(store);
  transport.forced.add("signed out");

  await store.answers.save("river", 1, "wrong");

  expect(shownNotices()).toEqual([
    "Signed out · Reload to sign in · 1 answer not saved · Go to question 2",
  ]);
  await store.answers.save("capital", 2, "right");
  expect(shownNotices()).toEqual([
    "Signed out · Reload to sign in · 2 answers not saved · Go to question 1",
  ]);
  const links = [...notice("signedOut").querySelectorAll("a")].map(({ hash }) => hash);
  expect(links).toEqual(["#q-capital"]);
});

test("a question lost twice counts once, and the focused link stays as the page changes", async () => {
  const transport = seededTransport();
  const store = openPage(transport);
  const { notice } = mountNotices();
  await checked(store);
  transport.forced.add("signed out");
  await store.answers.save("capital", 2, "right");
  await store.answers.save("river", 1, "wrong");
  const link = notice("signedOut").querySelector("a");
  link?.focus();

  store.answers.startOver();
  await store.answers.save("capital", 3, "wrong");

  expect(shownNotices()).toEqual([
    "Signed out · Reload to sign in · 2 answers not saved · Go to question 1",
  ]);
  expect(document.activeElement).toBe(link);
});

test("an updated artifact shows 'This artifact was updated · Reload'", async () => {
  const transport = seededTransport();
  transport.forced.add("artifact updated");

  openPage(transport);
  mountNotices();

  await vi.waitFor(() => {
    expect(shownNotices()).toEqual(["This artifact was updated · Reload"]);
  });
});

test("Start over shows 'Started over · Undo', and Undo brings the earlier attempt back and moves focus to the text", async () => {
  const store = openPage(seededTransport([earlierAttempt]));
  const { notice } = mountNotices();
  await checked(store);
  store.answers.startOver();
  expect(shownNotices()).toEqual(["Started over · Undo"]);
  const undo = notice("startedOver").querySelector("button");
  if (undo === null) throw new Error("no Undo");
  undo.focus();

  undo.click();

  expect(shownNotices()).toEqual([]);
  expect(store.answers.get("river")).toMatchObject({ mark: "wrong" });
  expect(document.activeElement).toBe(document.getElementById("artifact-text"));
});

test("the next answer after Start over puts away 'Started over · Undo'", async () => {
  const store = openPage(seededTransport([earlierAttempt]));
  mountNotices();
  await checked(store);
  store.answers.startOver();

  await store.answers.save("capital", 2, "right");

  expect(shownNotices()).toEqual([]);
});
