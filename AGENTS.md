# Project Instructions

## Scope

- These root instructions apply throughout the repository.
- Each deployable gadget keeps additional package-specific rules in
  `src/<gadget>/AGENTS.md`. Apply those scoped instructions together with this
  file when working in that gadget.
- Use the [workspace architecture][1] for repository boundaries and the
  [development workflow][2] for commands and verification responsibilities.

## Workspace Structure

- Treat package manifests as workspace metadata. Discover packages from
  `src/*`, identify deployable gadgets by `gadgetBuild`, and avoid hard-coded
  gadget lists in repository tooling.
- Keep reusable discovery, metadata, path, and authored-file behavior under
  `scripts/workspace/`. Repository checks and builds consume that model rather
  than maintaining parallel package views.
- Keep structural checks under `scripts/repository-check/`, build
  responsibilities under `scripts/gadget-build/`, shared configuration under
  `config/`, and fixture-driven repository tests under `tests/repository/`.
- Keep `README.md`, `AGENTS.md`, `CHANGELOG.md`, `LICENSE`, and `package.json`
  as each deployable package's entry documents.

## Gadget Package Structure

- Keep `main.ts` as each gadget's composition root. Browser entry points invoke
  it; it wires sibling UI, workflow, adapter, and shared parts through explicit
  contracts.
- Export the composition function as `start`. Browser entry points import and
  invoke it, while package operations remain private to authored modules.
- Use `#gadget` and `#gadget/*` for gadget-local imports. Import one published
  responsibility through `#shared/<name>`; do not import the bare `#shared`
  aggregate in gadget source.
- Treat `src/shared/package.json#exports` as the public shared API. Do not
  import an unpublished shared path or add a second shared-export map.
- Point dependencies inward. UI presents state supplied through contracts,
  orchestration coordinates use cases, and adapters isolate external systems.
  Domain code remains independent of orchestration, adapters, and UI; adapters
  and orchestration remain independent of UI.
- Do not import between gadget packages. Shared code must not import a gadget,
  and relative imports must not escape their package.
- Store each gadget's authored locale catalogs as flat dotted-key JSON under
  `i18n/`. Keep locale selection, message-ID typing, and runtime translation in
  `i18n/index.ts`, and keep every translation aligned with the English keys and
  named placeholders.
- Keep each Codex dialog as a co-located `.vue`, `.ts`, and `.css` trio under
  `ui/dialogs/`. Use a template-only Vue single-file component for markup,
  TypeScript for state and build-injected assets, and package-scoped CSS for
  presentation. Scope selectors beneath a package-owned class and keep static
  presentation in the co-located stylesheet.
- Keep every authored Vue single-file component template-only, including
  components outside `ui/dialogs/`. Put executable behavior and imports in the
  co-located TypeScript owner so source-boundary checks cover every edge.
- Organize implementation paths by their actual domain responsibilities. Fold
  thin forwarding modules into their caller and keep only the layers that the
  gadget uses.
- Use only the optional top-level source responsibilities `config`,
  `contracts`, `domain`, `workflows`, `adapters`, `ui`, `i18n`, and `docs`.
  Follow the full dependency graph in the [source architecture][6].
- Create one shared logger and action notifier in `main.ts`, then inject scoped
  instances. Gadget source must not call `console.*` or `mw.notify` directly
  and must not use Codex Toast APIs. Follow the [diagnostics guide][7].

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
  build commands, fixture or live-service constraints, and links to focused
  contributor guides.
- In `Architecture`, include a compact text dependency tree that matches the
  package's real modules, then name the composition root and the responsibility
  of each major branch.
- Keep the README self-contained. Add focused depth under `docs/` with
  lowercase kebab-case filenames and one clear subject per guide.
- Use numbered reference links, short paragraphs, and lists or definition-style
  sections in place of wide tables. Keep authored Markdown lines at 79
  characters or fewer.
- Keep the cumulative repository licensing map in the root `LICENSE` file. Keep
  each gadget's release scope in its package-local `LICENSE`, and link to both
  files from the package README.

## Action Workflows

- Follow the [release workflow][3] when selecting or changing a gadget version,
  revising a changelog, publishing an artifact, or formalizing a release. A
  local verification build does not create a release.
- Follow the [commit workflow][4] when preparing and recording a Git commit.

## Code Style

- Follow the [Zen of Python][5] where it improves readability: explicit is
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
  `config/vue/`, inheriting the common Vue configuration.
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

- Before handing off a material change, run `npm run verify`.
- Use package check, test, and build commands while iterating on one gadget.
  Build every affected gadget according to the [release workflow][3]. A shared
  source or build-system change requires every affected gadget build.
- Keep automated tests offline and non-mutating toward MediaWiki and other live
  services. Exercise such integrations with fixtures or mocked adapters.
- Inspect `git diff --check` and review the complete staged and unstaged diff.

[1]: docs/workspace-architecture.md
[2]: docs/development-workflow.md
[3]: docs/release-workflow.md
[4]: docs/commit-workflow.md
[5]: https://peps.python.org/pep-0020/
[6]: docs/source-architecture.md
[7]: docs/diagnostics.md
