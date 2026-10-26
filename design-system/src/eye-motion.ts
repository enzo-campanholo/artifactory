import { drawEye, eyePoses, type EyePose } from "./eye-drawing.ts";

// A blink while open, a peek while shut.
interface Glance {
  lid: number;
  toLidTau: number;
  holdMs: number;
  backTau: number;
  intervalMs: readonly [number, number];
}

const blink: Glance = {
  lid: 1,
  toLidTau: 22,
  holdMs: 85,
  backTau: 65,
  intervalMs: [2500, 7500],
};

const peek: Glance = {
  lid: 0.3,
  toLidTau: 90,
  holdMs: 900,
  backTau: 110,
  intervalMs: [6000, 14000],
};

interface EyeParts {
  white: Element;
  outline: Element;
  lashes: Element;
  iris: Element;
  pupil: Element;
}

interface Behaviour {
  rest: EyePose;
  hover: EyePose;
  glance: Glance;
}

const behaviours: Record<"open" | "shut", Behaviour> = {
  open: { rest: eyePoses.open, hover: eyePoses.widened, glance: blink },
  shut: { rest: eyePoses.shut, hover: eyePoses.peeking, glance: peek },
};

export interface EyeMotion {
  rest(shut: boolean): void;
  stop(): void;
}

const pressTau = 75;
const hoverTau = 80;
const pupilTau = 110;
const lookTau = 90;
const fullLookPx = 160;
const tapSlopPx = 10;
const settled = 0.002;

const ease = (value: number, target: number, tau: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-dt / tau));

const between = ([least, most]: readonly [number, number]) =>
  least + Math.random() * (most - least);

function partOf(drawing: SVGSVGElement, name: keyof EyeParts) {
  const part = drawing.querySelector(`.eye-drawing-${name}`);
  if (part === null) throw new Error(`The eye's drawing has no ${name}`);
  return part;
}

// Every frame each value of the pose eases toward its target from wherever it is, so a new target
// midway through a blink, a hover or a press never jumps. The loop runs only while something is
// still moving and the eye can be seen; otherwise a timer waits for the next blink or peek.
class Motion implements EyeMotion {
  readonly #drawing: SVGSVGElement;
  readonly #parts: EyeParts;
  readonly #motionAllowed = matchMedia("(prefers-reduced-motion: no-preference)");
  readonly #inViewObserver: IntersectionObserver;
  readonly #listening = new AbortController();
  readonly #pose: EyePose;
  #shut: boolean;
  #inView = false;
  #hovering = false;
  #pressedWhileHovering = false;
  #pointer: { x: number; y: number } | undefined;
  #touchStart: { id: number; x: number; y: number } | undefined;
  #glance: { until: number; back: boolean } | undefined;
  #nextGlance: number | undefined;
  #lidTau = pressTau;
  #lastFrame = 0;
  #frame = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(drawing: SVGSVGElement, hoverArea: HTMLElement, shut: boolean) {
    this.#drawing = drawing;
    this.#shut = shut;
    this.#parts = {
      white: partOf(drawing, "white"),
      outline: partOf(drawing, "outline"),
      lashes: partOf(drawing, "lashes"),
      iris: partOf(drawing, "iris"),
      pupil: partOf(drawing, "pupil"),
    };
    this.#pose = { ...this.#behaviour.rest };
    this.#paint();
    this.#inViewObserver = new IntersectionObserver(([entry]) => {
      this.#inView = entry?.isIntersecting ?? false;
      this.#update();
    });
    this.#inViewObserver.observe(drawing);
    const listening = { signal: this.#listening.signal };
    const passive = { ...listening, passive: true };
    this.#motionAllowed.addEventListener("change", this.#update, listening);
    document.addEventListener("visibilitychange", this.#update, listening);
    addEventListener("pointermove", this.#pointerMoved, passive);
    addEventListener("pointerdown", this.#touchBegan, passive);
    addEventListener("pointerup", this.#touchEnded, passive);
    addEventListener("pointercancel", this.#touchCancelled, passive);
    addEventListener("scroll", this.#wake, passive);
    hoverArea.addEventListener("pointerenter", this.#entered, listening);
    hoverArea.addEventListener("pointerleave", this.#left, listening);
    hoverArea.addEventListener("click", this.#pressed, listening);
  }

  rest(shut: boolean) {
    if (shut === this.#shut) return;
    this.#shut = shut;
    this.#forgetGlance();
    this.#lidTau = pressTau;
    this.#update();
  }

  stop() {
    this.#halt();
    this.#inViewObserver.disconnect();
    this.#listening.abort();
  }

  get #running() {
    return this.#motionAllowed.matches && this.#inView && document.visibilityState === "visible";
  }

  get #behaviour() {
    return behaviours[this.#shut ? "shut" : "open"];
  }

  #forgetGlance() {
    this.#glance = undefined;
    this.#nextGlance = undefined;
  }

  readonly #update = () => {
    if (this.#running) {
      this.#wake();
      return;
    }
    this.#halt();
    this.#forgetGlance();
    Object.assign(this.#pose, this.#behaviour.rest);
    this.#paint();
  };

  readonly #wake = () => {
    if (!this.#running || this.#frame !== 0) return;
    clearTimeout(this.#timer);
    this.#lastFrame = performance.now();
    this.#frame = requestAnimationFrame(this.#step);
  };

  #halt() {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    clearTimeout(this.#timer);
  }

  readonly #step = (now: number) => {
    this.#frame = 0;
    const dt = Math.min(64, Math.max(0, now - this.#lastFrame));
    this.#lastFrame = now;
    const { rest, hover, glance } = this.#behaviour;
    const hovered = this.#hovering && !this.#pressedWhileHovering;
    this.#nextGlance ??= now + between(glance.intervalMs);
    if (this.#glance === undefined && now >= this.#nextGlance) {
      if (hovered) this.#nextGlance = now + between(glance.intervalMs);
      else {
        this.#glance = { until: now + glance.holdMs, back: false };
        this.#nextGlance = this.#glance.until + between(glance.intervalMs);
        this.#lidTau = glance.toLidTau;
      }
    }
    if (this.#glance !== undefined && !this.#glance.back && now >= this.#glance.until) {
      this.#glance.back = true;
      this.#lidTau = glance.backTau;
    }

    const glancing = this.#glance !== undefined && !this.#glance.back;
    const target = {
      lid: glancing ? glance.lid : hovered ? hover.lid : rest.lid,
      hover: hovered ? 1 : 0,
      look: this.#look(),
      lift: rest.lift,
    };
    const pose = this.#pose;
    pose.lid = ease(pose.lid, target.lid, this.#lidTau, dt);
    pose.lift = ease(pose.lift, target.lift, pressTau, dt);
    pose.hover = ease(pose.hover, target.hover, pupilTau, dt);
    pose.look = {
      x: ease(pose.look.x, target.look.x, lookTau, dt),
      y: ease(pose.look.y, target.look.y, lookTau, dt),
    };

    const still =
      Math.abs(pose.lid - target.lid) < settled &&
      Math.abs(pose.lift - target.lift) < settled &&
      Math.abs(pose.hover - target.hover) < settled &&
      Math.abs(pose.look.x - target.look.x) < settled &&
      Math.abs(pose.look.y - target.look.y) < settled;
    if (still && !glancing) {
      Object.assign(pose, target);
      this.#glance = undefined;
      this.#paint();
      this.#timer = setTimeout(this.#wake, this.#nextGlance - now);
      return;
    }
    this.#paint();
    this.#frame = requestAnimationFrame(this.#step);
  };

  #look() {
    if (this.#pointer === undefined) return { x: 0, y: 0 };
    const box = this.#drawing.getBoundingClientRect();
    const dx = this.#pointer.x - (box.left + box.width / 2);
    const dy = this.#pointer.y - (box.top + box.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return { x: 0, y: 0 };
    const reach = Math.min(1, distance / fullLookPx) / distance;
    return { x: dx * reach, y: dy * reach };
  }

  #paint() {
    const { outline, lashes, iris, pupil } = drawEye(this.#pose);
    const parts = this.#parts;
    parts.white.setAttribute("d", outline);
    parts.outline.setAttribute("d", outline);
    parts.lashes.setAttribute("d", lashes);
    for (const [circle, { cx, cy, r }] of [
      [parts.iris, iris],
      [parts.pupil, pupil],
    ] as const) {
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(r));
    }
  }

  #lookAt(x: number, y: number) {
    this.#pointer = { x, y };
    this.#wake();
  }

  readonly #pointerMoved = ({ pointerType, clientX, clientY }: PointerEvent) => {
    if (pointerType !== "touch") this.#lookAt(clientX, clientY);
  };

  // On a phone the pupil looks only where a tap lands: a touch that scrolls the page ends in
  // `pointercancel`, and one that drags without scrolling ends too far from where it began.
  readonly #touchBegan = ({ pointerType, pointerId, clientX, clientY }: PointerEvent) => {
    if (pointerType === "touch") this.#touchStart = { id: pointerId, x: clientX, y: clientY };
  };

  readonly #touchEnded = ({ pointerId, clientX, clientY }: PointerEvent) => {
    const start = this.#touchStart;
    if (start?.id !== pointerId) return;
    this.#touchStart = undefined;
    if (Math.hypot(clientX - start.x, clientY - start.y) <= tapSlopPx)
      this.#lookAt(clientX, clientY);
  };

  readonly #touchCancelled = ({ pointerId }: PointerEvent) => {
    if (this.#touchStart?.id === pointerId) this.#touchStart = undefined;
  };

  readonly #entered = ({ pointerType }: PointerEvent) => {
    if (pointerType === "touch") return;
    this.#hovering = true;
    this.#lidTau = hoverTau;
    this.#wake();
  };

  readonly #left = () => {
    this.#hovering = false;
    this.#pressedWhileHovering = false;
    this.#lidTau = hoverTau;
    this.#wake();
  };

  readonly #pressed = () => {
    if (this.#hovering) this.#pressedWhileHovering = true;
  };
}

export function animateEye(
  drawing: SVGSVGElement,
  hoverArea: HTMLElement,
  shut: boolean,
): EyeMotion {
  return new Motion(drawing, hoverArea, shut);
}
