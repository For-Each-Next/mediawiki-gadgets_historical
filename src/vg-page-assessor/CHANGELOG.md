# Changelog

## Until 0.3

### 0.2.0-dev.1 (2026-07-29 10:51 UTC)

Overview: VG Page Assessor advances to its user-selected 0.2 development line
with a typed composition root, deterministic assessment workflows, MediaWiki
adapter boundaries, stronger save-safety regression coverage, and localized
assessment presentation sourced from typed catalogs. Its release record now
follows the repository-wide changelog and development-version contract.

- Added a `main.ts` composition root that wired sibling UI, workflow, domain,
  configuration, logging, and MediaWiki adapter parts.
- Split new-page-list transformation from API transport and extracted typed
  response, title, creation-time cache, talk-page, and dialog contracts.
- Removed DOM expando state and passed dialog state through explicit closures.
- Split the monolithic dialog into assessment form, summary, registration,
  controller, save, and view modules.
- Moved WikiProject and task-force display labels out of project configuration
  into typed locale catalogs and reused them in controls and edit summaries.
- Moved reviewed registration and conflict-safe talk-page save sequencing into
  an injected workflow with neutral progress and outcome contracts.
- Preserved unmanaged talk-page lead whitespace and conflict-safe confirmed
  saves while retaining new-page-list previews and date ordering.
- Added 19 focused tests for transformation, decoding, presentation,
  localization, cache, conflict, and exact-save behavior and enabled strict
  TypeScript checking.
- Adopted `#gadget` imports, standardized package documentation, and the shared
  typed ES2024 builder with clean, dedicated output directories.
- Renamed the durable release record to `CHANGELOG.md` and advanced the
  user-selected next minor line to its first development build.
- Moved browser startup from the package entry point into `browser.ts`, keeping
  imports side-effect free.
- Added a root license notice and linked it from the package entry
  documentation.
