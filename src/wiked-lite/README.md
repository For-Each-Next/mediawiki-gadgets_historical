# wikEd Lite

wikEd Lite is a lightweight MediaWiki source-editor enhancement that formats
and highlights wikitext. It is a typed rebuild of Cacycle's public-domain wikEd
ideas and is under active development.

## Run

Build the package from the repository root:

```shell
npm run build -w wiked-lite
```

This package-only build writes one ignored artifact directly under `dist/`:

- `dist/wiked_lite.min.js` is the minified MediaWiki gadget.

A complete workspace build with `npm run build` writes every gadget's minified
file and `dist/00-mediawiki-gadgets.user.js`, the single Greasemonkey-
compatible userscript containing all gadgets. Run `npm run build:all-userscript`
to rebuild only `dist/00-mediawiki-gadgets.user.js` directly from the current
sources.

For a personal MediaWiki installation, copy the complete minified artifact to
`Special:MyPage/common.js`. Use [Meta-Wiki global JavaScript][1] to load it on
all Wikimedia wikis where the account is active. A site administrator may
instead register the same file as a ResourceLoader gadget.

For a userscript installation, replace a new Tampermonkey script with the
complete contents of `dist/00-mediawiki-gadgets.user.js` and keep its metadata
header intact. This userscript contains every workspace gadget; each one starts
only on its
declared sites. After either installation, hard-refresh an edit or submit page
that uses the wikitext content model. Review formatting changes before saving
the page.

## Features

- Renders the editable syntax highlighter in an isolated iframe while mirroring
  every edit immediately to the native submitted textarea.
- Highlights references and short footnotes in purple, explanatory footnotes in
  blue, parser-function and variable heads in red, bold and italic apostrophe
  markup, table syntax, parameter names, and nested templates while retaining
  the source textarea's typography.
- Resets template depth inside native and `Reflist` reference definitions, and
  distinguishes documented file formats, alignments, dimensions, and named
  options; selected HTML or CSS keys; progressively nested HTML tag bodies; and
  entered Chinese-conversion declaration keys with the existing syntax palette.
- Opens delayed, anchored MediaWiki-style previews for plain references and
  `ref`, `r`, or `sfn` citations, with viewport-aware placement and hover-safe
  transitions that keep links usable.
- Pairs matching prefixed `last` and `first` citation fields on one row and
  preserves separate original and archived links without rendering untrusted
  HTML.
- Displays Chinese `link-xx` and `tsl` helpers like local wikilinks and opens
  template or link targets on Control-click or Command-click.
- Distinguishes brace-based magic variables and parser functions from templates
  without Template navigation, while static `#invoke` operands open their
  Module pages.
- Applies conservative wikEd-style basic fixes to the selection or whole page,
  with opt-in template alignment, Chinese-conversion cleanup, redirect targets
  rewritten as piped links that keep their original text, and missing-page
  highlighting; headings gain a following blank line without separating
  `DEFAULTSORT` from later content.
- Recognizes every English and Chinese Wikipedia namespace alias from bundled
  catalogs, and loads local namespace siteinfo in the background on other
  wikis.
- Supports English, Simplified Chinese, and Traditional Chinese interfaces.

The enhanced editor does not replace the submitted textarea. It avoids pages
where another editor has hidden that textarea. Network-backed redirect
replacement and missing-link highlighting remain optional because their API
requests may slow the action.

## Development

wikEd Lite requires Node.js 22.18 or newer. From the repository root, run:

```shell
npm run check -w wiked-lite
npm test -w wiked-lite
npm run build -w wiked-lite
```

Pure formatter, scanner, highlighter, and reference tests use local fixtures.
Redirect and missing-page checks require a live MediaWiki API only in the
browser. Other wikis also request namespace siteinfo in the background;
formatting and editing continue when that optional request fails.

Completed work is recorded in the package [changelog][2]. Development follows
the package [instructions][3] and repository [instructions][4].

## Architecture

Dependencies point inward through the composition root:

```text
browser.ts
└── main.ts
    ├── ui ─────> domain, shared
    ├── infra ──> MediaWiki API
    └── domain ─> short-footnote resolver and shared wikitext queries

index.ts
└── domain
```

- `browser.ts` invokes `start` from the `main.ts` composition root.
- `main.ts` wires optional MediaWiki API operations into the editor UI.
- `ui/` owns iframe rendering, native-textarea synchronization, safe DOM
  highlighting, citation tooltips, styles, and the co-located Codex formatter
  dialog.
- `domain/` contains deterministic formatting and preview logic backed by the
  lazy `wikitext(source)` facade. Its construct methods run focused scanners
  without building a document-wide syntax tree.
- `infra/` discovers current-wiki namespaces and batches redirect and
  missing-page lookups behind UI contracts.
- `i18n/` keeps flat, typed locale catalogs.

## License

The project-owned portions of wikEd Lite 0.4.4 are dedicated under [CC0 1.0
Universal][6]. It credits Cacycle as the original author of wikEd and its
lightweight editing ideas. The rebuild also acknowledges [Remember the dot's
Syntax highlighter][5] as an inspiration. The package [license][7] fixes this
release's scope; the repository [licensing map][8] covers the workspace.

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: CHANGELOG.md
[3]: AGENTS.md
[4]: ../../AGENTS.md
[5]: https://www.mediawiki.org/wiki/User:Remember_the_dot/Syntax_highlighter
[6]: https://creativecommons.org/publicdomain/zero/1.0/
[7]: LICENSE
[8]: ../../LICENSE
