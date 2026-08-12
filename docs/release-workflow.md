# Release Workflow

Use this workflow when selecting or changing a gadget version, revising a
package changelog, publishing a browser artifact, or formalizing a release.
Ordinary local builds use the current metadata and are not releases.

## Identify the Release Scope

- Treat each package under `src/` that defines `gadgetBuild` as an
  independently released gadget.
- Use its `package.json` version as the source of truth for its minified
  artifact and its code embedded in the aggregate userscript. Version changes
  remain scoped to affected gadgets; the private root and shared workspace
  versions stay fixed.
- Treat the all-gadget userscript as a derived convenience artifact. Its UTC
  build timestamp is the aggregate header version; embedded gadgets retain
  their package versions and release cycles.
- Include every gadget whose distributed bundle changes. Shared source,
  builder, dependency, and build-configuration work can therefore coordinate
  several gadget releases.
- Classify a release from its effect. Material work includes features, fixes,
  behavior or MediaWiki-query changes, dependency changes, package or entry
  point changes, public API changes, and generated browser changes.
- Keep one version decision for one cohesive change. Major and minor version
  selection belongs to the user; Codex may select the next patch for
  backward-compatible material work.

## Distinguish Builds and Publications

### Local Verification Build

Reuse the current manifest and changelog metadata. A local build may write
ignored files under `dist/` or isolated temporary output, but it is never
published. Repeating an identical local build does not consume a version suffix
or change a license scope.

### Candidate Publication

Distribute an explicitly identified test or prerelease artifact. Before a base
version's first formal release, use the next unused `-dev.N` suffix. After a
formal release, use the next unused `-post.N` suffix on that released base
while preparing its next patch. For example, `0.1.1-post.1` leads toward formal
`0.1.2`. A user-selected major or minor line starts its own `-dev.N` sequence.
Every published candidate consumes its suffix even if its browser output
matches an earlier candidate.

### Formal Publication

Use the approved, previously unpublished, unsuffixed Semantic Versioning base.
Formalizing `0.2.0-dev.N` produces `0.2.0`; formalizing work developed as
`0.1.1-post.N` produces `0.1.2`. Treat every formal version as immutable.

Documentation, comments, tests, and formatting retain the current package
version when distributed browser behavior does not change. A publication may
still require a new candidate or formal version because the published release
scope itself is immutable.

Before formalizing a development line, remove temporary scaffolding and
consolidate overlapping implementation and documentation while preserving
material behavior and decisions.

## Maintain the Changelog

- Keep each gadget's durable release history in `src/<gadget>/CHANGELOG.md`.
- Start with `# Changelog`. Group versions newest first under the next
  minor-version boundary as `## Until <major.minor>`.
- Format the active heading as
  `### <major.minor.patch>[-dev.N|-post.N] (YYYY-MM-DD HH:MM UTC)`.
- Place one concise `Overview:` paragraph immediately after the heading, then
  past-tense bullets containing material completed outcomes.
- Condense a formal release overview to one paragraph of at most two authored
  lines, about 158 characters.
- Revise the active candidate entry as work develops. Consolidate transient
  build notes into durable release outcomes before formal publication.
- Record package-scoped documentation, comments, tests, and formatting in the
  active entry without selecting a new version when browser behavior is
  unchanged. Record shared material changes in every affected gadget entry.
- Preserve historical entries when exact timestamps are unavailable. Apply the
  current format to new and actively revised entries.

## Maintain Licensing

Each publication has an explicit license scope. Synchronize the package version
and license identifier, the package-local `LICENSE` title and
`Release-Scope: <name>@<version>` marker, and the package README.

Deployable package manifests support the SPDX identifiers `CC0-1.0`,
`CC-BY-SA-4.0`, and `MIT`. Adding another release license is a policy change:
extend the shared metadata validator and its repository and build fixtures
before selecting it for a package.

For a CC0 publication, append its scope to
`config/licensing/cc0-release-scopes.json`. Include `root` in `notices` so it
appears in the cumulative root `LICENSE`. Also include `shared` when the
release incorporates project-owned shared runtime, so it appears in the
cumulative `src/shared/LICENSE` notice.

The ledger and both cumulative notices are append-only. Never remove an older
CC0 scope because a later candidate or formal release uses another license.
Version-specific dedications do not automatically apply to later code or
releases. Preserve third-party status and attribution under
`THIRD_PARTY_NOTICES.md` and package-local notices.

Repository verification compares the ledger with cumulative notice scopes found
in available Git history. CI fetches complete history so coordinated deletion
from all current files still fails the licensing contract.

## Build Artifacts

A package-only build writes one minified file at `dist/<output-name>.min.js`.
Its file-docstring header begins with a summary of at most 75 characters and
one to three description paragraphs, followed by the package name, version,
optional outside author, and license identifier. It does not copy full package
notices or use userscript metadata.

The ES2024 program runs in a strict async anonymous function with its bundle in
a `const` binding. A complete workspace build writes every discovered package
file and replaces `dist/00-mediawiki-gadgets.user.js`. Building the aggregate
directly with `npm run build:all-userscript` reads current package sources and
does not require the individual artifacts first.

The aggregate header combines distinct licenses as a parenthesized `AND`
expression and points to retained legal notices. It retains each distinct
package notice so dependency and source-data terms travel with the bundle.
Package and aggregate output order is stable and manifest-driven.

Local verification may use:

```shell
npm run build:verify
```

That command builds twice with a fixed timestamp in temporary directories and
requires byte-identical results. It does not replace `dist/` or change release
metadata.

## Publish a Candidate

1. Select the next unused `-dev.N` or `-post.N` version and update the affected
   manifest, active changelog entry, package license, README, and cumulative
   licensing data as one change.
2. Run `npm run verify` and build every affected gadget. Use `npm run build`
   when shared work affects all gadgets.
3. Inspect each minified header for its canonical version, license, and any
   outside author. Inspect the aggregate timestamp, combined license, authors,
   matches, and retained notices.
4. Record where the candidate is published so its suffix is never reused.
5. Inspect `git diff --check`, the complete diff, and final worktree status.

## Publish a Formal Release

1. Approve the exact unsuffixed version and release license. Complete the
   cleanup pass and replace the candidate metadata consistently.
2. Finalize the changelog timestamp, overview, and durable outcomes. Keep the
   candidate history needed to show published scopes.
3. Update the package-local license and append any new CC0 scope to the ledger
   and applicable cumulative notices.
4. Run `npm run verify` and `npm run build` for all affected gadgets.
5. Confirm the individual and aggregate headers, artifact set, retained
   notices, and stable package order.
6. Inspect `git diff --check`, the complete diff, and final worktree status
   before publishing the artifacts.

[Semantic Versioning 2.0.0][1] defines the unsuffixed base version syntax.

[1]: https://semver.org/
