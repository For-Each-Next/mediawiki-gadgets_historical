# Citation Formatter

Citation Formatter formats and manages CS1 citations in MediaWiki source
editors. It provides browser-ready MediaWiki gadget and userscript builds.

> **Status:** Citation Formatter is under active development.

## Run

Build the package from the repository root:

```shell
npm run build -w citation-formatter
```

This writes two ignored artifacts to `dist/citation-formatter/`:

- `citation_formatter.min.js` for a MediaWiki personal JavaScript page.
- `citation_formatter.user.js` for Tampermonkey. Its generated metadata matches
  Wikipedia and Wikimedia sites.

### MediaWiki user page

On the target wiki, open `Special:MyPage/common.js`, paste the complete
contents of `dist/citation-formatter/citation_formatter.min.js`, and publish
the page. Use [Meta-Wiki's `Special:MyPage/global.js`][1] instead to load
Citation Formatter on every Wikimedia wiki where the account is active.
Personal JavaScript pages must be enabled by the wiki; see MediaWiki's
[personal-script documentation][2].

After publishing, bypass the browser cache or perform a hard refresh.

### Tampermonkey

In the [Tampermonkey][3] dashboard, select **Add a new script**, replace the
editor contents with the complete contents of
`dist/citation-formatter/citation_formatter.user.js`, and save it. Keep the
generated metadata header intact and make sure the installed script is enabled.
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
- inserts a source at the current source-editor cursor from a URL, identifier,
  or citation while reusing an existing named URL reference when possible;
- builds editable drafts from Wikimedia Citoid metadata and existing Internet
  Archive snapshots, including pasted Wayback URLs;
- orders citation-template choices by importance and specificity, with icons on
  the important choices; and
- creates manual citations for offline sources while preserving populated and
  custom fields during citation-template changes.

The interface follows Wikimedia Codex form, dialog, table, tab, feedback, icon,
and responsive-layout conventions. It uses the MediaWiki interface language
(`wgUserLanguage`) and includes English, Simplified Chinese, and Traditional
Chinese. Common MediaWiki variants such as `zh`, `zh-CN`, `zh-SG`, `zh-HK`, and
`zh-TW` resolve to the appropriate Chinese catalog; other languages fall back
to English.

## Citation rules

The supported set is the CS1 list at
`Template:Citation Style documentation/cs1`, the general CS2 `Citation`
template, and `Cite video game`. Its TemplateData is committed under
`domain/data/`. Source insertion can request citation metadata and archive
availability at runtime.

The shared [CS1 maintenance workflow][5] covers safe TemplateData and rule
refreshes. Follow it with the site-specific [English Wikipedia][6] or [Chinese
Wikipedia][7] interpretation rules.

See the [reference-name guide][13] for alias and source-identity comments,
exclusion directives, and source-manager suggestions.

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

Follow the linked English and Chinese CS1 guides when updating site-specific
rules.

## Architecture

Dependencies follow a downward orchestration model:

```text
browser.ts
└── main.ts
    ├── ui
    ├── workflows
    ├── contracts
    ├── domain
    ├── infra
    └── shared

api.ts / index.ts
└── domain
```

- `api.ts` and `index.ts` expose browser-independent core operations for
  internal composition and tests, not from the generated gadget global.
- `browser.ts` invokes the `start` function from the composition root.
- `main.ts` wires MediaWiki startup, UI, domain services, and adapters.
- `ui/` owns Codex rendering, editor adapters, and user interaction.
- `workflows/` coordinates live review operations through typed ports.
- `contracts/` defines the boundary shared by workflows and UI.
- `domain/` contains deterministic citation metadata mapping and wikitext
  rules.
- `infra/` uses the shared raw Citoid client and isolates archive and wiki
  integrations.
- `i18n/` contains type-checked interface catalogs.

See the package [changelog][8], its scoped [AGENTS.md][9], and the repository
[AGENTS.md][10] for architecture, safety, versioning, and verification rules.

## License

Citation Formatter is licensed under [CC BY-SA 4.0][11]. The repository license
notice is in [LICENSE][12].

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: https://www.mediawiki.org/wiki/Manual:Interface/JavaScript
[3]: https://www.tampermonkey.net/faq.php?q=Q102
[4]: https://www.tampermonkey.net/faq.php?q=Q209
[5]: docs/CS1-MAINTENANCE.md
[6]: docs/ENWIKI-CS1.md
[7]: docs/ZHWIKI-CS1.md
[8]: CHANGELOG.md
[9]: AGENTS.md
[10]: ../../AGENTS.md
[11]: https://creativecommons.org/licenses/by-sa/4.0/
[12]: ../../LICENSE
[13]: docs/REFERENCE-NAMES.md
