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
