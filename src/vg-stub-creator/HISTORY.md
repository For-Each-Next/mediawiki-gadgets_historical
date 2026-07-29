# History

## Until 0.5

### 0.4.33-post.2 (2026-07-29 08:17 UTC)

Overview: VG Stub Creator now composes its established review-and-save behavior
through a typed root, responsibility-named workflows and records, and explicit
browser and wiki-write boundaries backed by stronger focused tests.

- Added a `main.ts` composition root that injected article, pre-save, editing,
  category, source, and progress ports into an instance-bound browser app.
- Limited the browser entry to invoking the composition root and removed the
  obsolete externally exported save-form operation.
- Introduced named article records and module contracts, removed a domain
  import cycle, and separated pre-save planning from live wiki writes.
- Replaced the generic form helper module with form-model and source-editor
  modules, and extracted external-link and review-link session
  responsibilities.
- Extracted MediaWiki preview handling and replaced untyped UI port signatures
  with named structural contracts.
- Preserved article, category, redirect, navbox, Wikidata, preview, history,
  resumable progress, and confirmation behavior.
- Added pre-save planning and review-session regression tests, bringing the
  focused package suite to 24 tests, and enabled strict TypeScript checking.
- Adopted `#gadget` imports, standardized package documentation, and the shared
  typed ES2024 builder with clean, dedicated output directories.
