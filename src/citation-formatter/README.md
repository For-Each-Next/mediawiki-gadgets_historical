# Citation Formatter

Citation Formatter is a MediaWiki source-editor gadget. Its editor actions:

- formats supported English Wikipedia CS1 templates in inline or block style;
- resolves parameter aliases and order from generated English Wikipedia
  TemplateData;
- normalizes unambiguous English citation dates to ISO dates;
- names references with an APA-style author/date key, including `n.d.`,
  same-year letter suffixes, and page or time locators;
- names plain-text and mixed-content notes sequentially as `:1`, `:2`, etc.;
- converts `{{r}}` calls to native ref tags;
- moves full refs into matching grouped `<references>` containers;
- inserts a source at the current source-editor cursor, accepting URLs,
  identifiers, and citation text while reusing an existing named URL reference
  when possible;
- builds editable citation drafts from Wikimedia Citoid metadata and existing
  Internet Archive snapshots, including pasted Wayback URLs; and
- creates manual citations for offline sources, with concise template-specific
  fields while preserving populated and custom fields during citation-template
  changes.

The supported set is the CS1 list at
`Template:Citation Style documentation/cs1`, the general CS2 `Citation`
template, and `Cite video game`. Its TemplateData is committed under
`domain/data/`; source insertion optionally requests citation metadata and
archive availability at runtime.

TemplateData and site-rule refresh procedures are documented separately for
[English Wikipedia](ENWIKI-CS1.md) and
[Chinese Wikipedia](ZHWIKI-CS1.md). Both procedures require HTTPS and include
title, parameter-order, alias, numbered-parameter, and date-rule checks.

For a non-Latin author or organization name, an HTML comment beginning with
`#` supplies its reference-name form without changing the citation display:

```wikitext
| author = 宵崎奏<!-- # Yoisaki, Kanade -->
| publisher = セガ<!--# Sega -->
```

When a new source repeats a creator name with an alias used elsewhere in the
article, the source manager offers it as an `Auto-suggested value`. **Use**
copies it into the alias field; **Dismiss** hides it for the current draft.
Ignoring the suggestion also leaves the citation unchanged.

On a `url` field, the same comment supplies an explicit source-identity key.
The actual URL is the fallback key, so only continuation pages need to point
back to an unmarked base page:

```wikitext
| url = https://example.test/interview.html
| page = 1
```

```wikitext
| url = https://example.test/interview_2.html<!-- # https://example.test/interview.html -->
| page = 2
```

The real links remain unchanged. Matching source keys suppress same-year letter
suffixes and allow the page values to distinguish the reference names.

Add `!no-author` to a field's comment to exclude that field from the
author-fallback chain. It can share a comment with a reference-name override:

```wikitext
| website = 游民星空<!-- !no-author # Youmin Xingkong -->
```

The corresponding `!no-date` and `!no-part` directives exclude a field from
the reference name's date or part locator:

```wikitext
| publication-date = 2025-05-20<!-- !no-date -->
| time = 1:15:41<!-- !no-part -->
```

Build from the workspace root with `npm run build -w citation-formatter`.

## Version history

### 0.3.29

- Treated publication parameter names as part of consistency, so equal
  `work` and `website` values are still offered as a fixable difference.
- Replaced the internal keep-parameter sentinel with an empty combobox and a
  grey `Keep as is` placeholder.
- Removed the long count summary panels so the analysis dialog focuses on
  checking and fixing actionable inconsistencies.
- Kept the analysis popup open and refreshed its findings after applying
  fixes; manually closing and reopening it also rereads the editor text.

### 0.3.28

- Added consistency findings for differing or missing `<!-- # ... -->`
  aliases, including source keys attached to repeated URLs.
- Replaced fixed analysis selectors with editable parameter-name and value
  comboboxes, allowing a new target such as `website = [[IGN]]`.
- Preserved a manually selected supported parameter alias during checked
  batch replacements instead of canonicalizing it back to another name.

### 0.3.27

- Added a citation consistency analysis tool with template, creator,
  publication, publisher, and URL-host summaries.
- Flagged differing website/work and publisher values used for the same host,
  including link-, case-, and spacing-only variants, plus repeated author
  formatting variants.
- Added per-occurrence checkboxes and selectable target values for opt-in
  batch replacement while leaving intentional differences untouched.

### 0.3.26

- Displayed CS1 and non-CS1 checker results with the normal source-list row
  design and opened selected results in the normal citation editor.
- Batched per-citation CS1 checks into one explicit API request and carried
  mapped API errors into the selected citation fields.
- Kept up to three section selectors on one row and displayed full labels such
  as `§ 3 Development` instead of bare section IDs.

### 0.3.25

- Added separate Tools popups for an explicit article-wide CS1 API check and
  the local non-CS1 source scan.
- Kept section controls horizontal and hid the section field when no section
  selector is available.
- Replaced the version definition list with a Codex gadget-info card using a
  UTC build timestamp.

### 0.3.24

- Changed complete server-side CS1 validation to an explicit draft tool, so
  normal editing uses static checks without background API requests.
- Moved non-CS1 source results from the View filter into the Tools tab.
- Replaced the source suggestion combobox with inline keyword and section
  filter fields.
- Used the Codex magic-wand icon and parameter-specific tooltips for access
  and archive date filling.
- Kept `script-title` immediately after `title` when formatting parameters.

### 0.3.23

- Added debounced live validation through the complete CS1 module suite
  installed on English and Chinese Wikipedia.
- Mapped server-reported CS1 errors and maintenance messages to affected
  parameter fields, while listing citation-level and category-only issues.
- Kept immediate local validation active while live validation is pending or
  temporarily unavailable.

### 0.3.22

- Allowed non-standard references to be converted through the citation editor
  while showing the original source code before replacement.
- Added an editable author and publication search combobox beside the source
  status filter on wide screens.
- Kept `url-status` free-form while adding a live, dead, and unfit cycle
  action, and switched organization linking to the Codex link icon.
- Added CS1 dependency hints and explanatory tooltips for values used in
  generated reference names.

### 0.3.21

- Split draft reference-name previews into author, year, and optional part
  fields.
- Added source-status highlighting and filters for invalid and non-standard
  references, including section- and subsection-lead filters.
- Added parameter and URL-status comboboxes plus one-click access-date,
  archive, and redirect-aware organization-link actions.
- Moved formatter preferences into a Tools tab with automatic foreign-language
  script titles, version and build information, and Codex toast feedback.

### 0.3.20

- Removed `undefined` tooltips from valid source-edit textboxes while retaining
  Codex tooltips for validation errors and icon explanations.

### 0.3.19

- Explained invalid parameter, value, and alias fields with Codex tooltips on
  hover and keyboard focus.
- Refreshed separate enwiki and zhwiki CS1 validation rules for numbered
  creator fields, local aliases, and no-date values.
- Documented independent HTTPS metadata and Lua-rule refresh procedures for
  English and Chinese Wikipedia.

### 0.3.18

- Added site-aware CS1 validation for English and Chinese Wikipedia, including
  red parameter, date, alias, and incomplete archive-pair cells.
- Added a Format action that restores standard TemplateData parameter order.
- Made citation draft fields use a 1:2:2 width ratio on wide screens and equal
  full widths in the narrow stacked layout.
- Replaced the author full-name structure controls with compact icons and
  removed empty alias placeholders.

### 0.3.17

- Ordered editable parameter rows by each citation template's standard
  TemplateData order, keeping numbered authors together.
- Changed the source preview to a plain monospace block with styled parameter
  names and reference-name alias comments.
- Displayed full `§ number title` labels in section comboboxes instead of raw
  numeric values.
- Replaced the row-level **Based on** text action with a copy icon after Edit.

### 0.3.16

- Highlighted only the exact value or alias textbox that contributes visible
  text to the generated reference name.
- Top-aligned the hierarchical section-filter comboboxes at their normal
  control height.

### 0.3.15

- Added live reference-name and source-code previews to source drafts, with
  stronger highlighting for fields that form the name.
- Added new-source drafts based on existing citations and separate save or
  save-and-close actions.
- Added source usage counts and hierarchical section/subsection filters to the
  existing-source list.
- Used language-aware `script-title` values when citations have no `title`,
  and removed long citation-template tooltips from the source list.

### 0.3.14

- Expanded automatic source lookup beyond URLs to accept DOI, ISBN, ISSN,
  PMID/PMCID, QID, and citation-text input.

### 0.3.13

- Narrowed the editable parameter-name column and displayed parameter names
  in bold.

### 0.3.12

- Made every source parameter name directly editable and removed per-row
  Remove actions.
- Added reversible, blank-safe author controls for switching between one full
  name and separate first/last fields.
- Highlighted draft fields that actively form the generated reference name.
- Added opt-in creator-alias suggestions with explicit **Use** and **Dismiss**
  actions.
- Limited blank draft rows to common fields supported by each template,
  including tweet-specific defaults.
- Replaced source-list text actions with Codex icons and added full-template
  tooltips to citation-type badges.
- Added immediate Source URL focus, an indeterminate Codex progress bar during
  lookup, and compact MenuButton formatter settings.

### 0.3.11

- Displayed source-manager reference names in small parentheses instead of
  square brackets.

### 0.3.10

- Made an unmarked citation URL the fallback source key, so continuation URLs
  can join it by placing the base URL in their `<!-- # ... -->` comments.

### 0.3.9

- Condensed existing sources into numbered one-line rows with canonical
  citation-template labels and direct **Use** and **Edit** actions.
- Added keyword filtering across source names, citation details, and URLs.
- Moved reference-call and citation-layout controls into a dedicated
  formatter-preferences dialog.

### 0.3.8

- Unified citation formatting and source insertion under one editor action.
- Added a bottom-right quick launcher for opening the citation tool.
- Added `Add source` and `View sources` tabs, combining URL and manual
  insertion while listing existing citations directly for reuse or editing.
- Added a footer formatting action with per-run `<ref>`/`{{r}}` and
  inline/block settings, defaulting to `<ref>` and inline.
- Added explicit URL source keys for grouping separately paginated links as
  parts of one work.
- Added structured author-name splitting for `Last, First` and `First Last`
  input, with automatic next-author rows.
- Simplified source-field rows and removed repeated alias syntax tips.

### 0.3.7

- Added manual/offline source insertion with print-specific fields and
  value-preserving citation-template switching.

### 0.3.6

- Added a cursor-aware source manager with existing-reference reuse, editable
  Citoid metadata, Wayback URL handling, archive lookup, common empty fields,
  and reference-name aliases.

### 0.3.5

- Added explicit reference-call (`<ref>` or `{{r}}`) and citation-template
  (inline or two-space-indented block) formatting controls to the citation
  manager.

### 0.3.4

- Resolved linked short citations through explicit citation `ref` anchors and
  retained their locators in generated reference names.
- Preserved existing names on unformatted references while numbering only
  anonymous definitions.

### 0.3.2

- Preserved adjacent `Cbignore` and `Dead link` maintenance templates while
  assigning their citations normal APA-style names.
- Assigned unnamed-reference numbers and same-year suffixes by first citation,
  and retained first-citation order on every formatting run.

### 0.3.1

- Applied the author fallback through credited creators, organizations,
  containers, and publishers, with field-level `!no-author`, `!no-date`, and
  `!no-part` exclusions, then a shortened curly-quoted title.
- Added part locators only when multiple citations use different parts of the
  same source; distinct works continue to use year-letter suffixes.

### 0.3.0

- Added a second-run citation manager for reference-name overrides and
  temporary compact `R` calls.
- Emitted responsive native reference lists and consecutive definition rows.

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
