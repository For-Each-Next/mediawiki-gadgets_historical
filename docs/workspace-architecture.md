# Workspace Architecture

This guide describes the repository-wide package, dependency, validation, and
build model. Each gadget README describes its own internal architecture.

## Repository Layout

```text
src/
├── <gadget>/               independently versioned browser package
└── shared/                 cross-gadget capability package

config/
├── tsconfig.json           editor-discovered configuration project
├── tsconfig.node.json      directly executed Node TypeScript
└── vue/                    common and package browser projects

scripts/
├── tsconfig.json           editor-discovered Node TypeScript project
├── workspace/              discovery, metadata, paths, authored files
├── repository-check/       structural repository contracts
├── gadget-build/           plans, bundles, notices, and outputs
└── github-release/         tag validation, notes, workflow outputs

tests/
├── tsconfig.json           editor-discovered Node test project
└── repository/
    ├── contracts/          fixture-driven workspace rules
    ├── build/              artifact and reproducibility coverage
    └── support/            temporary-workspace helpers
```

Package manifests are the source of truth. The workspace model discovers
immediate packages under `src/`, parses each manifest once, and returns them in
stable order. A package with `gadgetBuild` is deployable; the shared package is
not. Adding a package must not require another hard-coded package list.

The root TypeScript project exposes browser and MediaWiki types to source
packages. The Node project adds Node types and erasable-syntax enforcement only
for directly executed configuration, scripts, and tests. The configuration,
scripts, and tests projects inherit that configuration from their source
directories so editors recognize Node modules and explicit `.ts` imports.
Referenced Vue projects inherit the browser configuration without imposing
Node's runtime syntax restrictions on code emitted by esbuild.

## Dependency Boundaries

Each gadget follows the universal tree defined in the [source architecture][1].
It starts at `browser.ts`, which invokes `start` from the `main.ts` composition
root. The root connects presentation, orchestration, adapters, and domain
behavior through explicit contracts:

```text
browser entry
└── composition root
    ├── UI ────────> contracts and supplied state
    ├── orchestration -> contracts and domain
    ├── adapters ─────> external systems and domain
    └── domain ────> package-local rules and shared utilities
```

Dependencies use a default-deny graph. Domain and configuration stay inward;
workflows coordinate supplied ports; adapters isolate external systems; and UI
receives supplied actions instead of importing workflows or adapters. A gadget
cannot import another gadget, and shared source cannot import a gadget.

Gadget-local imports use `#gadget` or `#gadget/*`. Shared imports use a focused
`#shared/<name>` subpath. `src/shared/package.json#exports` is the only public
shared API map; bare aggregate imports and unpublished shared paths are not
allowed in gadget source. Each export names a coherent capability and targets a
real file. Relative paths stay within their package.

All gadgets use the same structured logger and MediaWiki action notification
adapter. The [diagnostics guide][2] defines levels, runtime configuration,
redaction, event names, notification lifetimes, and the boundary between brief
notifications and persistent inline messages.

## Build Data Flow

The build consumes the same discovered package metadata as repository checks:

```text
workspace metadata
└── build plan
    ├── injected templates and styles
    ├── esbuild browser bundle
    ├── package header and retained notices
    └── output writer
        ├── dist/<output-name>.min.js
        └── dist/00-mediawiki-gadgets.user.js
```

A package build emits one flat, minified MediaWiki file. A complete build emits
one file per discovered gadget and the aggregate userscript. The aggregate
derives its matches, authors, licenses, notices, and embedded order from
package metadata. Output planning rejects unsafe paths and collisions before
writing files.

Build verification supplies a fixed UTC timestamp and an isolated output root.
It builds the workspace twice and compares the bytes, package order, and exact
artifact set without replacing normal `dist/` output.

## Repository Contracts

The repository checker coordinates focused checks for:

- package metadata, required package documents, and browser entry points;
- the universal source tree, entry-module roles, inward dependencies, and
  published shared subpaths;
- external-system ownership, shared logging, native notification, and retired
  Toast source practices;
- flat, aligned locale catalogs and authored Markdown width;
- package licenses and exact current root and shared CC0 scope maps;
- tracked lockfile workspace metadata;
- build output names, aggregate configuration, and path safety; and
- documentation and configuration consistency.

Repository tests exercise those rules against temporary fixtures instead of
repeatedly scanning the real tree. Build tests cover artifact headers, retained
notices, isolated output, collisions, and deterministic aggregate output.

## Adding a Gadget

Create an immediate package under `src/` with the standard package documents,
side-effect-free `index.ts`, browser entry, and `main.ts` composition root. Add
only the responsibility branches the package uses. Then add valid
`gadgetBuild`, import aliases, workspace dependencies, scripts, engine, Vue
output settings, and a referenced Vue project when the package uses Vue.

Publish only shared subpaths that are intended as stable contracts. Add package
tests and any repository fixtures needed for a new contract. Then run the full
[development workflow][3]. Package discovery, checking, and aggregate building
must pick up the gadget from its manifest without a tooling source edit.

[1]: source-architecture.md
[2]: diagnostics.md
[3]: development-workflow.md
