# Project Instructions

## Scope

- These root instructions apply throughout the repository.
- Each deployable gadget keeps additional package-specific rules in
  `src/<gadget>/AGENTS.md`. Apply those scoped instructions together with this
  file when working in that gadget.

## Gadget Package Structure

- Keep `README.md`, `AGENTS.md`, `CHANGELOG.md`, and `package.json` as each
  deployable package's entry documents.
- Keep `main.ts` as each gadget's composition root. Browser entry points invoke
  it; it wires sibling UI, workflow, service, source, publishing, support, and
  shared parts through explicit contracts.
- Export the composition function as `start`. Browser entry points import and
  invoke it, while package operations remain private to authored modules.
- Use `#gadget` and `#gadget/*` for gadget-local imports. Import one
  responsibility through `#shared/<name>`; reserve bare `#shared` for a
  deliberate aggregate.
- Point dependencies inward. UI presents state supplied through contracts,
  orchestration coordinates use cases, and adapters isolate external systems.
  Domain code remains independent of orchestration, adapters, and UI; adapters
  and orchestration remain independent of UI.
- Store each gadget's authored locale catalogs as flat dotted-key JSON under
  `i18n/`. Keep locale selection, message-ID typing, and runtime translation in
  `i18n/index.ts`, and keep every translation aligned with the English keys and
  named placeholders.
- Keep each Codex dialog as a co-located `.vue`, `.ts`, and `.css` trio under
  `ui/dialogs/`. Use a template-only Vue single-file component for markup,
  TypeScript for state and build-injected assets, and package-scoped CSS for
  presentation. Scope selectors beneath a package-owned class and keep static
  presentation in the co-located stylesheet.
- Organize implementation paths by their actual domain responsibilities. Fold
  thin forwarding modules into their caller and keep only the layers that the
  gadget uses.

## Package Documentation

- Begin each gadget README with a concise product purpose and an accurate
  development or safety status.
- Use `Run`, `Features`, `Development`, `Architecture`, and `License` as the
  second-level README sections.
- In `Run`, show the exact workspace build command, name both generated
  artifacts, document each supported installation surface, and explain how to
  launch the installed gadget safely.
- Write `Features` as concrete, present-tense user outcomes. Cover the primary
  workflow, review or recovery behavior, and supported interface languages.
  Keep this list current with browser behavior.
- In `Development`, state the Node.js baseline, exact package check, test, and
  build commands, live-service or fixture constraints, and links to focused
  contributor guides.
- In `Architecture`, include a compact text dependency tree that matches the
  package's real modules, then name the composition root and the responsibility
  of each major branch.
- Keep the README self-contained. Add focused depth under `docs/` with
  lowercase kebab-case filenames and one clear subject per guide.
- Use numbered reference links, short paragraphs, and lists or definition-style
  sections in place of wide tables. Keep authored Markdown lines at 79
  characters or fewer.
- Keep the repository license notice in the root `LICENSE` file and link to it
  from each package README.

## Action Workflows

- Follow the [release workflow][1] when selecting or changing a gadget version,
  revising a changelog, building distributable artifacts, or formalizing a
  release.
- Follow the [commit workflow][2] when preparing and recording a Git commit.

## Code Style

- Follow the [Zen of Python][3] where it improves readability: explicit is
  better than implicit, simple is better than complex, and flat is better than
  nested.
- Keep authored indentation at four levels or fewer. Use guard clauses, early
  returns, and small named helpers to keep control flow flat.
- Use named functions or local helpers for callbacks that span multiple lines.

## TypeScript

- Use `.ts` for authored source, tests, scripts, and tool configuration when
  the tool supports TypeScript configuration.
- Keep Prettier and Stylelint settings in the private root `package.json`.
  Retain standalone `eslint.config.ts` and `tsconfig.json` because their
  configuration formats cannot be embedded in `package.json`.
- Keep `tsconfig.json` as the root TypeScript and Vue project entry point.
  Isolate each gadget's template context in a referenced project under
  `config/vue/`.
- Store JSON-compatible Vue output settings in each gadget's `package.json`.
  Use `../../dist` for `outputDir`, an empty `assetsDir`, `false` for
  `filenameHashing`, and `false` for `css.extract`.
- Prefer the shortest public directory entry point for local imports. Use
  explicit `.ts` extensions when importing a specific file.
- Type-check with TypeScript in `noEmit` mode. Use esbuild to emit ES2024
  browser JavaScript into `dist/`.
- Keep directly executed TypeScript compatible with Node's type-stripping
  runtime.

## Verification

- Before handing off a material change, run `npm run check`.
- Build each affected gadget according to the [release workflow][1]. A shared
  source or build-system change requires every affected gadget build.
- Inspect `git diff --check` and review the complete staged and unstaged diff.

[1]: docs/release-workflow.md
[2]: docs/commit-workflow.md
[3]: https://peps.python.org/pep-0020/
