# MediaWiki Gadgets

MediaWiki Gadgets is a TypeScript workspace for developing, testing, and
building browser tools for MediaWiki sites, primarily Wikipedia.

> **Status:** The gadgets are under active development and have independent
> release cycles. Review every proposed wiki edit before saving it.

## Gadgets

- [Citation Formatter][1] formats and manages CS1 citations in MediaWiki source
  editors.
- [VG Page Assessor][2] assesses Chinese Wikipedia video-game talk pages and
  registers eligible pages on the WikiProject new-page list.
- [VG Stub Creator][3] builds and reviews Chinese Wikipedia video-game stub
  articles and their related edits.
- [wikEd Lite][4] formats and highlights wikitext in MediaWiki source editors.

## Quick Start

Use Node.js 24.14.1 or newer. From the repository root, install the exact
locked dependencies, verify the workspace, and build every gadget:

```shell
npm ci
npm run verify
npm run build
```

The build writes one stable, unhashed `dist/<output-name>.min.js` artifact for
each discovered gadget and combines them in the installable
`dist/00-mediawiki-gadgets.user.js`. Build one gadget with
`npm run build -w <gadget-name>`. Each gadget README documents its supported
installation surfaces and safe launch procedure.

## Workspace

Deployable gadgets and cross-gadget capabilities live under `src/`:

```text
src/
├── citation-formatter/
├── vg-page-assessor/
├── vg-stub-creator/
├── wiked-lite/
└── shared/
```

Package manifests drive discovery, validation, builds, and shared exports.
Repository tooling lives under `scripts/`, shared TypeScript and Vue settings
under `config/`, and tests under `tests/`. See the [workspace architecture][5]
for the dependency and build model.

## Documentation

- [Development workflow][6]: installation, commands, fixtures, CI, and adding a
  gadget.
- [Workspace architecture][5]: package discovery, package boundaries, build
  data flow, and repository checks.
- [Source architecture][13]: the universal gadget tree, entry modules,
  dependency graph, and shared capability API.
- [Diagnostics][14]: shared logging, runtime levels, redaction, and native
  MediaWiki action notifications.
- [Release workflow][7]: local builds, candidate publications, formal releases,
  changelogs, artifacts, and licensing.
- [Commit workflow][8]: verification, staging, and commit messages.
- [Repository instructions][9]: project and package authoring conventions.

Package-specific features, installation steps, architecture, and contributor
guides begin in each gadget README listed above.

## License

The current releases named in the root [licensing map][10] dedicate their
project-owned portions under CC0 1.0. Their incorporated project-owned shared
runtime follows the current [shared notice][11]. Earlier version-specific
notices remain available in repository Git history. A dedication is limited to
its named release and does not automatically cover later work.

Other project-owned workspace material defaults to CC BY-SA 4.0. Generated,
dependency, and other third-party material retains its own status and terms
under the [third-party notices][12]. Nearly all code was generated with
artificial intelligence; the licensing map and third-party notices remain the
authoritative distribution terms.

[1]: src/citation-formatter/README.md
[2]: src/vg-page-assessor/README.md
[3]: src/vg-stub-creator/README.md
[4]: src/wiked-lite/README.md
[5]: docs/workspace-architecture.md
[6]: docs/development-workflow.md
[7]: docs/release-workflow.md
[8]: docs/commit-workflow.md
[9]: AGENTS.md
[10]: LICENSE
[11]: src/shared/LICENSE
[12]: THIRD_PARTY_NOTICES.md
[13]: docs/source-architecture.md
[14]: docs/diagnostics.md
