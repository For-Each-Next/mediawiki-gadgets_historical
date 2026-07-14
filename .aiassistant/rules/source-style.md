---
应用: 始终
---

# Source Style

- Keep authored modules under `src/`, `tests/`, and `scripts/` in TypeScript
  files. Use TypeScript for tool configuration when the tool supports it. Do
  not add JavaScript files in those locations.
- Limit code lines to 79 characters and comment lines to 72 characters.
- Use four spaces for each indentation level.
- Surround file-level functions and classes with exactly two blank lines.
  Keep their JSDoc attached to the declaration after those blank lines.
- Do not nest control flow more than four levels deep. Prefer guard clauses,
  early returns, and small named helpers.
- Never use a multiline conditional (ternary) expression. The condition,
  question mark, both branches, and colon must stay on one physical line.
- Replace any ternary that does not fit on one line with explicit control flow
  or a named helper.
- Anonymous arrow functions are allowed only as one-line expression arrows
  without braces.
- Use a named function or named local helper for every multiline callback.
- Do not use unnamed multiline function expressions, including functions
  passed directly as arguments.
- Never add `/* eslint-disable */` to any file.
- Run `npm run source:check`, `npm run lint`, and Prettier after editing
  source.
