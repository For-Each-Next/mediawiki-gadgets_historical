# Changelog

## Until 0.3

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
