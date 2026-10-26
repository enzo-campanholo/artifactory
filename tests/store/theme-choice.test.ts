// @vitest-environment happy-dom
import "@artifactory/design-system/theme-eye-element";
import type { Window as HappyWindow } from "happy-dom";
import { afterEach, expect, test, vi } from "vitest";

const themeKey = "artifactory-theme";

function setDevice(theme: "light" | "dark") {
  (window as unknown as HappyWindow).happyDOM.settings.device.prefersColorScheme = theme;
  window.dispatchEvent(new Event("resize"));
}

function openPage() {
  const template = document.createElement("template");
  template.innerHTML = `
    <theme-eye class="theme-eye">
      <button type="button" class="theme-eye-button" aria-pressed="false">
        <span class="theme-eye-name"><span data-lang="en">Dark theme</span><span data-lang="pt">Tema escuro</span></span>
        <svg class="eye-drawing theme-eye-drawing" viewBox="0 0 36 24" aria-hidden="true">
          <clipPath id="theme-eye-drawing-white"><path class="eye-drawing-white" d="M2 14Q18 -6 34 14Q18 26 2 14Z"></path></clipPath>
          <g clip-path="url(#theme-eye-drawing-white)">
            <circle class="eye-drawing-iris" cx="18" cy="12" r="4"></circle>
            <circle class="eye-drawing-pupil" cx="18" cy="12" r="1.5"></circle>
          </g>
          <path class="eye-drawing-outline" d="M2 14Q18 -6 34 14Q18 26 2 14Z"></path>
          <path class="eye-drawing-lashes" d="M7.76 8.1l-1.56 -1.95M12.88 5.02l-1.3 -3.25M18 4l0 -4M23.12 5.02l1.3 -3.25M28.24 8.1l1.56 -1.95M12.24 19.22l-0.46 1.69M18 20l0 2.25M23.76 19.22l0.46 1.69"></path>
        </svg>
        <svg class="eye-drawing theme-eye-shut-until-live" viewBox="0 0 36 24" aria-hidden="true">
          <clipPath id="theme-eye-shut-until-live-white"><path class="eye-drawing-white" d="M2 8Q18 20 34 8Q18 20 2 8Z"></path></clipPath>
          <g clip-path="url(#theme-eye-shut-until-live-white)">
            <circle class="eye-drawing-iris" cx="18" cy="6" r="4"></circle>
            <circle class="eye-drawing-pupil" cx="18" cy="6" r="1.5"></circle>
          </g>
          <path class="eye-drawing-outline" d="M2 8Q18 20 34 8Q18 20 2 8Z"></path>
          <path class="eye-drawing-lashes" d="M7.76 11.54l-0.65 1.35M12.88 13.39l-0.49 2.04M18 14l0 2.4M23.12 13.39l0.49 2.04M28.24 11.54l0.65 1.35"></path>
        </svg>
      </button>
    </theme-eye>`;
  document.body.append(template.content);
  const eye = document.querySelector<HTMLButtonElement>("theme-eye button");
  if (eye === null) throw new Error("no eye");
  return eye;
}

const pressed = (eye: HTMLButtonElement) => eye.getAttribute("aria-pressed");
const pageTheme = () => document.documentElement.dataset.theme;
const stored = () => localStorage.getItem(themeKey);

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  delete document.documentElement.dataset.theme;
  localStorage.clear();
  setDevice("light");
});

test.each([
  ["light", "false"],
  ["dark", "true"],
] as const)("with nothing stored, the page follows a %s device", (device, eyePressed) => {
  setDevice(device);

  const eye = openPage();

  expect(pressed(eye)).toBe(eyePressed);
  expect(pageTheme()).toBeUndefined();
  expect(stored()).toBeNull();
});

test("a press shows the other theme and stores it, and a press back forgets it", () => {
  const eye = openPage();

  eye.click();

  expect(pressed(eye)).toBe("true");
  expect(pageTheme()).toBe("dark");
  expect(stored()).toBe("dark");

  eye.click();

  expect(pressed(eye)).toBe("false");
  expect(pageTheme()).toBeUndefined();
  expect(stored()).toBeNull();
});

test("a change in the device's preference forgets the choice, keeps the page's theme, and the page then follows the device", () => {
  const eye = openPage();
  eye.click();

  setDevice("dark");

  expect(stored()).toBeNull();
  expect(pageTheme()).toBeUndefined();
  expect(pressed(eye)).toBe("true");

  setDevice("light");

  expect(pressed(eye)).toBe("false");
  expect(stored()).toBeNull();
});

test("a stored choice equal to the device is forgotten when the page opens", () => {
  setDevice("dark");
  localStorage.setItem(themeKey, "dark");
  document.documentElement.dataset.theme = "dark";

  const eye = openPage();

  expect(stored()).toBeNull();
  expect(pageTheme()).toBeUndefined();
  expect(pressed(eye)).toBe("true");
});

test("a stored choice that differs from the device is shown when the page opens", () => {
  localStorage.setItem(themeKey, "dark");
  document.documentElement.dataset.theme = "dark";

  const eye = openPage();

  expect(stored()).toBe("dark");
  expect(pageTheme()).toBe("dark");
  expect(pressed(eye)).toBe("true");
});

test("an unknown stored value is ignored, and the page follows the device", () => {
  localStorage.setItem(themeKey, "sepia");

  const eye = openPage();

  expect(pressed(eye)).toBe("false");
  expect(pageTheme()).toBeUndefined();

  eye.click();

  expect(stored()).toBe("dark");
});

function anotherTab(newValue: string | null) {
  if (newValue === null) localStorage.removeItem(themeKey);
  else localStorage.setItem(themeKey, newValue);
  window.dispatchEvent(
    new StorageEvent("storage", { key: themeKey, newValue, storageArea: localStorage }),
  );
}

test("another tab's choice and its forgetting apply here", () => {
  const eye = openPage();

  anotherTab("dark");

  expect(pressed(eye)).toBe("true");
  expect(pageTheme()).toBe("dark");

  anotherTab(null);

  expect(pressed(eye)).toBe("false");
  expect(pageTheme()).toBeUndefined();
});

test("another tab clearing storage forgets the choice here", () => {
  localStorage.setItem(themeKey, "dark");
  const eye = openPage();

  localStorage.clear();
  window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: localStorage }));

  expect(pressed(eye)).toBe("false");
  expect(pageTheme()).toBeUndefined();
});

test("a press still changes the theme on this page when storage throws", () => {
  for (const method of ["getItem", "setItem", "removeItem"] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
  }
  const eye = openPage();

  eye.click();

  expect(pressed(eye)).toBe("true");
  expect(pageTheme()).toBe("dark");

  eye.click();

  expect(pressed(eye)).toBe("false");
  expect(pageTheme()).toBeUndefined();
});
