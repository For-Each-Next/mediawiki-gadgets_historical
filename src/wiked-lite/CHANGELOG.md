# Changelog

## Until 0.5

### 0.4.4-dev.12 (2026-08-01 19:25 UTC)

Overview: wikEd Lite uses lazy source-bound wikitext queries and restores
original wikEd's compact citation previews without trusting source markup.

- Replaced the parser and document object model with the shared
  `wikitext(source)` facade, whose construct methods invoke focused scanners
  without building a document tree.
- Queried templates, references, and opaque regions through DOM-flavored
  `getAll()` and `getFirst()` methods while retaining exact source ranges.
- Restored wikEd's light lavender references, light blue explanatory footnotes,
  grayscale template nesting, heading scale, violet template names, red
  parameter names, and native-textarea typography.
- Replaced exhaustive TemplateData-driven popup rows with entered parameters
  and placed matching prefixed `last` and `first` fields on the same row.
- Kept separate `url` and `archive-url` rows, shortened an embedded original
  URL only in the archive row's display, and retained the full safe archive
  target.
- Restored the original compact popup window, including its 360-pixel width,
  editor-relative font scale, sticky title, hanging-indent rows, subtle border,
  two-pixel radius, and eight-pixel drop shadow, while continuing to build
  every value, comment, and link with safe DOM operations.

### 0.4.4-dev.5 (2026-08-01 17:15 UTC)

Overview: wikEd Lite uses one shared balanced parser for formatting,
highlighting, and citation previews.

- Extracted the wikitext range, template, parameter, protected-region, and
  native-reference scanners into the reusable `#shared/wikitext-parser`
  subpackage.
- Parsed full reference content and group-aware named-reference reuse through
  the shared parser before building citation previews.

### 0.4.4-dev.4 (2026-08-01 16:55 UTC)

Overview: Rebuilt wikEd Lite as a typed, reviewable MediaWiki gadget while
retaining Cacycle's lightweight editing ideas.

- Added live wikitext highlighting, nested-template shading, citation previews,
  and modifier-click navigation on a synchronized source-editing surface.
- Added protected, one-click basic formatting with optional category, template,
  Chinese-conversion, redirect, and missing-link operations.
- Shared citation TemplateData and short-footnote matching with Citation
  Formatter and added English, Simplified Chinese, and Traditional Chinese UI.
- Consumed citation TemplateData and short-footnote matching through the
  consolidated `#shared/citation` capability.
