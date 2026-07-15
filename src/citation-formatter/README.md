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
- moves full refs into matching grouped `<references>` containers.

The supported set is the CS1 list at
`Template:Citation Style documentation/cs1`, the general CS2 `Citation`
template, and `Cite video game`. The built gadget makes no metadata request at
runtime. Refresh the committed data over HTTPS and rebuild with:

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

### 0.1.10

- Simplified successful formatting notices and only counted skipped refs.
- Added the general CS2 `Citation` template to the supported set.

### 0.1.9

- Collapsed reference-section banners to one centered 79-column comment.

### 0.1.8

- Rendered reference-section labels as centered 79-column comment banners.
- Reported unique reference definitions separately from repeated call tags,
  including calls originally written with the `R` template.

### 0.1.7

- Added an empty line before and after generated reference-section comments.
- Reported total, moved, formatted, and unformatted reference counts.

### 0.1.6

- Reported references skipped because their bodies are not plain supported
  citation templates.
- Moved standalone HTML comments out of generated reference-list bodies.

### 0.1.5

- Grouped list-defined references by numbered article section and unused
  status.
- Bundled multiple whole-reference citations with multiline cite templates.
- Replaced all `Reflist` templates with native `references` tags.

### 0.1.4

- Ordered `Cite interview` editor fields before the title.
- Added web and print fallback parameter ordering.
- Split citation processing into pre-format, ordering, and post-format stages.

### 0.1.3

- Kept all author fields together before citation titles.
- Used explicitly comma-delimited family names in generated reference names.

### 0.1.2

- Added CS1 removed-parameter and author-alias corrections.
- Kept literal ampersands in generated reference names.

### 0.1.1

- Added shared native textarea, CodeMirror, and VisualEditor source-mode
  editing support.

### 0.1.0

- Initial citation formatting and list-defined-reference conversion release.
