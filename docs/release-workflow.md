# Release Workflow

Use this workflow when a change selects or updates a gadget version, revises a
package changelog, builds browser artifacts, or formalizes a release.

## Scope a Release

- Treat each package under `src/` that defines `gadgetBuild` as an
  independently released gadget.
- Use its `package.json` version as the source of truth for its minified
  artifact and its code embedded in the aggregate userscript. Version changes
  remain scoped to affected gadget packages; the private root and shared
  workspace versions stay fixed.
- Treat the all-gadget userscript as a derived convenience artifact rather than
  an independent release. Its UTC build timestamp is the aggregate header
  version; the embedded gadgets retain their package versions and release
  cycles.
- Classify the release from its actual effect. Material work includes features,
  fixes, behavior or MediaWiki-query changes, dependency changes, package or
  entry-point changes, public API changes, and generated browser changes.
- Include every gadget whose bundle changes. Shared source, builder, and build
  configuration work can therefore coordinate several gadget releases.
- Keep one version decision for one cohesive change.

## Select a Version

- Use a [Semantic Versioning 2.0.0][1] base version.
- Major and minor selection belongs to the user. Codex may select the next
  patch for backward-compatible material work and manage intermediate build
  suffixes. A later user decision takes precedence.
- Before the first formal publication of a base, identify test builds with
  sequential `-dev.N` suffixes. Publication removes the suffix.
- After a formal release, identify test builds toward the next patch with
  sequential `-post.N` suffixes on the released base. For example,
  `0.1.1-post.1` and `0.1.1-post.2` lead to formal `0.1.2`.
- A user-selected major or minor line begins its own `-dev.N` sequence.
- Give every explicit non-release build its next unused suffix, including
  verification and identical rebuilds. A formal-release build uses its
  previously unpublished unsuffixed base.
- Treat every formal version as immutable. Later distributable work begins the
  applicable development or post-release sequence.
- Before formalizing a `-dev.N` base or the next patch after `-post.N`, remove
  temporary scaffolding and consolidate overlapping implementation and
  documentation while preserving material behavior and decisions.
- Documentation, comments, tests, and formatting keep the current base version
  when the distributed browser behavior stays the same. An explicit build still
  receives a distinct suffix.

## Maintain the Changelog

- Keep each gadget's complete, durable release history in
  `src/<gadget>/CHANGELOG.md`. The README and supporting guides link to this
  record.
- Start with `# Changelog`. Group versions newest first under the next
  minor-version boundary as `## Until <major.minor>`.
- Format the active heading as
  `### <major.minor.patch>[-dev.N|-post.N] (YYYY-MM-DD HH:MM UTC)`.
- Place one concise `Overview:` paragraph immediately after the heading, then
  past-tense bullets containing material completed outcomes.
- Condense a formal release overview to one paragraph of at most two authored
  lines, about 158 characters.
- Revise the active heading, overview, and bullets as its work develops.
  Consolidate transient build notes into durable release outcomes.
- Record package-scoped documentation, comments, tests, and formatting in the
  active entry while retaining the current version. Record shared material
  changes in every affected gadget entry.
- Preserve historical entries when exact timestamps are unavailable. Apply the
  current format to new and actively revised entries.
- Update the applicable active entry before handing off every completed package
  change.

## Build Artifacts

- Before an affected package build, remove that gadget's previous flat
  `.min.js` file under `dist/`. During migration, also remove its retired
  readable and individual `.user.js` files and its former package-directory
  artifacts.
- A successful package-only build writes only the minified
  `dist/<output-name>.min.js` file. Its header identifies the declared package
  license and points to the retained legal block containing every declared
  package notice.
- A complete workspace build writes every gadget's flat `.min.js` file and
  replaces the aggregate userscript at `dist/00-mediawiki-gadgets.user.js`.
- Building the aggregate directly with `npm run build:all-userscript` reads the
  current package sources, writes `dist/00-mediawiki-gadgets.user.js`, and does
  not require the
  individual minified artifacts first.
- Combine distinct package licenses as a parenthesized `AND` expression in the
  aggregate header, then qualify its scope by pointing to the retained legal
  notices. Retain each distinct package notice in
  `dist/00-mediawiki-gadgets.user.js` so dependency and source-data terms
  travel with the bundle.
- A package publication replaces only the previous minified artifact for that
  gadget. Rebuilding the aggregate replaces only
  `dist/00-mediawiki-gadgets.user.js`.
- Synchronize the package version, active changelog heading, related
  documentation, generated metadata, and version assertions in one atomic
  change. Ignored build outputs and `package-lock.json` are verification
  products rather than release sources.

## Formalize a Release

1. Decide the exact release license. Synchronize `package.json`, the local
   `LICENSE` SPDX line and `Release-Scope: <name>@<version>` marker, and the
   README. Add every CC0 scope to the cumulative root map and, when the gadget
   incorporates shared runtime, to `src/shared/LICENSE`; never remove an older
   CC0 scope merely because a later release uses another license.
2. Complete the cleanup pass and settle the unsuffixed package version.
3. Finalize the active changelog timestamp, overview, and durable outcomes.
4. Run `npm run check`.
5. Build every affected gadget with `npm run build -w <gadget>`. Use
   `npm run build` when shared work affects every gadget. Rebuild the aggregate
   with `npm run build:all-userscript` when delivering the combined userscript
   after a package-only build.
6. Confirm each package's minified artifact header contains its canonical
  package version and license and that its legal notice is present. When
  built, confirm the `dist/00-mediawiki-gadgets.user.js` header contains its UTC
  timestamp, common or combined license, all package authors, and all distinct
  package notices.
7. Inspect `git diff --check`, the complete diff, and the final worktree
   status.

[1]: https://semver.org/
