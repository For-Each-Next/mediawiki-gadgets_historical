# Release Workflow

Use this workflow when a change selects or updates a gadget version, revises a
package changelog, builds browser artifacts, or formalizes a release.

## Scope a Release

- Treat each package under `src/` that defines `gadgetBuild` as an
  independently released gadget and userscript.
- Use its `package.json` version as the source of truth for all generated
  artifacts. Version changes remain scoped to affected gadget packages; the
  private root and shared workspace versions stay fixed.
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

- Before an affected build, remove that gadget's previous `.min.js` and
  `.user.js` files from its hyphenated package directory under `dist/`. During
  migration, also remove its retired readable and legacy flat artifacts.
- A successful build writes a minified `.min.js` file and a
  Greasemonkey-compatible `.user.js` file under `dist/<gadget-name>/`.
- Publication replaces or removes only the previous artifact for the same
  gadget and form.
- Synchronize the package version, active changelog heading, related
  documentation, generated metadata, and version assertions in one atomic
  change. Ignored build outputs and `package-lock.json` are verification
  products rather than release sources.

## Formalize a Release

1. Complete the cleanup pass and settle the unsuffixed package version.
2. Finalize the active changelog timestamp, overview, and durable outcomes.
3. Run `npm run check`.
4. Build every affected gadget with `npm run build -w <gadget>`. Use
   `npm run build` when shared work affects every gadget.
5. Confirm the `.min.js` and `.user.js` headers contain the canonical package
   version.
6. Inspect `git diff --check`, the complete diff, and the final worktree
   status.

[1]: https://semver.org/
