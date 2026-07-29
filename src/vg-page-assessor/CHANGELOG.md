# Changelog

## Until 0.3

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
