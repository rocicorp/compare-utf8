# compare-utf8

Compares JS strings using UTF-8 bitwise semantics

## Why?

Strings in JavaScript are UTF-16 encoded[^1].

[^1]: JS does not enforce that the bytes composing a string are _valid_ UTF-16.

However, sometimes it is useful to compare strings using UTF-8 bitwise semantics. Especially if you are using
strings in different languages or databases where you are limited to UTF-8.

# Installation

```
npm add compare-utf8
```

# Usage

```js
import { compareUTF8 } from 'compare-utf8';

compareUTF8('a', 'b'); // < 0
compareUTF8('a', 'a'); // 0
compareUTF8('b', 'a'); // > 0
compareUTF('a👻', 'a💩'); // < 0

compareUTF8('\u005A', '\uFF3A'); // < 0
compareUTF8('\uFF3A', '\u{1D655}'); // < 0
compareUTF8('\u005A', '\u{1D655}'); // < 0
```

## Performance

`compareUTF8` is designed to be cheap on both JIT engines (V8, JSC) and
interpreters (Hermes), where every builtin call costs tens of nanoseconds:

1. Identity check.
2. Probe the first code unit with one `charCodeAt` per side. Unrelated strings
   usually differ there.
3. Otherwise compare natively with `<`. UTF-16 order can only disagree with
   UTF-8 order when the natively _smaller_ string has a surrogate at the first
   differing position, so a single surrogate regex test on the smaller string
   proves the native answer. Only strings that actually contain surrogates fall
   back to the scalar code-unit/code-point loop, and for long strings that loop
   first bisects the common prefix with native slice equality.

Relative to 0.2.0 this is 2 to 5× faster on Hermes for id-like and prefix-sharing
strings, 3 to 6× faster on both engines for long strings containing emoji, and
about 2× faster on V8 for random ids and titles, with no case slower by more
than a couple of nanoseconds.
