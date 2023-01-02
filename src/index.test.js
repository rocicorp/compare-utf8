// @ts-check

import { test } from "mocha";
import assert from "assert/strict";

import { compareUTF8, utf16LengthForCodePoint } from "./index.js";

function compareArrays(a, b) {
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
  const t = (a, b) => {
    const t2 = (a, b, expected) => {
      const encoder = new TextEncoder();
      const aArray = encoder.encode(a);
      const bArray = encoder.encode(b);
      const encoderResult = Math.sign(compareArrays(aArray, bArray));
      assert.strictEqual(encoderResult, expected);
      const customResult = Math.sign(compareUTF8(a, b));
      assert.strictEqual(customResult, expected);
      assert.strictEqual(encoderResult, customResult);
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
    assert.strictEqual(
      utf16LengthForCodePoint(i),
      String.fromCodePoint(i).length
    );
  }
});
