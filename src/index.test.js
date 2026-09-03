// @ts-check

import { expect, test } from "vitest";

import { compareUTF8, utf16LengthForCodePoint } from "./index.js";

function compareArrays(
  /** @type {Uint8Array} */ a,
  /** @type {Uint8Array} */ b,
) {
  const aLength = a.length;
  const bLength = b.length;
  const length = Math.min(aLength, bLength);
  for (let i = 0; i < length; i++) {
    const aValue = a[i];
    const bValue = b[i];
    if (aValue !== bValue) {
      return aValue - bValue;
    }
  }
  return aLength - bLength;
}

test("compareStringsAsUTF8", () => {
  const t = (/** @type {string} */ a, /** @type {string} */ b) => {
    const t2 = (
      /** @type {string} */ a,
      /** @type {string} */ b,
      /** @type {number} */ expected,
    ) => {
      const encoder = new TextEncoder();
      const aArray = encoder.encode(a);
      const bArray = encoder.encode(b);
      const encoderResult = Math.sign(compareArrays(aArray, bArray));
      expect(encoderResult).toBe(expected);
      const customResult = Math.sign(compareUTF8(a, b));
      expect(customResult).toBe(expected);
      expect(encoderResult).toBe(customResult);
    };
    t2(a, b, -1);
    t2(b, a, 1);
    t2(a, a, 0);
    t2(b, b, 0);
  };

  t("", "a");
  t("a", "b");
  t("abc", "abcd");
  t("abcd", "abce");

  t("a", "💩");
  t("aa", "a💩");
  t("a👻", "a💩");

  t("\u{07fe}", "\u{07ff}");
  t("\u{07ff}", "\u{0800}");
  t("\u{fffe}", "\u{ffff}");
  t("\u{ffff}", "\u{10000}");
  t("\u{10fffe}", "\u{10ffff}");

  // U+D800 to U+DFFF should not be used and TextEncoder does not work with these
  t("\u{d7ff}", "\u{d800}");
  t("\u{dfff}", "\u{e0000}");

  t("\u{d7fe}", "\u{d7ff}");
  t("\u{e000}", "\u{e001}");

  // In UTF-8 they will sort in this order:
  // Z U+005A [5A]
  // Ｚ U+FF3A [EF BC BA]
  // 𝙕 U+1D655 [F0 9D 99 95]
  //
  // In UTF-16/UCS-2 they will sort in this order:
  // Z U+005A [005A]
  // 𝙕 U+1D655 [D835 DE55]
  // Ｚ U+FF3A [FF3A]
  t("\u005A", "\uFF3A");
  t("\uFF3A", "\u{1D655}");
  t("\u005A", "\u{1D655}");
});

test("length", () => {
  for (let i = 1; i < 0x10ffff; i *= 2) {
    expect(utf16LengthForCodePoint(i)).toBe(String.fromCodePoint(i).length);
  }
});

test("lone surrogates: defined total order", () => {
  // A lone surrogate compares as its own code unit value: between U+D7FF and
  // U+E000, and below every surrogate pair (which compares as a code point
  // >= U+10000). TextEncoder cannot express this; it replaces lone surrogates
  // with U+FFFD.
  expect(compareUTF8("\ud800", "\udc00")).toBeLessThan(0);
  expect(compareUTF8("\udc00", "\ud800")).toBeGreaterThan(0);
  expect(compareUTF8("\ud7ff", "\ud800")).toBeLessThan(0);
  expect(compareUTF8("\udfff", "\ue000")).toBeLessThan(0);
  expect(compareUTF8("\udbff", "\u{10000}")).toBeLessThan(0);
  expect(compareUTF8("\udfff", "\u{10000}")).toBeLessThan(0);
  // A pair is one element; the same high surrogate followed by a non-low unit
  // is a lone surrogate followed by another element, and sorts below the pair.
  expect(compareUTF8("\ud800\udc00", "\ud800\uffff")).toBeGreaterThan(0);
  expect(compareUTF8("\ud800\udc00", "\ud800")).toBeGreaterThan(0);
});

test("lone surrogates: transitivity of pair vs lone high surrogate + BMP", () => {
  // 0.2.0 ordered these as a cycle: x < z, z < y, but x > y.
  const x = "\ud7ff\udbff";
  const y = "\ud7ff\ud800\ufffe";
  const z = "\ud7ff\ud800\udc00";
  expect(compareUTF8(y, x)).toBeLessThan(0);
  expect(compareUTF8(x, z)).toBeLessThan(0);
  expect(compareUTF8(y, z)).toBeLessThan(0);
  expect([x, y, z].sort(compareUTF8)).toEqual([y, x, z]);
  expect([z, y, x].sort(compareUTF8)).toEqual([y, x, z]);
});
