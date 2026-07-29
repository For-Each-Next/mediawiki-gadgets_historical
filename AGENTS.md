# Project Instructions

## Instruction Scope

- These root instructions apply throughout the repository.
- Each deployable gadget keeps additional package-specific rules in
  `src/<gadget>/AGENTS.md`. Apply those scoped instructions together with this
  file when working in that gadget.
- Keep `README.md`, `AGENTS.md`, `CHANGELOG.md`, and `package.json` as each
  deployable package's entry documents. Organize implementation directories by
  their real responsibilities rather than requiring identical folder names.
- Keep `main.ts` as each gadget's composition root. Browser entry points invoke
  it; it wires sibling UI, workflow, service, source, publishing, support, and
  shared parts through explicit contracts.
- Export the composition function as `start`. Browser entry points import and
  invoke it without exporting private gadget operations.
- Use `#gadget` and `#gadget/*` for gadget-local imports. Import one
  responsibility through `#shared/<name>`; reserve bare `#shared` for a
  deliberate aggregate. Do not introduce package-relative aliases such as
  `#me`.
- Keep UI focused on presentation rather than making it the owner of workflows.
  Domain code must not import orchestration, external-adapter, or UI code;
  adapters must not import orchestration or UI code; orchestration must not
  import UI code.
- Store each gadget's authored locale catalogs as flat dotted-key JSON under
  `i18n/`. Keep locale selection, message-ID typing, and runtime translation in
  `i18n/index.ts`, and keep every translation aligned with the English keys and
  named placeholders.
- Keep each Codex dialog as a co-located `.vue`, `.ts`, and `.css` trio under
  `ui/dialogs/`. Use a template-only Vue single-file component for markup,
  TypeScript for state and build-injected assets, and package-scoped CSS for
  presentation. Do not style bare Codex classes globally or keep static styles
  inline in dialog templates.
- Do not keep a directory solely for one thin forwarding module. Integrate the
  wrapper into its caller or give the module a domain-specific responsibility.
- Do not add a top-level `app/` beside the `main.ts` composition root.
- Use domain-named modules and directories. Do not introduce generic `utils`,
  `common`, or `helpers` dumping grounds.
- Give each gadget README `Run`, `Features`, `Development`, `Architecture`, and
  `License` sections, including a compact text dependency tree. Keep authored
  Markdown lines at 79 characters or fewer; replace wide tables with lists or
  definition-style sections.
- Keep the repository license notice in the root `LICENSE` file and link to it
  from each package README.

## Change Management

### Versioning

- Treat each package under `src/` that defines `gadgetBuild` as an
  independently released gadget and userscript. Its `package.json` version is
  the source of truth for both generated outputs. Do not bump unrelated gadgets
  or the private root and shared workspace versions.
- Use a [Semantic Versioning 2.0.0][1] base version and classify a change from
  its actual effect. Material changes include features, bug fixes, behavior
  changes, MediaWiki query changes, dependency changes, package or entry-point
  changes, public API changes, and changes to generated browser behavior.
- The user alone selects major and minor versions. Never infer or apply either
  bump without the user's explicit direction. Codex may automatically select
  the next patch for backward-compatible material work and manage intermediate
  build suffixes. The user may override any automatic version decision.
- Keep one version decision for one cohesive change; do not increment the
  version once per edit or commit.
- Bump every released gadget whose bundled behavior changes. A change to
  `src/shared/`, the shared builder, or build configuration may therefore
  require coordinated version updates for all affected gadgets.
- Before a base version is formally published, distinguish its test builds with
  sequential SemVer `-dev.N` suffixes. Publishing the base removes the suffix;
  that formal version is then immutable.
- After a formal release, distinguish test builds leading to the next patch
  with sequential `-post.N` suffixes on the formal base. For example,
  `0.1.1-post.1`, `0.1.1-post.2`, and later test builds lead to formal `0.1.2`.
  If the user selects a new major or minor version instead, begin a `-dev.N`
  sequence on that selected base.
- Before every explicit non-release build, advance each affected gadget to the
  next unused `-dev.N` or `-post.N` version. Every build gets a distinct
  version, including routine verification builds and rebuilds of identical
  contents. A formal-release build instead uses its previously unpublished
  unsuffixed base version.
- A formally released version is immutable. Further distributable work starts
  the next applicable development or post-release sequence.
- Before removing `-dev.N` to publish a formal base, or replacing a `-post.N`
  sequence with the next patch, perform a cleanup pass: remove temporary
  scaffolding, consolidate overlapping implementation and documentation, and
  preserve all material behavior and decisions.
- Before each affected gadget build, remove that gadget's previous generated
  JavaScript from its dedicated output directory. A successful build leaves
  only the current `.min.js` and `.user.js` artifacts.
- When publishing either artifact, replace or remove only the previous artifact
  for the same gadget and form. Do not retain old generated copies.
- Documentation-only, comment-only, test-only, and formatting-only changes do
  not change a gadget's base version unless they alter its distributed artifact
  or behavior, but any build still advances its suffix.
- Update the canonical package version, related documentation, generated
  metadata, and any version assertions in the same atomic change. Build outputs
  and the ignored `package-lock.json` are not release sources of truth.

### Changelog

- Keep each released gadget's durable changelog in `src/<gadget>/CHANGELOG.md`.
  Keep `README.md`, `AGENTS.md`, and `CHANGELOG.md` as package-level Markdown
  entry points; place other long-form package documentation under `docs/`.
- Start a package changelog with `# Changelog`. Group versions by the next
  minor-version boundary using `## Until <major.minor>`, and give the active
  version an `### <major.minor.patch>[-dev.N|-post.N] (YYYY-MM-DD HH:MM UTC)`
  heading. Keep groups and versions newest first.
- Put one concise `Overview:` paragraph immediately below each new or actively
  revised version heading, describing the release as a whole. Follow it with
  concise, past-tense bullets covering only material completed outcomes.
- When more work or suffixed builds belong to the active version, revise its
  heading, overview, and bullets. Do not retain transient build notes.
- Record package-scoped documentation-only, comment-only, test-only, and
  formatting-only work in the active changelog section without changing the
  version. Record shared material changes in every affected gadget's changelog.
- Preserve legacy entries when exact timestamps are unavailable; apply the
  current format to new and actively revised entries.
- Add or update the applicable changelog entry before handing off a completed
  package change.

### Git Commits

- Follow [Conventional Commits 1.0.0][2]. Format the first line as
  `<type>[optional scope]: <description>`, using a short package or subsystem
  scope when helpful.
- Use lowercase types such as `feat`, `fix`, `docs`, `refactor`, `test`,
  `build`, `ci`, `perf`, `style`, `chore`, or `revert`.
- Mark a breaking change with `!` before the colon or a
  `BREAKING CHANGE: <description>` footer.
- Keep commits atomic when practical. Do not mix unrelated formatting,
  generated output, dependency changes, and feature code unless they are
  required for the same cohesive change.

## Code Style

- Follow the [Zen of Python][3] where it improves readability: explicit is
  better than implicit, simple is better than complex, and flat is better than
  nested.
- Avoid five-level indentation or deeper. Prefer guard clauses, early returns,
  and small named helpers to keep control flow flat.
- Avoid multi-line anonymous functions. Use named functions or local helpers
  when callback logic needs multiple lines.

## TypeScript

- Use `.ts` for authored source, tests, scripts, and tool configuration when
  the tool supports TypeScript configuration.
- Prefer the shortest public directory entry point for local imports. Use
  explicit `.ts` extensions when importing a specific file.
- Type-check with TypeScript in `noEmit` mode. Use esbuild to emit ES2024
  browser JavaScript into `dist/`.
- Keep directly executed TypeScript compatible with Node's type-stripping
  runtime.

## Verification

- Before handing off a material change, run `npm run check` and build every
  affected gadget with `npm run build -w <gadget>`. Use `npm run build` when a
  shared source or build-system change can affect multiple gadgets.
- Inspect `git diff --check` and confirm that each generated `.min.js` and
  `.user.js` header contains the canonical package version before release.

[1]: https://semver.org/
[2]: https://www.conventionalcommits.org/en/v1.0.0/
[3]: https://peps.python.org/pep-0020/
