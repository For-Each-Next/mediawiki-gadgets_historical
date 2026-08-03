# Changelog

## Until 0.5

### 0.4.4-dev.30 (2026-08-03 08:24 UTC)

Overview: wikEd Lite preserves entered wikilink text when resolving redirects
and recognizes database-scoped namespace aliases.

- Rewrote unpiped redirect links as piped links whose labels keep the original
  title and fragment, while retaining existing explicit labels.
- Kept file and category embeds unpiped, escaped ordinary links redirected into
  those namespaces, respected localized aliases and leading-colon escapes,
  resolved links nested in captions, and ignored protected contents.
- Added complete English and Chinese Wikipedia namespace-prefix catalogs and
  replaced literal namespace matching in link and highlighting paths.
- Loaded validated namespace siteinfo without blocking editing on other wikis,
  while enwiki and zhwiki use their immutable static catalogs without a call.
- Applied current-wiki aliases to link classes, template navigation, template
  identity, reference previews, and reference-list nesting, with a retryable
  canonical-only fallback.
- Preserved redirect target fragments, case-distinct page keys, and File or
  Category embedding; unsafe cross-namespace embeds remain unchanged.

### 0.4.4-dev.26 (2026-08-02 17:45 UTC)

Overview: wikEd Lite keeps protected wikitext from changing syntax-key and link
boundaries.

- Masked literal tag contents before splitting conversion declarations and
  wikilink parts, preventing protected semicolons, pipes, colons, equals signs,
  or arrows from creating visible syntax outside the tag.
- Kept leading comments outside conversion-key bounds so a valid declaration
  remains highlighted without including the comment in its key.

### 0.4.4-dev.25 (2026-08-02 17:12 UTC)

Overview: wikEd Lite makes reference-list nesting, heading layout, and syntax
key highlighting follow the source constructs being edited.

- Reset template depth inside native `references` content and `Reflist` `refs`
  or `list` values, with contained `ref` bodies starting at level one and outer
  template styling and metadata clipped at each boundary.
- Highlighted `thumb`, `right`, and `alt` file options; `lang` and `style` tag
  attributes; and the `display` CSS property with existing token families.
- Treated every Chinese-conversion declaration key as a variant, including
  malformed entered keys and literal or `{{=}}` arrow destinations.
- Underlined only the trimmed text of level-two and level-three headings with a
  `0.2em` offset, and added a blank line after headings without separating
  `DEFAULTSORT` from its following content.

### 0.4.4-dev.24 (2026-08-02 14:51 UTC)

Overview: wikEd Lite streamlines optional formatting controls and makes
network-backed link costs and policy limits explicit.

- Removed category sorting from the formatter, dialog, localization, and
  current feature documentation.
- Nested the character-width setting under equals alignment and replaced its
  free-form input with horizontal `1:2` and `3:5` choices.
- Attached redirect and missing-link API costs to their controls, including the
  `WP:NOTBROKEN` caution and intended navigation-template scope.
- Delegated form, sub-control, and responsive action spacing to Codex instead
  of applying gadget-specific checkbox and button layout rules.

### 0.4.4-dev.23 (2026-08-02 11:45 UTC)

Overview: wikEd Lite repairs explanatory-footnote arguments and distinguishes
nested citations from their surrounding notes.

- Numbered `efn`-family note arguments when a nested `ref` attribute would
  otherwise turn the note text into a named template parameter.
- Removed explanatory-footnote hover previews while retaining previews for
  nested `ref`, `r`, and `sfn` citations.
- Gave nested citations the purple reference palette over the enclosing blue
  explanatory-footnote palette and added focused regression coverage.

### 0.4.4-dev.21 (2026-08-02 09:38 UTC)

Overview: wikEd Lite aligns standalone nested-template closers with their block
depth.

- Indented a standalone `}}` by two spaces for each owning outer template while
  keeping the outermost closer at column zero.
- Applied closer indentation only with template indentation enabled and
  preserved annotated, combined, stray, table-local, and variable-local braces.
- Added nested, deep, unfinished, table, variable, continuation, and opt-in
  regression coverage for closing-delimiter indentation.

### 0.4.4-dev.20 (2026-08-02 09:24 UTC)

Overview: wikEd Lite preserves live editing state across embedded source syntax
and iframe teardown.

- Scanned the protected source as one persistent stream so templates inside
  tables stay untouched and unfinished templates retain their live depth.
- Balanced nested templates in triple-brace defaults, left variable content
  unchanged, and corrected equals alignment for marks and non-ASCII names.
- Returned a focused iframe editor's live selection to a compatible native
  textarea during teardown without stealing focus from replacement editors.

### 0.4.4-dev.19 (2026-08-02 09:05 UTC)

Overview: wikEd Lite formats nested block templates at their persistent nesting
depth instead of flattening every parameter to two spaces.

- Added two spaces for every nested block-template parameter level while
  preserving entered closing delimiters and continuation indentation.
- Calculated equals alignment independently for each owning template rather
  than mixing nested and outer parameter widths.
- Excluded wikitable, template-variable, comment, and protected literal content
  from nesting changes so embedded source retains its own wikitext structure.

### 0.4.4-dev.18 (2026-08-02 08:44 UTC)

Overview: wikEd Lite makes the loaded iframe lifecycle reversible when
MediaWiki replaces or moves its source editor.

- Transferred active focus into the ready frame and restored the native
  textarea's exact accessibility and tab-order attributes on every teardown.
- Watched frame adjacency after startup so a detached editor cannot leave its
  submitted source clipped, and discarded stale controllers on later hooks.
- Bounded local frame loading and rejected removal, movement, and load failures
  while cleaning pending listeners, observers, and timers transactionally.
- Flushed active input-method composition into the submitted textarea during
  form submission or frame teardown so an interrupted composition is not lost.

### 0.4.4-dev.17 (2026-08-02 08:29 UTC)

Overview: wikEd Lite now initializes its isolated editor only after the local
iframe document has loaded.

- Created the editor iframe from a minimal trusted `srcdoc` with matching title
  and accessible label metadata.
- Waited for the one-shot frame load before installing editor DOM, styles, and
  highlighting, avoiding replacement by the transient `about:blank` document.
- Exposed the frame's ready state only after its initial safe render and hid
  the unfinished frame through an explicit readiness selector.

### 0.4.4-dev.16 (2026-08-02 07:58 UTC)

Overview: wikEd Lite stabilizes iframe popovers and keeps dense source
highlighting responsive after the initial isolated-editor build.

- Preserved the compact `44vh` popup cap while remeasuring constrained previews
  against their final rendered height.
- Invalidated pending reference previews throughout input-method composition
  without interrupting the active composition with a scheduled rerender.
- Replaced per-segment full-range filtering with a boundary-event sweep so
  emphasis-dense and tag-dense sources remain responsive near the live limit.

### 0.4.4-dev.15 (2026-08-02 07:11 UTC)

Overview: wikEd Lite isolates highlighting in an iframe and adds stable,
anchored reference previews while restoring source-accurate token styles.

- Rendered the editable highlighter and its reference overlay in a same-origin
  iframe while keeping the native textarea synchronized as the submitted source
  and restoring it when the enhancement is removed.
- Added delayed, anchored reference popovers with above-or-below placement,
  hover-safe token transitions, remeasured constrained height, a directional
  tail, reduced-motion support, and plain-reference or explanatory-footnote
  previews built from text nodes.
- Restored bold and italic apostrophe markup without leaking styles through
  comments, literal regions, HTML or template syntax, wikilink targets, or
  unmatched lines, and made line scanning linear in the source length.
- Restricted table coloring to parsed tables so block-template parameter names
  retain their dedicated color.
- Limited missing-page coloring to visible wikilink text, leaving brackets,
  separators, hidden targets, and label markup unaffected while normalizing
  fragments and leading colons for lookup.
- Added typed tag-attribute and template-parameter filters to the shared
  source-bound query collections, including compound and positional matching.
- Added focused highlighter, preview, geometry, stylesheet, and iframe-source
  regression coverage for the corrected behavior.

### 0.4.4-dev.14 (2026-08-02 06:19 UTC)

Overview: wikEd Lite restores original tag boundaries, Chinese title lookup,
and highlighting colors through the shared source-bound wikitext API.

- Parsed references with balanced shared tag queries so self-closing reuse tags
  no longer color later article text as unclosed reference content.
- Queried Chinese title variants with `converttitles`, mapped normalized and
  converted API titles back to entered links, and derived missing-link colors
  from the active wiki skin.
- Restored the original HTML, literal tag, file, image-template, NoteTA,
  language-variant, template-delimiter, reference, footnote, and nesting color
  families, along with editor background and caret inheritance.
- Added source-bound tag and template parsers with named collection filters,
  ordered attribute or parameter pairs, exact inner text, and plural aliases;
  migrated reference previews to that API.
- Covered the supplied Arch Linux patterns with regression fixtures for NoteTA,
  nested infobox images, ordinary `<code>` tags, and reference definitions.

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
