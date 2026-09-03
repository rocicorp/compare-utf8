// @ts-check

/**
 * @param {number} aCodePoint
 * @returns {number}
 */
export function utf16LengthForCodePoint(aCodePoint) {
  return aCodePoint > 0xffff ? 2 : 1;
}

/** Matches any surrogate code unit (U+D800–U+DFFF). */
const surrogateRe = /[\uD800-\uDFFF]/;

/**
 * Below this length the scalar loop is cheaper than bisecting with slices.
 * V8's loop runs ~1 ns per code unit, Hermes' ~40 ns; 64 is a compromise that
 * is near break-even on V8 and a large win on Hermes.
 */
const BISECT_MIN_LENGTH = 64;

/**
 * Scalar comparison. Defines the ordering: lexicographic over the sequence of
 * scalar values, where a valid surrogate pair is one element (its code point)
 * and a lone surrogate is one element with its own code unit value. For
 * well-formed strings this is exactly UTF-8 byte order. For ill-formed strings
 * it is still a total order, which a sorted container needs. The fast paths in
 * `compareUTF8` must agree with it for every input.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareSlow(a, b) {
  const aLength = a.length;
  const bLength = b.length;
  const length = aLength > bLength ? bLength : aLength;
  let i = 0;
  if (length >= BISECT_MIN_LENGTH) {
    // Long strings: find the common prefix length by bisecting with native
    // slice equality (memcmp speed) instead of a per-code-unit JS loop.
    // `startsWith` is much slower than `===` here on V8, so compare slices.
    // Invariant: a and b agree on [0, lo).
    let lo = 0;
    let hi = length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (a.slice(0, mid) === b.slice(0, mid)) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    i = lo;
  }
  for (; i < length; i++) {
    const ac = a.charCodeAt(i);
    const bc = b.charCodeAt(i);
    if (ac !== bc) {
      if (i > 0) {
        // If the shared previous unit is a high surrogate, the element that
        // contains it is a pair in a string whose unit i is a low surrogate
        // and a lone surrogate otherwise. Those elements must be compared as
        // code points before looking at unit i on its own; comparing unit i
        // directly would order a pair below a lone high surrogate followed
        // by a larger BMP unit and break transitivity.
        const prev = a.charCodeAt(i - 1);
        if (prev >= 0xd800 && prev <= 0xdbff) {
          const d =
            /** @type {number} */ (a.codePointAt(i - 1)) -
            /** @type {number} */ (b.codePointAt(i - 1));
          if (d !== 0) return d;
        }
      }
      // For all non-surrogate BMP code units (0x0000–0xD7FF and 0xE000–0xFFFF),
      // UTF-16 code-unit order equals UTF-8 byte order, so a subtraction suffices.
      if ((ac < 0xd800 || ac > 0xdfff) && (bc < 0xd800 || bc > 0xdfff)) {
        return ac - bc;
      }
      // Surrogate involved: compare the elements starting at i as code points
      // (a lone surrogate's code point is its own unit value).
      return (
        /** @type {number} */ (a.codePointAt(i)) -
        /** @type {number} */ (b.codePointAt(i))
      );
    }
  }
  return aLength - bLength;
}

/**
 * Compares two JavaScript strings as if they were UTF-8 encoded byte arrays.
 *
 * Designed to be cheap on both JIT engines (V8) and interpreters (Hermes),
 * where every builtin call costs tens of nanoseconds:
 *
 * 1. Identity check.
 * 2. Probe the first code unit. Unrelated strings usually differ here, and one
 *    `charCodeAt` per side is the cheapest way to find out.
 * 3. Otherwise let the engine compare natively (memcmp-speed). UTF-16 order can
 *    only disagree with UTF-8 order when the natively *smaller* string has a
 *    surrogate at the first differing position (and the larger has a code unit
 *    in U+E000–U+FFFF there). So a single surrogate test on the smaller string
 *    proves the native answer correct; only strings that actually contain
 *    surrogates fall back to the scalar comparison.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareUTF8(a, b) {
  if (a === b) return 0;

  const ac = a.charCodeAt(0);
  const bc = b.charCodeAt(0);
  if (ac !== bc) {
    // An empty string yields NaN above and always lands here; it is a prefix
    // of anything and sorts first.
    if (a.length === 0) return -1;
    if (b.length === 0) return 1;
    if ((ac < 0xd800 || ac > 0xdfff) && (bc < 0xd800 || bc > 0xdfff)) {
      return ac - bc;
    }
    return (
      /** @type {number} */ (a.codePointAt(0)) -
      /** @type {number} */ (b.codePointAt(0))
    );
  }

  if (a < b) {
    return surrogateRe.test(a) ? compareSlow(a, b) : -1;
  }
  return surrogateRe.test(b) ? compareSlow(a, b) : 1;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function greaterThan(a, b) {
  return compareUTF8(a, b) > 0;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function greaterThanEq(a, b) {
  return compareUTF8(a, b) >= 0;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function lessThan(a, b) {
  return compareUTF8(a, b) < 0;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function lessThanEq(a, b) {
  return compareUTF8(a, b) <= 0;
}
