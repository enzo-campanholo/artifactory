export interface EyePose {
  lid: number;
  hover: number;
  look: { x: number; y: number };
  lift: number;
}

export interface EyeDrawing {
  outline: string;
  lashes: string;
  iris: { cx: number; cy: number; r: number };
  pupil: { cx: number; cy: number; r: number };
}

const centred = { x: 0, y: 0 };

export const eyePoses = {
  open: { lid: 0, hover: 0, look: centred, lift: 0 },
  shut: { lid: 1, hover: 0, look: centred, lift: 1 },
  widened: { lid: -0.2, hover: 1, look: centred, lift: 0 },
  peeking: { lid: 0.5, hover: 1, look: centred, lift: 1 },
} satisfies Record<string, EyePose>;

const left = 2;
const right = 34;
const middle = 18;
const restingCorner = 14;
const upperOpen = -6;
const restingLower = 26;
const irisCentre = 12;
const irisRadius = 4;
const pupilRadius = 1.5;
const pupilHovered = 0.75;
const reach = { x: 4.5, y: 2.25 };
const upperLashes = [
  [0.18, 2.5],
  [0.34, 3.5],
  [0.5, 4],
  [0.66, 3.5],
  [0.82, 2.5],
] as const;
const lowerLashes = [
  [0.32, 1.75],
  [0.5, 2.25],
  [0.68, 1.75],
] as const;
// A lash shorter than `shortestLash` would draw its square cap as a stub on the lid, not a lash.
// So below it a lash sinks into the lid, gone at `sunkLash`, rather than popping in or out as the
// lid moves.
const shortestLash = 1.25;
const sunkLash = 0.85;
// A shut eye is a lid sagging onto the lower lid with its lashes hanging, so drawn in the open
// eye's place it sits low in the box. Lift 1 raises it by this much, onto the open eye's centre.
// Lift goes with the pose the eye rests in rather than with the lid, so a blink or a peek doesn't
// move the eye.
const shutLift = 6;

const toHundredths = (value: number) => Math.round(value * 100) / 100;
const pathNumber = (value: number) => String(toHundredths(value));
const pathPoint = (x: number, y: number) => `${pathNumber(x)} ${pathNumber(y)}`;

function onLid(corner: number, control: number, along: number) {
  const x = left + (right - left) * along;
  const y = corner + 2 * (1 - along) * along * (control - corner);
  const dx = right - left;
  const dy = 2 * (1 - 2 * along) * (control - corner);
  const length = Math.hypot(dx, dy);
  return { x, y, normal: { x: dy / length, y: -dx / length } };
}

// Lashes stand on a lid along its normal, so they turn with the lid as it comes down.
function lashesOn(
  corner: number,
  control: number,
  lashes: readonly (readonly [number, number])[],
  scale: number,
) {
  return lashes
    .map(([along, length]) => ({ along, reached: drawnLength(length * scale) }))
    .filter(({ reached }) => reached !== 0)
    .map(({ along, reached }) => {
      const { x, y, normal } = onLid(corner, control, along);
      return `M${pathPoint(x, y)}l${pathPoint(normal.x * reached, normal.y * reached)}`;
    })
    .join("");
}

function drawnLength(length: number) {
  const magnitude = Math.abs(length);
  if (magnitude >= shortestLash) return length;
  if (magnitude <= sunkLash) return 0;
  return (Math.sign(length) * shortestLash * (magnitude - sunkLash)) / (shortestLash - sunkLash);
}

// Both lids are quadratic curves between the corners, and only the upper lid's control point
// moves: at lid 0 it's open, at lid 1 it lies on the lower lid. The outline is also the white the
// iris is clipped to, so the lid covers the iris rather than squashing it.
export function drawEye({ lid, hover, look, lift }: EyePose): EyeDrawing {
  const raised = shutLift * lift;
  const corner = restingCorner - raised;
  const upper = upperOpen + (restingLower - upperOpen) * lid - raised;
  const lowerLid = restingLower - raised;
  const upperScale = Math.max(-1, Math.min(1, (corner - upper) / (restingCorner - upperOpen)));
  const lowerScale = Math.max(0, 1 - 1.6 * lid);
  const cx = toHundredths(middle + reach.x * look.x);
  const cy = toHundredths(irisCentre - raised + reach.y * look.y);
  const upperLid = `M${pathPoint(left, corner)}Q${pathPoint(middle, upper)} ${pathPoint(right, corner)}`;
  return {
    outline: `${upperLid}Q${pathPoint(middle, lowerLid)} ${pathPoint(left, corner)}Z`,
    lashes:
      lashesOn(corner, upper, upperLashes, upperScale) +
      lashesOn(corner, lowerLid, lowerLashes, -lowerScale),
    iris: { cx, cy, r: irisRadius },
    pupil: { cx, cy, r: toHundredths(pupilRadius - (pupilRadius - pupilHovered) * hover) },
  };
}
