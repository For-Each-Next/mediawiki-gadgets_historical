# Changelog

## Until 0.6

### 0.5.0-dev.9 (2026-07-29 16:03 UTC)

Overview: Citation Formatter now has typed workflows, JSON localization, Codex
dialogs, modular citation services, and safer, quieter editing.

- Added a `main.ts` composition root that injects CS1, metadata, archive, and
  wiki-link operations into the browser UI.
- Extracted CS1 orchestration and transport, calendar-date checks, protected
  wikitext policies, reference attributes and containers, and source URL
  normalization into responsibility-named modules.
- Split source-manager contracts, reactive state, list presentation, analysis
  state, alias actions, and metadata-draft handling from the UI coordinator.
- Split all five Codex dialogs into co-located `.vue`, `.ts`, and `.css`
  groups, with template-only Vue extraction and package-scoped stylesheet
  checks in the shared build and test workflow.
- Moved English and Chinese interface catalogs from TypeScript objects to flat
  JSON data while retaining typed message IDs and placeholder validation.
- Defined each citation-template choice with its name, importance, type, and
  optional icon; alphabetized each ordering group; placed `Cite video game`
  with the important general-media choices; kept `Cite tweet` and both AV media
  choices normal-special without priority icons; and gave `Cite news` a
  newspaper icon.
- Kept the private TypeScript operations available for composition and tests
  without exporting them from the generated browser gadget.
- Added focused CS1-adapter and domain-primitive regression coverage and
  enabled strict TypeScript checking.
- Added a localized Recheck article action that re-read the current editor,
  displayed progress, and prevented duplicate requests.
- Isolated every dialog body from Codex's broad direct-last-child reset,
  preserving component-owned bottom spacing without modifying shared Codex
  styles.
- Sourced custom properties from the official Codex design-token CSS, preserved
  MediaWiki runtime theming, and aligned fallback colors.
- Typed build-time dialog templates against the globally registered Codex
  surface while retaining MediaWiki ResourceLoader as the userscript runtime.
- Kept source-entry descriptions concise while retaining detailed accepted
  input and existing-source insertion guidance below the field.
- Preserved the edit-box selection and viewport when formatting all citations
  across native textarea, CodeMirror, and VisualEditor source backends.
- Kept repeated Format citations actions quiet when the article text was
  already formatted, without rewriting the editor or recording an empty undo
  change.
- Fetched raw Citoid metadata through a shared URL-or-identifier client and
  mapped it through Citation Formatter's own TemplateData and serializers,
  keeping VG Stub Creator's site cleanup rules out of editable source drafts.
- Adopted `#gadget` imports, standardized package documentation, and the shared
  typed ES2024 builder with clean, dedicated output directories.
- Renamed the durable release record to `CHANGELOG.md` and advanced the
  user-selected next minor line to its first development build.
- Moved detailed reference-name directives into a focused guide, added a root
  license notice, and made both documents part of the package entry path.

## Until 0.5

### 0.4.3 (2026-07-28 18:28 UTC)

Overview: Generated reference names now prefer credited creators, then
publishing organizations, then containing publications. Installation guidance
now covers both on-wiki personal scripts and Tampermonkey. Package
documentation now uses consistent numbered reference links.

- Recognized unnumbered and numbered author, surname, subject, and host
  parameter forms independently of template-specific aliases.
- Preferred publisher and institution values over periodical-family values.
- Retained periodicals as fallbacks when no eligible publisher or institution
  was available.
- Consolidated CS1 maintenance guidance under `docs/`, kept `README.md` and
  `CHANGELOG.md` as package entry documents, and added package-scoped
  architecture and editor-safety rules.
- Documented direct installation from a MediaWiki personal JavaScript page or
  Tampermonkey.
- Standardized authoritative-source and package-documentation links as numbered
  references.

### 0.4.2 (2026-07-28 17:43 UTC)

Overview: Source editing now provides clearer URL, consistency, and author
controls, with the complete package history kept in a dedicated record.

- Added a directional merge glyph to author-name join and split actions.
- Added safe new-tab actions for HTTP(S) values in citation URL fields.
- Split citation consistency results into parameter-value and reference-name
  tabs, with bulk changes scoped to the visible tab.
- Migrated the complete legacy version history from the README into this
  package-local changelog.

### 0.4.1 (2026-07-27 13:24 UTC)

Overview: Gadget builds now compact standalone Vue templates without changing
their rendered content.

- Added build-time minification for HTML-only TypeScript template modules.
- Preserved Vue bindings and significant text through minification with
  regression coverage.

### 0.4.0

- Added complete English, Simplified Chinese, and Traditional Chinese interface
  catalogs with MediaWiki language-variant resolution, localized launchers and
  lead markers, and copy aligned with the Codex voice and tone.
- Rebuilt the source manager with responsive Codex dialogs, tabs, fields,
  comboboxes, semantic source and parameter tables, validation states, official
  icons, and logical CSS.
- Separated the pure API, browser bootstrap, Vue template, localization
  adapters, domain logic, and infrastructure boundaries.
- Moved version and UTC build information from the Tools tab into the main
  dialog subtitle.
- Added CS1 validation before saving new sources, article-wide CS1 and non-CS1
  checks, rechecking after edits, and clear progress and result feedback.
- Added citation name consistency checks for website, publisher, author,
  reference-name, and source-key text, with inline replacement choices,
  selected occurrences, per-change reversion, and session-safe undo.
- Added a compact reference-name and shared-source-key editor with autosizing
  text areas, template-specific alternative parameter names, and author, date,
  and part exclusions.
- Kept the source list mounted while editing in a separate dialog, preserved
  source and parameter positions during edits, and retained explicit sorting.
- Added detailed Apply feedback and a safe whole-tool Cancel changes action
  that restores Citation Formatter editor changes.
- Added result counts and responsive keyword and section filters.
- Aligned button labels, actions, and weights with the Codex button hierarchy.
- Removed the unreachable legacy manager, custom icon definitions, unused
  source-status path, test-only helpers, stale package configuration, and
  unused UI messages.
- Documented the browser-independent operations, update workflow, supported
  languages, and module architecture.

## Until 0.4

### 0.3.48

- Used the X logo for the Cite tweet template icon.

### 0.3.47

- Used music and article icons for AV media and AV media notes respectively.

### 0.3.46

- Added distinct Codex icons to the prioritized citation-template options.

### 0.3.45

- Kept the manual Create source action at its normal button width.

### 0.3.44

- Prioritized common web, magazine, book, interview, social, game, press, and
  audiovisual templates in citation-template selectors.

### 0.3.43

- Kept status-message top spacing from being reset by the dialog's first-child
  rule.

### 0.3.42

- Balanced the vertical spacing around source-manager status messages.

### 0.3.41

- Widened the source-list Actions column to four ems.

### 0.3.40

- Moved source duplication from the source-list icons to a text action after
  Sort parameters, narrowed the list Actions column, and kept the citation
  template label and select on one line.

### 0.3.39

- Used a table-compatible fixed six-em width for the source-list Actions
  column.

### 0.3.38

- Moved each source's usage count beside its citation type and group details.

### 0.3.37

- Capped the source-list Actions column at six ems or 20 percent and let the
  Source column use the remaining width.

### 0.3.36

- Reduced the source-list reference-name size and allowed citation titles to
  wrap across two lines.

### 0.3.35

- Combined each source's reference and citation type into a two-line table
  cell, and kept the three-column table within the dialog width.

### 0.3.34

- Rebuilt the filterable source list as an accessible Codex table with custom
  reference, source, type, and action cells.

### 0.3.33

- Restored the main source-manager Format citations footer action and made
  custom dialog footers follow one responsive action layout.
- Kept citation consistency fixes focused on values and aliases without
  changing parameter names.

### 0.3.32

- Kept CS1 checker reviews on one article-wide batch response instead of
  requesting another API parse after each edited source.
- Removed red and yellow status highlighting from the general source list.
- Removed the author, year, and part summary from the source edit panel.
- Renamed Cancel to Close and made it the leftmost source-editor action.

### 0.3.31

- Consolidated article-wide formatting into three advanced preference
  checkboxes and one explicit apply action.
- Added Apply and preloaded Save and edit next actions when fixing CS1 issues
  or converting non-CS1 sources, without waiting for a CS1 recheck between
  drafts; the queue wraps from the final result to the first.
- Made creator alias comments searchable with limited typo tolerance, so a
  correction such as `Hiroya` can find a stored `Horiya`.
- Hid section-lead filters when no sources are used directly in that lead.
- Removed terminal whitespace and the `(帮助)` link label from Chinese CS1
  messages returned by the live API.

### 0.3.30

- Restored an automatic live TemplateData updater covering every supported
  citation template and refreshed all 31 generated snapshots.
- Kept numbered author/interviewee fields together, then followed each
  template's own order even when a citation also contains fallback fields, so
  `Cite interview` no longer sends `interviewer` to the end.
- Renamed the draft-only Format action to Sort parameters; Save continues to
  write a canonically sorted citation, while Format citations processes the
  complete current article.

### 0.3.29

- Treated publication parameter names as part of consistency, so equal `work`
  and `website` values are still offered as a fixable difference.
- Replaced the internal keep-parameter sentinel with an empty combobox and a
  grey `Keep as is` placeholder.
- Removed the long count summary panels so the analysis dialog focuses on
  checking and fixing actionable inconsistencies.
- Kept the analysis popup open and refreshed its findings after applying fixes;
  manually closing and reopening it also rereads the editor text.

### 0.3.28

- Added consistency findings for differing or missing `<!-- # ... -->` aliases,
  including source keys attached to repeated URLs.
- Replaced fixed analysis selectors with editable parameter-name and value
  comboboxes, allowing a new target such as `website = [[IGN]]`.
- Preserved a manually selected supported parameter alias during checked batch
  replacements instead of canonicalizing it back to another name.

### 0.3.27

- Added a citation consistency analysis tool with template, creator,
  publication, publisher, and URL-host summaries.
- Flagged differing website/work and publisher values used for the same host,
  including link-, case-, and spacing-only variants, plus repeated author
  formatting variants.
- Added per-occurrence checkboxes and selectable target values for opt-in batch
  replacement while leaving intentional differences untouched.

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
- Used the Codex magic-wand icon and parameter-specific tooltips for access and
  archive date filling.
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
- Used language-aware `script-title` values when citations have no `title`, and
  removed long citation-template tooltips from the source list.

### 0.3.14

- Expanded automatic source lookup beyond URLs to accept DOI, ISBN, ISSN,
  PMID/PMCID, QID, and citation-text input.

### 0.3.13

- Narrowed the editable parameter-name column and displayed parameter names in
  bold.

### 0.3.12

- Made every source parameter name directly editable and removed per-row Remove
  actions.
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

## Until 0.2

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
