# Citation Formatter

Citation Formatter formats and manages CS1 citations in MediaWiki source
editors. It provides browser-ready MediaWiki gadget and userscript builds.

> **Status:** Citation Formatter is under active development.

## Run

Build the package from the repository root:

```shell
npm run build -w citation-formatter
```

This writes three ignored artifacts directly to `dist/`:

- `citation_formatter.js` is the formatted, human-readable version.
- `citation_formatter.min.js` is the minified version.
- `citation_formatter.user.js` is the Greasemonkey-compatible version.

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
contents of `dist/citation_formatter.user.js`, and save it. Keep the generated
metadata header intact and make sure the installed script is enabled.
Chrome-based browsers may also require the extension's [userscript execution
permission][4].

After either installation, open a page in a supported MediaWiki source editor.
Citation Formatter appears in the page actions or toolbox and as a floating
launcher at the bottom right. Review all transformed wikitext before saving.

## Features

Citation Formatter:

- formats supported English Wikipedia CS1 templates in inline or block style;
- resolves parameter aliases and order from generated English Wikipedia
  TemplateData;
- normalizes unambiguous English citation dates to ISO dates;
- names references with an APA-style author and date key, including `n.d.`,
  same-year letter suffixes, and page or time locators;
- names plain-text and mixed-content notes sequentially as `:1`, `:2`, and so
  on;
- converts `{{r}}` calls to native ref tags;
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
- checks CS1 validity, non-CS1 sources, and citation-name consistency with
  selective fixes and session-safe reversion; and
- reserves live English or Chinese Wikipedia CS1 checks for explicit review.

The interface uses Wikimedia Codex and supports English, Simplified Chinese,
and Traditional Chinese, with MediaWiki language-variant resolution. The
supported citation set follows the committed English Wikipedia CS1/CS2
TemplateData. Native textareas, CodeMirror, and VisualEditor source surfaces
are supported. See the [reference-name guide][5] for source-identity comments
and exclusion directives.

## Development

Citation Formatter requires Node.js 22.18 or newer. From the repository root,
run:

```shell
npm install
npm run check -w citation-formatter
npm test -w citation-formatter
npm run build -w citation-formatter
```

Refresh every supported template from English Wikipedia's live TemplateData API
with:

```shell
npm run update:template-data -w citation-formatter
```

Follow the shared [CS1 maintenance workflow][6] and the site-specific [English
Wikipedia][7] or [Chinese Wikipedia][8] guide when updating metadata or
validation rules.

Completed work is recorded in the package [changelog][9]. Development follows
the package [instructions][10] together with the repository [instructions][11].

## Architecture

Dependencies follow a downward orchestration model:

```text
browser.ts
└── main.ts
    ├── ui ──────────> domain, contracts, shared
    ├── workflows ───> domain, contracts
    └── infra ───────> domain, shared

api.ts / index.ts
└── domain
```

- `browser.ts` handles MediaWiki startup and invokes `start` from the `main.ts`
  composition root.
- `main.ts` wires UI, workflows, and infrastructure through explicit contracts.
- `ui/` owns Codex rendering, editor adapters, and user interaction;
  `workflows/` coordinates live review operations; and `infra/` isolates
  Citoid, archive, and wiki integrations.
- `domain/` contains deterministic citation metadata mapping and wikitext
  rules. `api.ts` and `index.ts` expose browser-independent operations for
  tests without adding them to the generated gadget global.
- `i18n/` stores flat JSON locale catalogs behind a typed registry.

## License

Citation Formatter is licensed under [CC BY-SA 4.0][12]. The repository license
notice is in [LICENSE][13].

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
[12]: https://creativecommons.org/licenses/by-sa/4.0/
[13]: ../../LICENSE
