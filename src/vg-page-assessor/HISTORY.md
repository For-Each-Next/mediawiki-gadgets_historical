# History

## Until 0.2

### 0.1.0-post.1 (2026-07-29 08:17 UTC)

Overview: VG Page Assessor remains on its user-selected early 0.1.x line while
gaining a typed composition root, deterministic assessment workflows, MediaWiki
adapter boundaries, and stronger save-safety regression coverage.

- Added a `main.ts` composition root that wired sibling UI, workflow, domain,
  configuration, logging, and MediaWiki adapter parts.
- Split new-page-list transformation from API transport and extracted typed
  response, title, creation-time cache, talk-page, and dialog contracts.
- Removed DOM expando state and passed dialog state through explicit closures.
- Split the monolithic dialog into assessment form, summary, registration,
  controller, save, and view modules.
- Moved reviewed registration and conflict-safe talk-page save sequencing into
  an injected workflow with neutral progress and outcome contracts.
- Preserved unmanaged talk-page lead whitespace and conflict-safe confirmed
  saves while retaining new-page-list previews and date ordering.
- Added 17 focused tests for transformation, decoding, presentation, cache,
  conflict, and exact-save behavior and enabled strict TypeScript checking.
- Adopted `#gadget` imports, standardized package documentation, and the shared
  typed ES2024 builder with clean, dedicated output directories.
