# Citation Formatter

Citation Formatter formats and manages CS1 and other `Cite`-prefixed citations
in MediaWiki source editors. It provides browser-ready MediaWiki gadget and
userscript builds.

> **Status:** Citation Formatter is under active development.

## Run

Build the package from the repository root:

```shell
npm run build -w citation-formatter
```

This package-only build writes one ignored artifact directly under `dist/`:

- `dist/citation_formatter.min.js` is the minified MediaWiki gadget.

A complete workspace build with `npm run build` writes every gadget's minified
file and `dist/00-mediawiki-gadgets.user.js`, the single
Greasemonkey-compatible userscript containing all gadgets. Run
`npm run build:all-userscript` to rebuild only
`dist/00-mediawiki-gadgets.user.js` directly from the current sources.

### MediaWiki user page

On the target wiki, open `Special:MyPage/common.js`, paste the complete
contents of `dist/citation_formatter.min.js`, and publish the page. Use
[Meta-Wiki's `Special:MyPage/global.js`][1] instead to load Citation Formatter
on every Wikimedia wiki where the account is active. Personal JavaScript pages
must be enabled by the wiki; see MediaWiki's [personal-script
documentation][2].

After publishing, bypass the browser cache or perform a hard refresh.

### Userscript manager

In [Tampermonkey][3], a compatible userscript manager, open the dashboard and
select **Add a new script**. Replace the editor contents with the complete
contents of `dist/00-mediawiki-gadgets.user.js`, and save it. Keep the
generated metadata header intact and make sure the installed script is enabled.
This userscript contains every workspace gadget; each one starts only on its
declared sites. Chrome-based browsers may also require the extension's
[userscript execution permission][4].

After either installation, open a page in a supported MediaWiki source editor.
Citation Formatter appears in the page actions or toolbox and as a floating
launcher at the bottom right. Review all transformed wikitext before saving.

## Features

Citation Formatter:

- starts only on pages whose MediaWiki content model is wikitext;
- formats supported English Wikipedia CS1 templates in inline or block style;
- resolves parameter aliases and order from generated English Wikipedia
  TemplateData;
- edits and formats every `Cite`-prefixed template, using browser-cached
  local-wiki TemplateData names, order, and aliases when available while
  preserving duplicate and empty fields and avoiding CS1-only checks;
- recognizes bundled English and Chinese Wikipedia Template namespace aliases,
  and loads local namespace siteinfo when opened on another wiki;
- normalizes unambiguous English citation dates and single-digit ISO date
  components to zero-padded ISO dates;
- replaces a focused set of common English language names with compact ISO
  language codes;
- names references with an APA-style author and date key, including `n.d.`,
  same-year letter suffixes, and page or time locators;
- names plain-text and mixed-content notes sequentially as `:1`, `:2`, and so
  on;
- converts `{{r}}` calls to native ref tags;
- discovers bibliography citations used through `{{sfn}}`, previews their use
  positions, and reuses their short-footnote calls;
- moves full refs into matching grouped `<references>` containers;
- browses, filters, and paginates existing sources by keyword or article
  section, shows their exact usage sections, and reuses or edits them;
- inserts a source at the current source-editor cursor from a URL, DOI, ISBN,
  ISSN, PMID, PMCID, QID, or pasted citation while reusing an existing named
  URL reference when possible;
- builds editable drafts from Wikimedia Citoid metadata, Internet Archive
  snapshots, pasted Wayback URLs, or manual offline-source details; and
- offers categorized citation-template choices with clear icons and importance
  tiers while preserving populated and custom fields;
- preserves existing parameter spelling and values in the item editor until an
  explicit formatting action; `script-title` formatting can be disabled, uses
  primary language codes, and generates fields for non-Latin or every foreign
  language;
- checks CS1 errors and green maintenance comments in severity order, checks
  non-CS1 sources and citation-name consistency, and offers selective fixes
  with session-safe reversion; and
- reserves live English or Chinese Wikipedia CS1 checks for explicit review.

The interface uses Wikimedia Codex and supports English, Simplified Chinese,
and Traditional Chinese, with MediaWiki language-variant resolution. The
CS1-specific citation set follows the committed English Wikipedia CS1/CS2
TemplateData. Native textareas, CodeMirror, and VisualEditor source surfaces
are supported. See the [reference-name guide][5] for source-identity comments
and exclusion directives.

## Development

Citation Formatter requires Node.js 24.14.1 or newer. From the repository root,
run:

```shell
npm ci
npm run check -w citation-formatter
npm test -w citation-formatter
npm run build -w citation-formatter
```

The repository [development workflow][15] explains the complete verification
gate and when live-service access is appropriate.

Refresh every supported template from English Wikipedia's live TemplateData API
with:

```shell
npm run update:template-data -w citation-formatter
```

Follow the shared [CS1 maintenance workflow][6] and the site-specific [English
Wikipedia][7] or [Chinese Wikipedia][8] guide when updating metadata or
validation rules.

Tests use local fixtures. In the browser, formatting an otherwise unknown
`Cite`-prefixed template may query the local wiki's TemplateData API and falls
back to preservation-only formatting when the API or storage is unavailable.
Opening the dialog on a wiki other than English or Chinese Wikipedia also
requests namespace siteinfo and retains a canonical-only fallback if it fails.
The package-owned MediaWiki adapter accepts one template or a large iterable,
resolving redirects through bounded serial requests before citation-specific
filtering.

Completed work is recorded in the package [changelog][9]. Development follows
the package [instructions][10] together with the repository [instructions][11].

## Architecture

Dependencies follow a downward orchestration model:

```text
browser.ts
└── main.ts
    ├── ui ──────────> config, domain, contracts, i18n, shared
    ├── workflows ───> config, domain, contracts
    ├── adapters ────> config, domain, contracts, shared
    └── domain ──────> config, shared

domain/api.ts / index.ts
└── domain
```

- `browser.ts` only invokes `start`; the `main.ts` composition root handles
  MediaWiki readiness and startup orchestration.
- `main.ts` wires UI, workflows, and adapters through explicit contracts.
- `ui/` owns Codex rendering, editor adapters, and user interaction;
  `workflows/` coordinates live review operations; and `adapters/` isolates
  Citoid, archive, namespace, TemplateData-cache, and wiki integrations.
- `config/` owns generated English Wikipedia citation TemplateData. `domain/`
  contains deterministic citation metadata mapping, language normalization, and
  wikitext rules, using shared construct queries and short-footnote matching.
  The queries retain source ranges without building a document-wide syntax
  tree. `domain/api.ts` and `index.ts` expose browser-independent operations
  for tests without adding them to the generated gadget global.
- `i18n/` stores flat JSON locale catalogs behind a typed registry.

## License

The project-owned portions of Citation Formatter 0.6.0 are dedicated under [CC0
1.0 Universal][12]. The package [license][13] fixes this release's scope and
preserves third-party terms. The repository [licensing map][14] covers the rest
of the workspace.

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: https://www.mediawiki.org/wiki/Manual:Interface/JavaScript
[3]: https://www.tampermonkey.net/faq.php?q=Q102
[4]: https://www.tampermonkey.net/faq.php?q=Q209
[5]: docs/reference-names.md
[6]: docs/cs1-maintenance.md
[7]: docs/enwiki-cs1.md
[8]: docs/zhwiki-cs1.md
[9]: CHANGELOG.md
[10]: AGENTS.md
[11]: ../../AGENTS.md
[12]: https://creativecommons.org/publicdomain/zero/1.0/
[13]: LICENSE
[14]: ../../LICENSE
[15]: ../../docs/development-workflow.md
