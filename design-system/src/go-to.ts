// The frame's scroll padding keeps a target clear of the sticky state notices.
export function measureNotices(): void {
  const notices = document.querySelector<HTMLElement>(".state-notices");
  if (notices === null) return;
  document.documentElement.style.setProperty(
    "--artifact-notices-size",
    `${String(notices.offsetHeight)}px`,
  );
}

export function goTo(target: HTMLElement, hash?: string): void {
  if (hash !== undefined) history.pushState(history.state, "", hash);
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  // The action that called this may have just shown a notice, before a ResizeObserver reports it.
  measureNotices();
  target.scrollIntoView({
    block: "start",
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}
