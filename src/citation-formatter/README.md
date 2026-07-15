# Citation Formatter

Citation Formatter is a MediaWiki source-editor gadget. Its **Format
citations** page action:

- formats supported English Wikipedia CS1 templates in block style;
- resolves parameter aliases and order from generated English Wikipedia
  TemplateData;
- normalizes unambiguous English citation dates to ISO dates;
- names references with an APA-style author/date key, including `n.d.`,
  same-year letter suffixes, and page or timestamp locators;
- names plain-text and mixed-content notes sequentially as `:1`, `:2`, etc.;
- converts `{{r}}` calls to native ref tags; and
- moves full refs into matching grouped `<references>` or `{{reflist}}`
  containers.

The supported set is the CS1 list at
`Template:Citation Style documentation/cs1`, plus `Cite video game`. The built
gadget makes no metadata request at runtime. Refresh the committed data over
HTTPS and rebuild with:

```sh
npm run update:template-data -w citation-formatter
npm run build -w citation-formatter
```

The updater accepts a curl proxy through `CITATION_TEMPLATE_PROXY`, for
example `socks5h://localhost:7897`.

For a non-Latin author or organization name, an HTML comment beginning with
`#` supplies its reference-name form without changing the citation display:

```wikitext
| author = 宵崎奏<!-- # Yoisaki, Kanade -->
| publisher = セガ<!--# Sega -->
```

Build from the workspace root with `npm run build -w citation-formatter`.

## Version history

### 0.1.1

- Added shared native textarea, CodeMirror, and VisualEditor source-mode
  editing support.

### 0.1.0

- Initial citation formatting and list-defined-reference conversion release.
