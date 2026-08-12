# Changelog

## Until 0.3

### 0.2.3-post.5 (2026-08-12 07:07 UTC)

Overview: VG Page Assessor presents native-style reviews, handles non-default
classes, and localizes registration summaries.

- Replaced the two-card source comparison with native MediaWiki diff-table
  structure, markers, deleted and added lines, and inline change highlighting.
- Loaded MediaWiki's core diff stylesheet while retaining scoped monospace
  wrapping and horizontal overflow for long wikitext.
- Kept omitted-context ellipses plain, transparent, and borderless.
- Localized the non-default Substub, D, B+, GA, A, FA, AL, and FL codes, hid
  them from the normal choices, and showed a matching code last when set.
- Reworded new-page-list edit summaries naturally in English, Simplified
  Chinese, and Traditional Chinese with locale-aware creation dates.

### 0.2.3 (2026-08-09 13:30 UTC)

Overview: VG Page Assessor preserves reviewed banner source, opens with
prepared data, and presents aligned editable comparisons before saving.

- Loaded the talk page and WikiProject new-page log in one MediaWiki API query,
  then prepared registration before opening the main form.
- Read existing class, importance, task forces, maintenance flags, configured
  projects, and unconfigured project banners into the assessment controls.
- Preserved exact aliases, parameters, nesting, unmanaged templates, and manual
  edits until the user explicitly changed a recognizable corresponding control.
- Added exact options for unconfigured class and importance values, localized
  controls and edit summaries, and reported expiration with the creation date.
- Presented an editable proposed lead followed by reusable two-card Codex
  comparisons with aligned lines, Chinese-aware word changes, and plain
  context.
- Kept related changed lines together by similarity, rendered source as safe
  text, removed nested line framing, and wrapped long wikitext within each
  card.
- Explained ineligible registration in place of its checkbox and aligned the
  registration comparison panes on wide screens.
- Published readable artifact prose and identity in a strict async anonymous
  ES2024 wrapper, replacing userscript metadata and copied notices.

### 0.2.2 (2026-08-04 07:29 UTC)

Overview: VG Page Assessor publishes a flat all-gadget distribution and
dedicates its project-owned release under CC0.

- Published only `dist/vg_page_assessor.min.js` for the package build, included
  it in `dist/user.js`, and retired its nested outputs and individual
  userscript.
- Dedicated the project-owned release and incorporated shared runtime under CC0
  1.0, retained third-party data terms, and embedded the package notice in
  generated artifacts.

### 0.2.1-post.9 (2026-08-03 10:49 UTC)

Overview: VG Page Assessor resolves Chinese Wikipedia namespace titles and
packages its two browser artifacts in a dedicated distribution directory.

- Replaced literal template-prefix cleanup and the WikiProject page prefix with
  namespace-ID-based helpers.
- Grouped creation-time queries by namespace ID across every configured alias
  instead of a partial prefix list.
- Covered Chinese Wikipedia template aliases while keeping prefixes scoped to
  the correct wiki.
- Kept the zhwiki-only workflow on the immutable static catalog while shared
  browser consumers gained validated siteinfo catalogs for other databases.
- Grouped the minified gadget and userscript under `dist/vg-page-assessor/`,
  removed retired readable and legacy flat files, and rejected linked output
  directories before cleanup.

### 0.2.1-post.4 (2026-08-01 18:01 UTC)

Overview: VG Page Assessor documents every authored callable contract
consistently in its readable browser artifact.

- Completed `@param` and `@returns` tags across authored TypeScript docstrings
  while preserving loading, saving, and refresh behavior.

### 0.2.1-post.3 (2026-08-01 16:19 UTC)

Overview: VG Page Assessor now shows progress throughout loading and saving,
then refreshes the page after a successful reviewed save.

- Mounted a lightweight Codex progress dialog while assessment and page state
  load, before replacing it with the full review dialog and its existing
  new-page-list loading progress.
- Added a save progress bar that follows talk-page and registration phases.
- Closed the completed dialog and refreshed the current page after a successful
  or unchanged save so the latest assessment is immediately visible.

### 0.2.1 (2026-07-29 21:25 UTC)

Overview: VG Page Assessor now emits three consistent artifacts through shared
build and validation tooling, including comment-free userscript code.

- Added a formatted, human-readable build with documentation comments and wrote
  all three uniquely named artifacts directly under `dist/`, with rebuild
  cleanup limited to this gadget's outputs.
- Added isolated project-wide Vue template validation, made `tsconfig.json` its
  root entry point, and centralized Prettier, Stylelint, and JSON-compatible
  Vue settings in package manifests.
- Aligned readable gadget and userscript JavaScript with the repository's
  four-space indentation while preserving ordinary multiline template values.
- Retained userscript metadata comments while removing comments from the
  executable code section without altering comment-like runtime strings.
- Consolidated the shared build CLI and HTML-template processing under
  package-style `gadget-build` entry points enforced by package validation.
- Expanded user-facing assessment and registration features, corrected the
  dependency map, centralized release and commit workflows, and retained only
  package-specific scoped instructions.

### 0.2.0 (2026-07-29 18:02 UTC)

Overview: VG Page Assessor now has typed workflows, JSON localization, a Codex
assessment dialog, and stronger conflict-safe saving.

- Added a `main.ts` composition root that wired sibling UI, workflow, domain,
  configuration, logging, and MediaWiki adapter parts.
- Split new-page-list transformation from API transport and extracted typed
  response, title, creation-time cache, talk-page, and dialog contracts.
- Removed DOM expando state and passed dialog state through explicit closures.
- Rebuilt the assessment UI as a real MediaWiki Vue and Codex dialog,
  co-locating its template, reactive TypeScript state, and package-scoped
  styles while retaining injected load and exact-review save workflows.
- Used the documented Codex monospace token for source and comparison fields
  and loaded official token declarations for stylesheet tooling.
- Moved WikiProject and task-force display labels out of project configuration
  into typed locale catalogs and reused them in controls and edit summaries.
- Moved English and Chinese interface catalogs from TypeScript objects to flat
  JSON data while retaining typed message IDs and placeholder validation.
- Moved reviewed registration and conflict-safe talk-page save sequencing into
  an injected workflow with neutral progress and outcome contracts.
- Preserved unmanaged talk-page lead whitespace and conflict-safe confirmed
  saves while retaining new-page-list previews and date ordering.
- Added 22 focused tests for transformation, decoding, presentation,
  localization, cache, conflict, and exact-save behavior and enabled strict
  TypeScript checking.
- Adopted `#gadget` imports, standardized package documentation, and the shared
  typed ES2024 builder with clean, dedicated output directories.
- Renamed the durable release record to `CHANGELOG.md`.
- Moved browser startup from the package entry point into `browser.ts`, keeping
  imports side-effect free.
- Added a root license notice and linked it from the package entry
  documentation.
