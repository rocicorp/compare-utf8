// @ts-check
import { faker } from "@faker-js/faker";
import { bench, do_not_optimize, group, run, summary } from "mitata";
import { compareUTF8 } from "./index.js";

// ---------------------------------------------------------------------------
// Data generation helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} s
 * @param {string} nonAscii
 * @returns {[string, string]}
 */
function pairWithNonAsciiAtEnd(s, nonAscii) {
  // Trim so the non-ASCII ends up truly at the end after a common prefix.
  const base = s.slice(0, Math.max(1, s.length - nonAscii.length));
  return [base + nonAscii, base + nonAscii + "z"];
}

/**
 * Generate a random ASCII-only string of roughly `len` characters.
 * @param {number} len
 */
function asciiString(len) {
  return faker.string.alphanumeric(len);
}

/**
 * Generate a string of roughly `len` characters that contains non-ASCII.
 * @param {number} len
 */
function mixedString(len) {
  // Use a word that's likely to contain accented / CJK characters if we ask
  // for a locale-sensitive word; fall back to inserting emoji explicitly.
  const base = faker.string.alphanumeric(Math.max(1, len - 4));
  // Sprinkle some non-ASCII in the middle.
  return (
    base.slice(0, base.length >> 1) + "日本語" + base.slice(base.length >> 1)
  );
}

/**
 * Generate a BMP-only string that contains no ASCII — pure CJK ideographs.
 * The BMP fast path fires here but the ASCII fast path does not.
 * @param {number} len
 */
function cjkString(len) {
  // CJK Unified Ideographs U+4E00–U+9FFF (20992 chars)
  return Array.from({ length: len }, () =>
    String.fromCharCode(0x4e00 + Math.floor(Math.random() * 0x1000)),
  ).join("");
}

/**
 * Build a pair of strings that share a long common prefix and differ at index
 * ~`len`. This exercises the worst-case loop iteration count.
 * @param {(n: number) => string} make
 * @param {number} len
 * @returns {[string, string]}
 */
function worstCasePair(make, len) {
  const s = make(len);
  // Produce two strings that are equal for the whole prefix and differ at
  // the very last code unit.
  const a = s;
  const b = s.slice(0, -1) + (s.charCodeAt(s.length - 1) === 97 ? "b" : "a");
  return [a, b];
}

// ---------------------------------------------------------------------------
// Pre-generate all pairs so data generation cost is excluded from benchmarks.
// ---------------------------------------------------------------------------

// Short ~8 chars
const shortAscii = worstCasePair(asciiString, 8);
const shortMixed = worstCasePair(mixedString, 8);
const shortMixedEnd = pairWithNonAsciiAtEnd(asciiString(6), "日");
const shortCJK = worstCasePair(cjkString, 8);

// Medium ~64 chars
const mediumAscii = worstCasePair(asciiString, 64);
const mediumMixed = worstCasePair(mixedString, 64);
const mediumMixedEnd = pairWithNonAsciiAtEnd(asciiString(60), "日本語");
const mediumCJK = worstCasePair(cjkString, 64);

// Large ~1024 chars
const largeAscii = worstCasePair(asciiString, 1024);
const largeMixed = worstCasePair(mixedString, 1024);
const largeMixedEnd = pairWithNonAsciiAtEnd(asciiString(1020), "日本語🌸");
const largeCJK = worstCasePair(cjkString, 1024);

// ---------------------------------------------------------------------------
// Comparators
// ---------------------------------------------------------------------------

/** @param {string} a @param {string} b @returns {number} */
const jsLt = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** @param {string} a @param {string} b @returns {number} */
const locale = (a, b) => a.localeCompare(b);

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

summary(() =>
  group("short ascii", () => {
    const [a, b] = shortAscii;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("short mixed (non-ascii in middle)", () => {
    const [a, b] = shortMixed;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("short mixed (non-ascii at end / worst case)", () => {
    const [a, b] = shortMixedEnd;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("medium ascii", () => {
    const [a, b] = mediumAscii;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("medium mixed (non-ascii in middle)", () => {
    const [a, b] = mediumMixed;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("medium mixed (non-ascii at end / worst case)", () => {
    const [a, b] = mediumMixedEnd;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("large ascii", () => {
    const [a, b] = largeAscii;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("large mixed (non-ascii in middle)", () => {
    const [a, b] = largeMixed;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("large mixed (non-ascii at end / worst case)", () => {
    const [a, b] = largeMixedEnd;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

// CJK-only groups: BMP fast path fires, ASCII fast path does not.
// These directly show the advantage of the surrogate-check approach.
summary(() =>
  group("short CJK (BMP only)", () => {
    const [a, b] = shortCJK;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("medium CJK (BMP only)", () => {
    const [a, b] = mediumCJK;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

summary(() =>
  group("large CJK (BMP only)", () => {
    const [a, b] = largeCJK;
    bench("compareUTF8", () => {
      const res = compareUTF8(a, b);
      do_not_optimize(res);
    });
    bench("js <", () => {
      const res = jsLt(a, b);
      do_not_optimize(res);
    });
    bench("localeCompare", () => {
      const res = locale(a, b);
      do_not_optimize(res);
    });
  }),
);

run();
