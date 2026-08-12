# Source Architecture

This guide defines the source tree and dependency rules for deployable gadgets
and the shared capability package. The repository checker enforces these rules
against static, exported, type-only, and dynamic imports.

## Gadget Tree

Every deployable gadget owns these package-root files:

```text
src/<gadget>/
├── AGENTS.md
├── CHANGELOG.md
├── LICENSE
├── README.md
├── package.json
├── browser.ts
├── main.ts
├── index.ts
└── globals.d.ts            only when build globals need declarations
```

A gadget adds only the responsibility branches it uses:

```text
src/<gadget>/
├── config/                 static product and site policy
├── contracts/              ports shared by multiple local branches
├── domain/                 deterministic product rules
├── workflows/              use-case coordination
├── adapters/               browser and external-system implementations
│   ├── browser/
│   ├── mediawiki/
│   ├── network/
│   ├── observability/
│   └── storage/
├── ui/                     state and presentation
│   ├── app/
│   ├── components/
│   ├── dialogs/
│   ├── form/
│   └── presenters/
├── i18n/                   catalogs and runtime translation
└── docs/                   focused contributor guides
```

These subdirectories are examples, not mandatory placeholders. Name deeper
paths for the capability they implement. Do not keep empty layers or create
generic `common`, `helpers`, or `utils` paths.

`infra`, `support`, `handlers`, `services`, `sources`, `jobs`, and `publishing`
are not top-level responsibilities. Classify external-system code under
`adapters/`, coordination under `workflows/`, and product rules under
`domain/`.

## Entry Modules

`browser.ts` is the browser entry. It imports `{ start }` from
`#gadget/main.ts`, invokes it, and imports no other local module. It may gate
startup on MediaWiki state, but initialization dependencies belong in the
composition root.

`main.ts` is the only composition root. It exports exactly one zero-argument
`start` function and wires UI, workflows, and adapters through contracts. It
may import every package layer; other layers must not import it.

`index.ts` is a side-effect-free package facade. It exposes only deliberate
domain operations and contracts. It must not start browser work, import UI, or
expose adapter and workflow implementations.

## Dependency Graph

The local graph is default-deny. An import is valid only when listed here:

```text
config     -> config
contracts  -> config, contracts, domain
domain     -> config, domain
i18n       -> i18n
workflows  -> config, contracts, domain, workflows
adapters   -> config, contracts, domain, adapters
ui         -> config, contracts, domain, i18n, ui
index.ts   -> contracts, domain
browser.ts -> main.ts
main.ts    -> every package layer
```

Workflows coordinate supplied ports; they do not construct or import adapter
implementations. Adapters return structured results and do not translate
user-facing text. UI invokes supplied actions instead of importing workflows or
adapters. Domain code remains deterministic and browser-independent.

Use `#gadget` or `#gadget/*` for package-local imports. Relative imports may be
used within a responsibility but cannot escape the package. A gadget never
imports another gadget.

## Shared Capabilities

`src/shared` is a capability library, not a deployable gadget, so the gadget
layer tree does not apply to it. Each top-level directory owns one coherent,
cross-gadget API:

```text
src/shared/
├── citoid/
├── edit-box/
├── i18n/
├── logging/
├── mediawiki/
│   └── notifications/
├── short-footnotes/
├── wiki-titles/
└── wikitext/
```

The exact capabilities may evolve. `src/shared/package.json#exports` is always
the sole public map. Every export is a focused `./<capability>` subpath that
targets a real file. There is no bare aggregate export.

Gadgets import only `#shared/<capability>`. They cannot use the shared package
name directly or reach private shared files. Shared source cannot import a
gadget. Code used by only one gadget belongs to that gadget, not in shared.

## Adding Source

Choose the owner before writing a module:

1. Put deterministic product behavior in the owning gadget's `domain/`.
2. Put a use case that coordinates ports in `workflows/`.
3. Put MediaWiki, network, browser, or storage access in `adapters/`.
4. Put display state and rendering in `ui/`.
5. Promote code to `shared` only after it is a stable cross-gadget capability.

Add a focused repository fixture when introducing a new architectural rule. Run
the package checks while iterating and the complete [development workflow][1]
before handoff.

[1]: development-workflow.md
