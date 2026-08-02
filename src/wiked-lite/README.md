# wikEd Lite

wikEd Lite is a lightweight MediaWiki source-editor enhancement that formats
and highlights wikitext. It is a typed rebuild of Cacycle's public-domain wikEd
ideas and is under active development.

## Run

Build the package from the repository root:

```shell
npm run build -w wiked-lite
```

The command writes three ignored artifacts directly to `dist/`:

- `wiked_lite.js` is the formatted, human-readable MediaWiki gadget.
- `wiked_lite.min.js` is the minified MediaWiki gadget.
- `wiked_lite.user.js` is the Greasemonkey-compatible userscript.

For a personal MediaWiki installation, copy the complete minified artifact to
`Special:MyPage/common.js`. Use [Meta-Wiki global JavaScript][1] to load it on
all Wikimedia wikis where the account is active. A site administrator may
instead register the same file as a ResourceLoader gadget.

For a userscript installation, replace a new Tampermonkey script with the
complete contents of `wiked_lite.user.js` and keep its metadata header intact.
After either installation, hard-refresh an edit or submit page that uses the
wikitext content model. Review formatting changes before saving the page.

## Features

- Renders the editable syntax highlighter in an isolated iframe while mirroring
  every edit immediately to the native submitted textarea.
- Highlights references and short footnotes in purple, explanatory footnotes in
  blue, bold and italic apostrophe markup, table syntax, parameter names, and
  nested templates while retaining the source textarea's typography.
- Opens delayed, anchored MediaWiki-style previews for plain references and
  `ref`, `r`, `sfn`, or `efn` citations, with viewport-aware placement and
  hover-safe transitions that keep links usable.
- Pairs matching prefixed `last` and `first` citation fields on one row and
  preserves separate original and archived links without rendering untrusted
  HTML.
- Displays Chinese `link-xx` and `tsl` helpers like local wikilinks and opens
  template or link targets on Control-click or Command-click.
- Applies conservative wikEd-style basic fixes to the selection or whole page,
  with opt-in template alignment, Chinese-conversion cleanup, category sorting,
  redirect replacement, and missing-page highlighting.
- Supports English, Simplified Chinese, and Traditional Chinese interfaces.

The enhanced editor does not replace the submitted textarea. It avoids pages
where another editor has hidden that textarea and makes network-backed link
checks optional.

## Development

wikEd Lite requires Node.js 22.18 or newer. From the repository root, run:

```shell
npm run check -w wiked-lite
npm test -w wiked-lite
npm run build -w wiked-lite
```

Pure formatter, scanner, highlighter, and reference tests use local fixtures.
Redirect and missing-page checks require a live MediaWiki API only in the
browser; formatting and editing continue if those options are not selected.

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
- `infra/` batches redirect and missing-page lookups behind UI contracts.
- `i18n/` keeps flat, typed locale catalogs.

## License

wikEd Lite is released under CC0 1.0. It credits Cacycle as the original author
of wikEd and its lightweight editing ideas. The rebuild also acknowledges
[Remember the dot's Syntax highlighter][5] as an inspiration. The repository
license notice is in [LICENSE][6].

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: CHANGELOG.md
[3]: AGENTS.md
[4]: ../../AGENTS.md
[5]: https://www.mediawiki.org/wiki/User:Remember_the_dot/Syntax_highlighter
[6]: ../../LICENSE
