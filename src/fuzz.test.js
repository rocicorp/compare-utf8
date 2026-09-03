// @ts-check
import { expect, test } from "vitest";
import { compareUTF8 } from "./index.js";

/**
 * @param {Uint8Array} x
 * @param {Uint8Array} y
 */
function compareBytes(x, y) {
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

let seed = 0x9e3779b9;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
/** @template T @param {T[]} xs @returns {T} */
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];

// Boundary code points around every place UTF-16 and UTF-8 order could differ.
const WELL_FORMED = [
  "",
  "a",
  "b",
  "z",
  "",
  "",
  "߿",
  "ࠀ",
  "퟿",
  "",
  "￾",
  "￿",
  "\u{10000}",
  "\u{10001}",
  "\u{1d655}",
  "\u{10fffe}",
  "\u{10ffff}",
  "Ｚ",
  "\u{1f600}",
  "\u{1f41b}",
];

const LONE_SURROGATES = ["\ud800", "\udbff", "\udc00", "\udfff"];

/**
 * @param {string[]} pieces
 * @param {number} maxPieces
 */
function randomString(pieces, maxPieces) {
  let s = "";
  const n = Math.floor(rnd() * (maxPieces + 1));
  for (let i = 0; i < n; i++) s += pick(pieces);
  return s;
}

/**
 * Well-formed strings: short random combinations of boundary code points, plus
 * long strings (past the bisection threshold) with surrogate pairs at various
 * positions and long shared prefixes.
 */
function wellFormedStrings() {
  const strings = [...WELL_FORMED];
  for (let i = 0; i < 1500; i++) strings.push(randomString(WELL_FORMED, 6));
  for (let len = 1; len <= 40; len++) {
    const prefix = randomString(WELL_FORMED, len);
    strings.push(prefix, prefix + "a", prefix + "￿", prefix + "\u{10000}");
  }
  for (let len = 60; len <= 300; len += 37) {
    const ascii = "x".repeat(len);
    const half = len >> 1;
    const withSurrogate = "\u{1f600}" + ascii;
    strings.push(
      ascii,
      ascii + "a",
      ascii + "￿",
      ascii + "\u{10000}",
      withSurrogate,
      withSurrogate + "a",
      withSurrogate + "￿",
      withSurrogate + "\u{10000}",
      ascii.slice(0, half) + "\u{1f600}" + ascii.slice(half),
      ascii.slice(0, half) + "￿" + ascii.slice(half),
    );
  }
  return strings;
}

test("fuzz: matches UTF-8 byte order for well-formed strings", () => {
  const enc = new TextEncoder();
  const items = wellFormedStrings().map((s) => ({ s, bytes: enc.encode(s) }));
  for (const a of items) {
    for (const b of items) {
      const expected = Math.sign(compareBytes(a.bytes, b.bytes));
      const actual = Math.sign(compareUTF8(a.s, b.s));
      if (actual !== expected) {
        throw new Error(
          `compareUTF8(${JSON.stringify(a.s)}, ${JSON.stringify(b.s)}) = ${actual}, expected ${expected}`,
        );
      }
    }
  }
});

test("fuzz: total order, including lone surrogates", () => {
  // TextEncoder cannot be the oracle here (it maps every lone surrogate to
  // U+FFFD), so check the order properties a comparator must have instead.
  const pieces = [...WELL_FORMED, ...LONE_SURROGATES];
  const strings = [...pieces];
  for (let i = 0; i < 400; i++) strings.push(randomString(pieces, 5));
  for (let len = 60; len <= 300; len += 60) {
    const ascii = "x".repeat(len);
    for (const lone of LONE_SURROGATES) {
      strings.push(ascii + lone, ascii + lone + "a", lone + ascii);
    }
  }

  for (const a of strings) {
    expect(compareUTF8(a, a)).toBe(0);
    for (const b of strings) {
      // Signs must cancel (sum rather than negate: -Math.sign(0) is -0).
      expect(Math.sign(compareUTF8(a, b)) + Math.sign(compareUTF8(b, a))).toBe(
        0,
      );
    }
  }

  // Transitivity: once sorted, every earlier element must compare <= every
  // later one, not just its neighbour.
  const sorted = [...strings].sort(compareUTF8);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (compareUTF8(sorted[i], sorted[j]) > 0) {
        throw new Error(
          `not transitive: ${JSON.stringify(sorted[i])} sorted before ${JSON.stringify(sorted[j])} but compares greater`,
        );
      }
    }
  }
});
