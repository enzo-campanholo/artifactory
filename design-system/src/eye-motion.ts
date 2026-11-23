import { drawEye, eyePoses, type EyePose } from "./eye-drawing.ts";

// Every value of the pose moves as a spring of this one time constant, so the eye's movements read
// as one creature's. Only a blink closes faster, in half a beat, as a real one does.
const beatMs = 50;

// A blink while open, a peek while shut.
interface Glance {
  lid: number;
  toLidMs: number;
  holdMs: number;
  intervalMs: readonly [number, number];
}

const blink: Glance = {
  lid: 1,
  toLidMs: beatMs / 2,
  holdMs: 30,
  intervalMs: [2500, 7500],
};

const peek: Glance = {
  lid: 0.3,
  toLidMs: beatMs,
  holdMs: 700,
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

const channels = ["lid", "lift", "hover", "lookX", "lookY"] as const;
type Channel = (typeof channels)[number];

interface Spring {
  value: number;
  velocity: number;
}

const fullLookPx = 160;
const tapSlopPx = 10;
const arrivedWithin = 0.05;
const settled = 0.002;

// A critically damped spring rather than easing toward the target, because it keeps its velocity
// when the target changes: a movement interrupted by another bends into it instead of jumping. It
// takes the exact solution over the frame, so a long frame can't overshoot.
function pull(spring: Spring, target: number, tauMs: number, dt: number) {
  const offset = spring.value - target;
  const drift = spring.velocity + offset / tauMs;
  const decay = Math.exp(-dt / tauMs);
  spring.value = target + (offset + drift * dt) * decay;
  spring.velocity = (spring.velocity - (drift * dt) / tauMs) * decay;
}

const between = ([least, most]: readonly [number, number]) =>
  least + Math.random() * (most - least);

function partOf(drawing: SVGSVGElement, name: keyof EyeParts) {
  const part = drawing.querySelector(`.eye-drawing-${name}`);
  if (part === null) throw new Error(`The eye's drawing has no ${name}`);
  return part;
}

function valuesOf({ lid, lift, hover, look }: EyePose): Record<Channel, number> {
  return { lid, lift, hover, lookX: look.x, lookY: look.y };
}

const restingAt = (values: Record<Channel, number>) =>
  Object.fromEntries(
    channels.map((channel) => [channel, { value: values[channel], velocity: 0 }]),
  ) as Record<Channel, Spring>;

// The loop runs only while something is still moving and the eye can be seen; otherwise a timer
// waits for the next blink or peek.
class Motion implements EyeMotion {
  readonly #drawing: SVGSVGElement;
  readonly #parts: EyeParts;
  readonly #motionAllowed = matchMedia("(prefers-reduced-motion: no-preference)");
  readonly #inViewObserver: IntersectionObserver;
  readonly #listening = new AbortController();
  #springs: Record<Channel, Spring>;
  #shut: boolean;
  #inView = false;
  #hovering = false;
  #pressedWhileHovering = false;
  #pointer: { x: number; y: number } | undefined;
  #touchStart: { id: number; x: number; y: number } | undefined;
  #glance: { heldUntil: number | undefined; back: boolean } | undefined;
  #nextGlance: number | undefined;
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
    this.#springs = restingAt(valuesOf(this.#behaviour.rest));
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
    this.#springs = restingAt(valuesOf(this.#behaviour.rest));
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
    const springs = this.#springs;
    this.#nextGlance ??= now + between(glance.intervalMs);
    if (this.#glance === undefined && now >= this.#nextGlance) {
      if (hovered) this.#nextGlance = now + between(glance.intervalMs);
      else this.#glance = { heldUntil: undefined, back: false };
    }
    const underway = this.#glance;
    if (underway !== undefined && !underway.back) {
      // The hold starts once the lid arrives, not at a fixed time, so a blink always closes before
      // it reopens.
      if (
        underway.heldUntil === undefined &&
        Math.abs(springs.lid.value - glance.lid) < arrivedWithin
      )
        underway.heldUntil = now + glance.holdMs;
      if (underway.heldUntil !== undefined && now >= underway.heldUntil) {
        underway.back = true;
        this.#nextGlance = now + between(glance.intervalMs);
      }
    }

    const glancing = underway !== undefined && !underway.back;
    const look = this.#look();
    const target: Record<Channel, number> = {
      lid: glancing ? glance.lid : hovered ? hover.lid : rest.lid,
      lift: rest.lift,
      hover: hovered ? 1 : 0,
      lookX: look.x,
      lookY: look.y,
    };
    for (const channel of channels)
      pull(
        springs[channel],
        target[channel],
        channel === "lid" && glancing ? glance.toLidMs : beatMs,
        dt,
      );
    // A press while a blink is closing hands the blink's speed on to the press, which would carry the
    // upper lid a hair past the lower one.
    if (springs.lid.value > eyePoses.shut.lid)
      springs.lid = { value: eyePoses.shut.lid, velocity: 0 };

    const still = channels.every(
      (channel) =>
        Math.abs(springs[channel].value - target[channel]) < settled &&
        Math.abs(springs[channel].velocity) * beatMs < settled,
    );
    if (still && !glancing) {
      this.#springs = restingAt(target);
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
    const { lid, lift, hover, lookX, lookY } = this.#springs;
    const { outline, lashes, iris, pupil } = drawEye({
      lid: lid.value,
      lift: lift.value,
      hover: hover.value,
      look: { x: lookX.value, y: lookY.value },
    });
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
    this.#wake();
  };

  readonly #left = () => {
    this.#hovering = false;
    this.#pressedWhileHovering = false;
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
