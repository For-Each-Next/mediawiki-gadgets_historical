# Project Instructions

## Commit Style

- Follow [Conventional Commits 1.0.0][conventional-commits] for commit
  messages, for example `feat: add source cache`,
  `fix: handle empty article title`, or `chore: bump gadget version`.
- Keep commits atomic when practical: each commit should contain one coherent behavior change, fix, refactor, or
  maintenance update.
- Do not mix unrelated formatting, generated output, dependency changes, and feature code in the same commit unless they
  are required for the same change.

## Version Updates

- When updating a released gadget or userscript, increment the relevant version tag in the same atomic change.
- Use a single patch-level increment unless the user asks for a different release type, for example `3.1.154` to
  `3.1.155`.
- Keep package metadata, generated userscript metadata, and tests that assert version output consistent with the new
  version.

## Code Style

- Follow the [Zen of Python][pep-20] where it improves readability: explicit
  is better than implicit, simple is better than complex, and flat is better
  than nested.
- Avoid five-level indentation or deeper. Prefer guard clauses, early returns, and small named helpers to keep control
  flow flat.
- Avoid multi-line anonymous functions. Use named functions or local helpers when callback logic needs multiple lines.

## TypeScript

- Use `.ts` for authored source, tests, scripts, and tool configuration when
  the tool supports TypeScript configuration.
- Use explicit `.ts` extensions for local imports.
- Type-check with TypeScript in `noEmit` mode. Use esbuild to emit ES2024
  browser JavaScript into `dist/`.
- Keep directly executed TypeScript compatible with Node's type-stripping
  runtime.

[conventional-commits]: https://www.conventionalcommits.org/en/v1.0.0/

[pep-20]: https://peps.python.org/pep-0020/
