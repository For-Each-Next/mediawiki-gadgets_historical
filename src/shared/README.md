# Shared Runtime

Shared Runtime provides focused, cross-gadget capabilities for the MediaWiki
gadgets in this workspace. It is private workspace source, not a standalone
published package.

## Public API

The `exports` map in `package.json` is the only public surface. Gadget source
imports one responsibility through its matching `#shared/<name>` alias:

- `citoid` fetches raw citation metadata.
- `edit-box` adapts native, CodeMirror, and VisualEditor source editors.
- `i18n` resolves MediaWiki interface locales and interpolates messages.
- `logging` emits scoped, redacted console diagnostics.
- `mediawiki/notifications` reports action outcomes through `mw.notify`.
- `short-footnotes` resolves short-footnote citations.
- `wiki-titles` handles database-scoped namespace and title rules.
- `wikitext` parses and constructs wiki-independent syntax.

There is no bare aggregate. Private implementation paths are free to change
without creating another workspace-wide contract.

## Architecture

```text
shared/
├── citoid/                    network metadata acquisition
├── edit-box/                  editor contract and host adapters
├── i18n/                      locale and message mechanics
├── logging/                   structured console diagnostics
├── mediawiki/
│   ├── notifications/         native action notifications
│   └── codex-tokens.d.css     tooling-only token declaration
├── short-footnotes/           citation reuse resolution
├── wiki-titles/               wiki-scoped title rules
└── wikitext/                  syntax queries and builders
```

Each directory entry point is a public facade. Implementation modules remain
inside their capability. Shared code never imports a gadget, and reusable
domain behavior does not depend on UI state.

## Development

Use Node.js 24.14.1 or newer. Run the focused suite with:

```sh
npm test --workspace @mediawiki-gadgets/shared
```

A shared change affects every consuming gadget. Complete the repository-wide
verification and build every affected gadget before handoff.

## License

The current release-scoped shared-runtime dedication is recorded in
the [shared license][1]. Earlier release notices remain available in repository
Git history. The repository licensing map and third-party terms are in the root
license and third-party notices.

[1]: LICENSE