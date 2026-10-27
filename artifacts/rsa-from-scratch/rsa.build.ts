import { defineBuild, type CellChange, type Mark, type Step } from "@artifactory/design-system/stage-build";

// The drawing's parts and the table's rows, in the order the run fills them.
const order = ["p", "q", "n", "phi", "e", "d", "m", "c", "m2"] as const;
type Name = (typeof order)[number];
const row: Record<Name, string> = {
  p: "p",
  q: "q",
  n: "n",
  phi: "φ",
  e: "e",
  d: "d",
  m: "m",
  c: "c",
  m2: "m′",
};

const superscript = (k: number) => String(k).replace(/\d/g, (digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)] ?? digit);

function smallestFactor(k: number): number {
  for (let f = 2; f * f <= k; f++) if (k % f === 0) return f;
  return k;
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function inverse(e: number, phi: number): number {
  let [r0, r1, t0, t1] = [phi, e, 0, 1];
  while (r1 !== 0) {
    const k = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - k * r1];
    [t0, t1] = [t1, t0 - k * t1];
  }
  return ((t0 % phi) + phi) % phi;
}

function powMod(base: number, e: number, n: number): number {
  let result = 1;
  base %= n;
  while (e > 0) {
    if (e % 2 === 1) result = (result * base) % n;
    base = (base * base) % n;
    e = Math.floor(e / 2);
  }
  return result;
}

function nearPrimes(k: number): string {
  let below = k - 1;
  while (below >= 2 && smallestFactor(below) !== below) below--;
  let above = k + 1;
  while (smallestFactor(above) !== above) above++;
  return below >= 2 ? `${String(below)} or ${String(above)}` : String(above);
}

export default defineBuild<{ p: number; q: number; e: number; m: number }>({
  steps({ p, q, e, m }) {
    const values: Partial<Record<Name, [string, string]>> = {};
    const steps: Step[] = [];
    const step = (now: Name, say: string, settled: Name[] = []) => {
      const parts: Record<string, Mark> = {};
      const rows: Record<string, Mark> = {};
      for (const name of order) if (values[name] !== undefined) parts[name] = "strong";
      for (const name of settled) parts[name] = "strong";
      parts[now] = "reversed";
      rows[row[now]] = "reversed";
      const cells: CellChange[] = order.flatMap((name) => {
        const [value, how] = values[name] ?? ["?", ""];
        return [
          { row: row[name], column: "Value", text: value },
          { row: row[name], column: "Worked out", text: how },
        ];
      });
      steps.push({ say, parts, rows, cells });
    };

    for (const [name, k] of [["p", p], ["q", q]] as const) {
      const factor = smallestFactor(k);
      if (factor !== k) {
        values[name] = [String(k), `${String(factor)} × ${String(k / factor)}`];
        step(name, `${name} is ${String(k)}, which isn't prime: ${String(factor)} divides it. Choose a prime for ${name}, such as ${nearPrimes(k)}.`);
        return steps;
      }
      values[name] = [String(k), "prime"];
      step(name, `${name} is ${String(k)}, a prime: no number from 2 up to its square root divides it.`);
    }
    if (p === q) {
      step("q", `p and q are both ${String(p)}. They must be two different primes, or φ isn't p minus 1 times q minus 1. Choose another prime for q.`);
      return steps;
    }

    const n = p * q;
    values.n = [String(n), `${String(p)} × ${String(q)}`];
    step("n", `n is p times q: ${String(p)} times ${String(q)} is ${String(n)}. Bob will publish n.`);

    const phi = (p - 1) * (q - 1);
    values.phi = [String(phi), `${String(p - 1)} × ${String(q - 1)}`];
    step("phi", `φ is p minus 1 times q minus 1: ${String(p - 1)} times ${String(q - 1)} is ${String(phi)}. Bob keeps it secret.`);

    let fit = 3;
    while (fit < phi && gcd(fit, phi) !== 1) fit++;
    const suggestion = fit < phi ? ` Choose an e that does, such as ${String(fit)}.` : " No e between 1 and φ does: choose larger primes.";
    if (e >= phi) {
      values.e = [String(e), `not below ${String(phi)}`];
      step("e", `e is ${String(e)}, but it must lie between 1 and φ, ${String(phi)}.${suggestion}`);
      return steps;
    }
    const shared = gcd(e, phi);
    if (shared !== 1) {
      values.e = [String(e), `gcd(${String(e)}, ${String(phi)}) = ${String(shared)}`];
      step("e", `e is ${String(e)}, which shares the factor ${String(shared)} with φ, ${String(phi)}, so it has no inverse modulo φ.${suggestion}`);
      return steps;
    }
    values.e = [String(e), `gcd(${String(e)}, ${String(phi)}) = 1`];
    step("e", `e is ${String(e)}, which shares no factor with φ, ${String(phi)}, so it has an inverse modulo φ. Bob will publish e.`);

    const d = inverse(e, phi);
    const k = (e * d - 1) / phi;
    values.d = [String(d), `${String(e)} × ${String(d)} = ${String(k)} × ${String(phi)} + 1`];
    step("d", `d is ${String(d)}, the inverse of e modulo φ: ${String(e)} times ${String(d)} is ${String(e * d)}, one more than ${String(k)} times ${String(phi)}.`);

    step("n", `Bob publishes the public key, n = ${String(n)} and e = ${String(e)}, and keeps d = ${String(d)} with p, q and φ.`, ["e"]);

    values.m = [String(m), m < n ? `below ${String(n)}` : `not below ${String(n)}`];
    step(
      "m",
      m < n
        ? `Alice's message is m = ${String(m)}, a number below n.`
        : `Alice's message is m = ${String(m)}, which isn't below n, ${String(n)}. Watch what comes back.`,
    );

    const c = powMod(m, e, n);
    values.c = [String(c), `${String(m)}${superscript(e)} mod ${String(n)}`];
    step("c", `Alice raises m to the power e and keeps the remainder by n: ${String(m)} to the ${String(e)}, modulo ${String(n)}, is ${String(c)}. She sends c = ${String(c)}, and anyone may see it.`);

    const back = powMod(c, d, n);
    values.m2 = [String(back), `${String(c)}${superscript(d)} mod ${String(n)}`];
    step(
      "m2",
      back === m
        ? `Bob raises c to the power d: ${String(c)} to the ${String(d)}, modulo ${String(n)}, is ${String(back)}, Alice's message.`
        : `Bob raises c to the power d: ${String(c)} to the ${String(d)}, modulo ${String(n)}, is ${String(back)}, not ${String(m)}. Decryption gives back the remainder of m by n, so a message must be below n.`,
    );
    return steps;
  },
});
