export const themeKey = "artifactory-theme";

export type Theme = "light" | "dark";

export interface ThemeWatch {
  press(): void;
  stop(): void;
}

const other = (theme: Theme): Theme => (theme === "dark" ? "light" : "dark");

function asTheme(value: string | null): Theme | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

function readChoice(): Theme | undefined {
  try {
    return asTheme(localStorage.getItem(themeKey));
  } catch {
    return undefined;
  }
}

function keepChoice(theme: Theme | undefined) {
  try {
    if (theme === undefined) localStorage.removeItem(themeKey);
    else localStorage.setItem(themeKey, theme);
  } catch {
    // Storage can be blocked or full. The choice then holds on this page only, as the spec asks.
  }
}

// A stored choice always differs from what the device shows, so following the device again is
// forgetting the key, and the eye needs no third state.
class ThemeChoice {
  readonly #device = matchMedia("(prefers-color-scheme: dark)");
  readonly #listeners = new Set<(shown: Theme) => void>();
  #chosen = readChoice();

  constructor() {
    if (this.#chosen === this.#deviceTheme()) this.#choose(undefined);
    this.#apply();
    this.#device.addEventListener("change", this.#deviceChanged);
    addEventListener("storage", this.#storageChanged);
  }

  get listening() {
    return this.#listeners.size > 0;
  }

  get shown(): Theme {
    return this.#chosen ?? this.#deviceTheme();
  }

  listen(listener: (shown: Theme) => void) {
    this.#listeners.add(listener);
    listener(this.shown);
  }

  unlisten(listener: (shown: Theme) => void) {
    this.#listeners.delete(listener);
  }

  press() {
    const next = other(this.shown);
    this.#choose(next === this.#deviceTheme() ? undefined : next);
    this.#apply();
  }

  stop() {
    this.#device.removeEventListener("change", this.#deviceChanged);
    removeEventListener("storage", this.#storageChanged);
  }

  #deviceTheme(): Theme {
    return this.#device.matches ? "dark" : "light";
  }

  #choose(theme: Theme | undefined) {
    this.#chosen = theme;
    keepChoice(theme);
  }

  #apply() {
    const root = document.documentElement;
    if (this.#chosen === undefined) delete root.dataset.theme;
    else root.dataset.theme = this.#chosen;
    for (const listener of this.#listeners) listener(this.shown);
  }

  readonly #deviceChanged = () => {
    this.#choose(undefined);
    this.#apply();
  };

  readonly #storageChanged = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    if (event.key !== null && event.key !== themeKey) return;
    this.#chosen = asTheme(event.newValue);
    this.#apply();
  };
}

let choice: ThemeChoice | undefined;

export function watchThemeChoice(listener: (shown: Theme) => void): ThemeWatch {
  choice ??= new ThemeChoice();
  const watched = choice;
  watched.listen(listener);
  return {
    press: () => {
      watched.press();
    },
    stop: () => {
      watched.unlisten(listener);
      if (watched.listening || choice !== watched) return;
      watched.stop();
      choice = undefined;
    },
  };
}
