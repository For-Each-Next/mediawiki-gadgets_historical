# wikEd Lite

wikEd Lite is a lightweight MediaWiki source-editor enhancement that formats
and highlights wikitext. It is a typed rebuild of [Cacycle's public-domain
wikEd][5] ideas and is under active development.

## Run

Build the package from the repository root:

```shell
npm run build -w wiked-lite
```

This package-only build writes one ignored artifact directly under `dist/`:

- `dist/wiked_lite.min.js` is the minified MediaWiki gadget.

A complete workspace build with `npm run build` writes every gadget's minified
file and `dist/00-mediawiki-gadgets.user.js`, the single Greasemonkey-
compatible userscript containing all gadgets. Run
`npm run build:all-userscript` to rebuild only
`dist/00-mediawiki-gadgets.user.js` directly from the current sources.

For a personal MediaWiki installation, copy the complete minified artifact to
`Special:MyPage/common.js`. Use [Meta-Wiki global JavaScript][1] to load it on
all Wikimedia wikis where the account is active. A site administrator may
instead register the same file as a ResourceLoader gadget.

For a userscript installation, replace a new Tampermonkey script with the
complete contents of `dist/00-mediawiki-gadgets.user.js` and keep its metadata
header intact. This userscript contains every workspace gadget; each one starts
only on its declared sites. After either installation, hard-refresh an edit or
submit page that uses the wikitext content model. Review formatting changes
before saving the page.

## Features

- Renders the editable syntax highlighter in an isolated iframe while mirroring
  every edit immediately to the native submitted textarea.
- Preserves Undo and Redo across live highlighting refreshes while excluding
  the hidden native textarea from duplicate browser Find results.
- Highlights references and short footnotes in purple, explanatory footnotes in
  blue, parser-function and variable heads in red, bold and italic apostrophe
  markup, table syntax, parameter names, and nested templates. References and
  notes can use a single smaller-text level independently.
- Colors protocol-relative external-link targets and labels and recognizes
  inline definition-list separators inside multiline template data.
- Resets template depth inside native and `Reflist` reference definitions, and
  distinguishes documented file formats, alignments, dimensions, and named
  options; selected HTML or CSS keys; progressively nested HTML tag bodies; and
  entered Chinese-conversion declaration keys with the existing syntax palette.
- Opens optional delayed, anchored MediaWiki-style previews for plain
  references and `ref`, `r`, or `sfn` citations, with viewport-aware placement
  and hover-safe transitions that keep links usable. During section editing, an
  optional whole-page lookup resolves definitions outside the section.
- Pairs matching prefixed `last` and `first` citation fields on one row and
  preserves separate original and archived links without rendering untrusted
  HTML.
- Displays Chinese `link-xx` and `tsl` helpers like local wikilinks, optionally
  checks their local page operands and ordinary wikilinks for missing targets
  while editing, keeps unchecked targets in the editor foreground color until
  the background lookup finishes, and opens targets on Control-click or
  Command-click.
- Distinguishes brace-based magic variables and parser functions from templates
  without Template navigation, while static `#invoke` operands open their
  Module pages.
- Applies conservative wikEd-style basic fixes to the selection or whole page,
  with optional 0–4-space nesting indentation, a first-level indentation
  exception, and independent layouts for the first and later parameters on each
  line. Alignment can measure Chinese and English characters at a 5:3 or 2:1
  width ratio.
- Organizes block templates, other formatting, and editor display into three
  tabs, and saves the complete configuration from the dialog footer. Optional
  conversion cleanup preserves rule values while fixing top-level semicolons in
  recognized `{{NoteTA}}` and `-{...}-` rules, while leaving no-conversion
  terms untouched; redirect replacement can include safe static template
  transclusions.
- Applies selected large text, small reference and note text, target-only
  missing-page highlighting, reference previews, and whole-page reference
  lookup when the formatter dialog closes. Headings gain surrounding blank
  lines without separating `DEFAULTSORT` from later content.
- Recognizes every English and Chinese Wikipedia namespace alias from bundled
  catalogs, and loads local namespace siteinfo in the background on other
  wikis.
- Supports English, Simplified Chinese, and Traditional Chinese interfaces.
- Activates only for wikitext pages; every other editable content model uses a
  single CodeMirror editor with the available language-specific mode.

The enhanced editor does not replace the submitted textarea. It avoids pages
where another editor has hidden that textarea. Network-backed redirect
replacement, missing-link highlighting, and whole-page reference lookup remain
optional. Missing-link and reference lookups run without blocking editing;
redirect lookup may delay an explicitly requested formatting run. Failed
preview lookups retain section-local analysis.

## Development

wikEd Lite requires Node.js 24.14.1 or newer. From the repository root, run:

```shell
npm ci
npm run check -w wiked-lite
npm test -w wiked-lite
npm run build -w wiked-lite
```

Pure formatter, scanner, highlighter, editor-feature, and reference tests use
local fixtures. Redirect, missing-page, and whole-page reference checks require
a live MediaWiki API only in the browser. Other wikis also request namespace
siteinfo in the background; formatting and editing continue when an optional
request fails.

See the repository [development workflow][10] for the complete verification
gate and live-service policy.

Completed work is recorded in the package [changelog][2]. Development follows
the package [instructions][3] and repository [instructions][4].

## Architecture

Dependencies point inward through the composition root:

```text
browser.ts
└── main.ts
    ├── contracts <── ui
    ├── ui ─────────> contracts, domain, i18n, shared
    ├── adapters ───> shared, MediaWiki API
    └── domain ─────> shared wikitext, titles, and short footnotes

index.ts
└── domain
```

- `browser.ts` invokes `start` from the `main.ts` composition root.
- `main.ts` wires optional MediaWiki API operations into the editor UI.
- `contracts/` defines the injected editor, logging, and notification ports.
- `ui/` owns iframe rendering, native-textarea synchronization, safe DOM
  highlighting, citation tooltips, styles, and the co-located Codex formatter
  dialog.
- `domain/` contains deterministic formatting and preview logic backed by the
  lazy `wikitext(source)` facade. Its construct methods run focused scanners
  without building a document-wide syntax tree.
- `adapters/` discovers current-wiki namespaces, batches redirect and missing-
  page lookups, reads exact revision source for section previews, and isolates
  local formatter-settings storage behind UI contracts.
- Shared logging records sanitized diagnostics, while native MediaWiki
  notifications present short action results consistently with other gadgets.
- `i18n/` keeps flat, typed locale catalogs.

## License

The project-owned portions of wikEd Lite 0.5.3-post.1 are dedicated under [CC0
1.0 Universal][7]. It credits Cacycle as the original author of [wikEd][5] and
its lightweight editing ideas. The rebuild also acknowledges [Remember the
dot's Syntax highlighter][6] as an inspiration. The package [license][8] fixes
this release's scope; the repository [licensing map][9] covers the workspace.

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: CHANGELOG.md
[3]: AGENTS.md
[4]: ../../AGENTS.md
[5]: https://en.wikipedia.org/wiki/User:Cacycle/wikEd
[6]: https://www.mediawiki.org/wiki/User:Remember_the_dot/Syntax_highlighter
[7]: https://creativecommons.org/publicdomain/zero/1.0/
[8]: LICENSE
[9]: ../../LICENSE
[10]: ../../docs/development-workflow.md
