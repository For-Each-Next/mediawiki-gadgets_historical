# Citation Formatter

Citation Formatter formats and manages CS1 citations in MediaWiki source editors. It provides browser-ready MediaWiki
gadget and userscript builds plus a side-effect-free TypeScript API.

> **Status:** Citation Formatter is under active development.

## Run

Build the package from the repository root:

```shell
npm run build -w citation-formatter
```

This writes two ignored artifacts to `dist/citation-formatter/`:

- `citation_formatter.min.js` for a MediaWiki personal JavaScript page.
- `citation_formatter.user.js` for Tampermonkey; its generated metadata matches Wikipedia and Wikimedia sites.

### MediaWiki user page

On the target wiki, open `Special:MyPage/common.js`, paste the complete contents of
`dist/citation-formatter/citation_formatter.min.js`, and publish the page. Use [Meta-Wiki's
`Special:MyPage/global.js`][1] instead to load Citation Formatter on every Wikimedia wiki where the account is active.
Personal JavaScript pages must be enabled by the wiki; see MediaWiki's
[personal-script documentation][2].

After publishing, bypass the browser cache or perform a hard refresh.

### Tampermonkey

In the [Tampermonkey][3] dashboard, select **Add a new script**, replace the editor contents with the complete contents
of `dist/citation-formatter/citation_formatter.user.js`, and save it. Keep the generated metadata header intact and make
sure the installed script is enabled. Chrome-based browsers may also require the extension's
[userscript execution permission][4].

After either installation, open a page in a supported MediaWiki source editor. Citation Formatter appears in the page
actions or toolbox and as a floating launcher at the bottom right. Review all transformed wikitext before saving.

## Features

Citation Formatter:

- formats supported English Wikipedia CS1 templates in inline or block style;
- resolves parameter aliases and order from generated English Wikipedia TemplateData;
- normalizes unambiguous English citation dates to ISO dates;
- names references with an APA-style author/date key, including `n.d.`, same-year letter suffixes, and page or time
  locators;
- names plain-text and mixed-content notes sequentially as `:1`, `:2`, etc.;
- converts `{{r}}` calls to native ref tags;
- moves full refs into matching grouped `<references>` containers;
- inserts a source at the current source-editor cursor, accepting URLs, identifiers, and citation text while reusing an
  existing named URL reference when possible;
- builds editable citation drafts from Wikimedia Citoid metadata and existing Internet Archive snapshots, including
  pasted Wayback URLs; and
- creates manual citations for offline sources, with concise template-specific fields while preserving populated and
  custom fields during citation-template changes.

The interface follows Wikimedia Codex form, dialog, table, tab, feedback, icon, and responsive-layout conventions. It
uses the MediaWiki interface language (`wgUserLanguage`) and currently includes English, Simplified Chinese, and
Traditional Chinese. Common MediaWiki variants such as `zh`, `zh-CN`,
`zh-SG`, `zh-HK`, and `zh-TW` resolve to the appropriate Chinese catalog; other languages fall back to English.

## Citation rules

The supported set is the CS1 list at
`Template:Citation Style documentation/cs1`, the general CS2 `Citation`
template, and `Cite video game`. Its TemplateData is committed under
`domain/data/`; source insertion optionally requests citation metadata and archive availability at runtime.

The shared [CS1 maintenance workflow][5] covers safe TemplateData and rule refreshes. Follow it with the site-specific
[English Wikipedia][6] or [Chinese Wikipedia][7] interpretation rules.

For a non-Latin author or organization name, an HTML comment beginning with
`#` supplies its reference-name form without changing the citation display:

```wikitext
| author = 宵崎奏<!-- # Yoisaki, Kanade -->
| publisher = セガ<!--# Sega -->
```

When a new source repeats a creator name with an alias used elsewhere in the article, the source manager offers it as an
`Auto-suggested value`. **Use**
copies it into the alias field; **Dismiss** hides it for the current draft. Ignoring the suggestion also leaves the
citation unchanged.

On a `url` field, the same comment supplies an explicit source-identity key. The actual URL is the fallback key, so only
continuation pages need to point back to an unmarked base page:

```wikitext
| url = https://example.test/interview.html
| page = 1
```

```wikitext
| url = https://example.test/interview_2.html<!-- # https://example.test/interview.html -->
| page = 2
```

The real links remain unchanged. Matching source keys suppress same-year letter suffixes and allow the page values to
distinguish the reference names.

Add `!no-author` to a field's comment to exclude that field from the author-fallback chain. It can share a comment with
a reference-name override:

```wikitext
| website = 游民星空<!-- !no-author # Youmin Xingkong -->
```

The corresponding `!no-date` and `!no-part` directives exclude a field from the reference name's date or part locator:

```wikitext
| publication-date = 2025-05-20<!-- !no-date -->
| time = 1:15:41<!-- !no-part -->
```

## Development

Citation Formatter requires Node.js 22.18 or newer. From the repository root, run:

```shell
npm install
npm run check -w citation-formatter
npm test -w citation-formatter
npm run build -w citation-formatter
```

Refresh every supported template from English Wikipedia's live TemplateData API with
`npm run update:template-data -w citation-formatter`; follow the linked English and Chinese CS1 guides when updating
site-specific rules.

## Public functions

The package entry point (`index.ts`) is side-effect free. The gadget build uses
`browser.ts`, which exports the same API and mounts the MediaWiki editor action. The transformation functions operate on
supplied text without mutating it.

| Function                                                                 | Introduction                                                                                                                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatCitations(text, layout?)`                                         | Formats complete article wikitext with the bundled TemplateData. It returns a `CitationFormatResult` containing the formatted text and operation counts.       |
| `formatCitationWikitext(text, templateData, layout?)`                    | Runs the formatter with a caller-provided `CitationTemplateDataMap`. Use this when TemplateData is supplied outside the gadget package.                        |
| `findUsedCitationTemplates(text)`                                        | Returns the supported citation-template names found in active article wikitext.                                                                                |
| `normalizeEnglishDate(value)`                                            | Converts an unambiguous English citation date to ISO form and leaves unsupported or ambiguous input unchanged.                                                 |
| `findNameOverrideFields(text)`                                           | Finds non-Latin citation-name contributors and their existing `<!-- # … -->` overrides. The returned field IDs can be edited and passed to a manager function. |
| `manageCitations(text, updates, compact, layout?, leadLabel?)`           | Applies `NameOverrideUpdate` values, formats citations, and chooses native `<ref>` reuse calls or compact `{{r}}` calls. It returns only the updated wikitext. |
| `manageCitationsWithResult(text, updates, compact, layout?, leadLabel?)` | Performs the same manager workflow while retaining the formatter's operation counts.                                                                           |

`layout` is `"block"` by default and may be set to `"inline"`. A name-override update has the shape
`{ ids: string[], override: string }`; use the `ids`
returned by `findNameOverrideFields` so every occurrence in one shared field is updated together.

```ts
import {
    findNameOverrideFields,
    manageCitationsWithResult,
} from "citation-formatter";

const fields = findNameOverrideFields(articleWikitext);
const updates = fields.map(({ ids, override }) => ({ ids, override }));
const result = manageCitationsWithResult(
    articleWikitext,
    updates,
    false,
    "block",
);
```

## Architecture

- `api.ts` owns the public, browser-independent exports; `browser.ts` contains the MediaWiki mounting side effect.
- `domain/` contains citation parsing, validation, analysis, and deterministic wikitext transformations.
- `infra/` contains the Citoid, archive, and wiki-link integrations.
- `ui/` contains the editor launcher, Codex controller, standalone Vue template, and bundled semantic styles.
- `i18n/` contains type-checked catalogs and small adapters that supply localized text to otherwise locale-independent
  domain services.

See the package [history][8], its scoped [AGENTS.md][9], and the repository
[AGENTS.md][10] for architecture, safety, versioning, and verification rules.

## License

Citation Formatter is licensed under CC BY-SA 4.0.

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: https://www.mediawiki.org/wiki/Manual:Interface/JavaScript#Personal_scripts
[3]: https://www.tampermonkey.net/faq.php?q=Q102
[4]: https://www.tampermonkey.net/faq.php?q=Q209
[5]: docs/CS1-MAINTENANCE.md
[6]: docs/ENWIKI-CS1.md
[7]: docs/ZHWIKI-CS1.md
[8]: HISTORY.md
[9]: AGENTS.md
[10]: ../../AGENTS.md
