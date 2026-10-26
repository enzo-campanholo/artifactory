import { markOwner } from "./owner-mark.ts";
import type { LibrarySummaries } from "./saved-state.ts";
import type { Summary } from "./scoring.ts";
import {
  forgetKeptState,
  keepFresh,
  keeping,
  keptKey,
  loadOverHttp,
  type LoadOutcome,
} from "./state.ts";

export interface LibraryTransport {
  load(): Promise<LoadOutcome<LibrarySummaries>>;
}

type ForcedOutcome = "load fails" | "signed out" | "library updated";

export interface MemoryLibraryTransport extends LibraryTransport {
  readonly forced: Set<ForcedOutcome>;
  readonly summaries: Record<string, Summary>;
}

export function memoryLibraryTransport(seed: LibrarySummaries): MemoryLibraryTransport {
  const forced = new Set<ForcedOutcome>();
  const summaries = structuredClone(seed.summaries);
  return {
    forced,
    summaries,
    load() {
      if (forced.has("signed out")) return Promise.resolve({ outcome: "signed out" });
      if (forced.has("load fails")) return Promise.resolve({ outcome: "failed" });
      const buildId = forced.has("library updated") ? `${seed.buildId}-updated` : seed.buildId;
      return Promise.resolve({
        outcome: "loaded",
        state: { buildId, summaries: structuredClone(summaries) },
      });
    },
  };
}

export function httpLibraryTransport(): LibraryTransport {
  return {
    load() {
      return loadOverHttp<LibrarySummaries>("/api/library");
    },
  };
}

export const keptSummariesKey = keptKey("library-summaries");

export function keptLibraryTransport(transport: LibraryTransport): LibraryTransport {
  return {
    async load() {
      const loading = await transport.load();
      if (loading.outcome === "signed out") forgetKeptState();
      if (loading.outcome !== "loaded") return loading;
      markOwner();
      keeping(() => {
        localStorage.setItem(keptSummariesKey, JSON.stringify(loading.state.summaries));
      });
      return loading;
    },
  };
}

interface LibraryNotices {
  loadFailed: boolean;
  signedOut: boolean;
  libraryUpdated: boolean;
}

export interface LibraryStatuses {
  readonly loaded: boolean;
  readonly notices: LibraryNotices;
  summary(artifactId: string): Summary | undefined;
  retry(): void;
  subscribe(listener: () => void): () => void;
}

let pageStatuses: LibraryStatuses | undefined;
const waitingForStatuses: ((statuses: LibraryStatuses) => void)[] = [];

export function startLibraryStatuses({
  buildId,
  transport,
}: {
  buildId: string;
  transport: LibraryTransport;
}): LibraryStatuses {
  let loaded = false;
  let loadInFlight = false;
  let summaries: Record<string, Summary> = {};
  const notices: LibraryNotices = { loadFailed: false, signedOut: false, libraryUpdated: false };
  const listeners = new Set<() => void>();

  async function load() {
    if (loadInFlight || notices.signedOut) return;
    loadInFlight = true;
    const loading = await transport.load();
    loadInFlight = false;
    switch (loading.outcome) {
      case "loaded":
        loaded = true;
        notices.loadFailed = false;
        if (loading.state.buildId !== buildId) notices.libraryUpdated = true;
        summaries = loading.state.summaries;
        break;
      case "failed":
        if (!loaded) notices.loadFailed = true;
        break;
      case "signed out":
        notices.signedOut = true;
        notices.loadFailed = false;
        break;
    }
    for (const listener of listeners) listener();
  }

  function retry() {
    if (notices.loadFailed) void load();
  }

  keepFresh({ load: () => void load(), retry });
  void load();

  const statuses: LibraryStatuses = {
    get loaded() {
      return loaded;
    },
    get notices() {
      return { ...notices };
    },
    summary(artifactId) {
      return Object.hasOwn(summaries, artifactId) ? summaries[artifactId] : undefined;
    },
    retry,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  pageStatuses = statuses;
  for (const connect of waitingForStatuses.splice(0)) connect(statuses);
  return statuses;
}

export function whenLibraryStatusesStart(connect: (statuses: LibraryStatuses) => void): void {
  if (pageStatuses === undefined) waitingForStatuses.push(connect);
  else connect(pageStatuses);
}
