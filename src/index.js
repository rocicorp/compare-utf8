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
 * Compares two JavaScript strings as if they were UTF-8 encoded byte arrays.
 *
 * Fast path: for strings without surrogate pairs (BMP-only), JS code-unit
 * order is identical to UTF-8 byte order, so native `<` suffices. For longer
 * strings the regex check is cheaper than scanning char-by-char; 16 is the
 * empirically-derived crossover point.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareUTF8(a, b) {
  if (a === b) return 0;
  const aLength = a.length;

  // Surrogate code units (U+D800–U+DFFF) can only appear in two-byte string
  // backing stores, so this regex returns false immediately for pure
  // Latin-1/ASCII strings (one-byte store) without scanning a single char.
  if (aLength >= 16 && !surrogateRe.test(a) && !surrogateRe.test(b)) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  const bLength = b.length;
  const length = aLength > bLength ? bLength : aLength;
  for (let i = 0; i < length; i++) {
    const ac = a.charCodeAt(i);
    const bc = b.charCodeAt(i);
    if (ac !== bc) {
      // For all non-surrogate BMP code units (0x0000–0xD7FF and 0xE000–0xFFFF),
      // UTF-16 code-unit order equals UTF-8 byte order, so a subtraction suffices.
      if ((ac < 0xd800 || ac > 0xdfff) && (bc < 0xd800 || bc > 0xdfff)) {
        return ac - bc;
      }
      // Surrogate pair: compare full code points (UTF-8 order = code point order).
      return (
        /** @type {number} */ (a.codePointAt(i)) -
        /** @type {number} */ (b.codePointAt(i))
      );
    }
  }
  return aLength - bLength;
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
