# Changelog

## Until 0.6

### 0.5.1 (2026-07-29 21:25 UTC)

Overview: VG Stub Creator improves accessibility, review updates, validation,
readable builds, comment-free userscripts, and package documentation.

- Preserved localized native titles and accessible labels on all icon-only
  table actions.
- Removed the shared tooltip state, focus and pointer handlers, positioned
  overlay markup, and presentation rules.
- Added structural coverage for all native-titled icon actions and the
  repository-wide ban on scripted tooltips.
- Made redirect, category, and navbox refresh actions safely reuse the current
  row value when no textbox event is present.
- Added isolated project-wide Vue template validation, made `tsconfig.json` its
  root entry point, and centralized Prettier, Stylelint, and JSON-compatible
  Vue settings in package manifests.
- Added a formatted, human-readable build with documentation comments and wrote
  all three uniquely named artifacts directly under `dist/`, with rebuild
  cleanup limited to this gadget's outputs.
- Aligned readable gadget and userscript JavaScript with the repository's
  four-space indentation while preserving ordinary multiline template values.
- Retained userscript metadata comments while removing comments from the
  executable code section without altering comment-like runtime strings.
- Consolidated the shared build CLI and HTML-template processing under
  package-style `gadget-build` entry points enforced by package validation.
- Expanded user-facing workflow and review features, kept focused support
  guides, centralized release and commit workflows, and retained only
  package-specific scoped instructions.

### 0.5.0 (2026-07-29 18:02 UTC)

Overview: VG Stub Creator now has typed workflows, JSON localization, nine
Codex dialogs, shared Citoid transport, and safer review saves.

- Added a `main.ts` composition root that injected article, pre-save, editing,
  category, source, and progress ports into an instance-bound browser app.
- Limited the browser entry to invoking the composition root and removed the
  obsolete externally exported save-form operation.
- Introduced named article records and module contracts, removed a domain
  import cycle, and separated pre-save planning from live wiki writes.
- Replaced the generic form helper module with form-model and source-editor
  modules, and extracted external-link and review-link session
  responsibilities.
- Moved English and Chinese interface catalogs from TypeScript objects to flat
  JSON data while retaining typed message IDs and placeholder validation.
- Replaced generated TypeScript markup with nine co-located Vue, TypeScript,
  and CSS dialog trios assembled under one setup scope, preserving runtime
  localization, review actions, and dynamic tooltip positioning.
- Kept the history clear action parser-safe through a named availability method
  and made valid complex dialog selectors unambiguous to IDE tooling.
- Validated custom properties against the official Codex token catalog without
  bundling token defaults into MediaWiki.
- Extracted MediaWiki preview handling and replaced untyped UI port signatures
  with named structural contracts.
- Preserved article, category, redirect, navbox, Wikidata, preview, history,
  resumable progress, and confirmation behavior.
- Added pre-save planning, review-session, and citation-fetch regression tests
  plus dialog composition and asset-safety coverage, and enabled strict
  TypeScript checking.
- Split URL-or-identifier Citoid fetching into a transport-only shared client
  while moving citation rules, TemplateData, reference wikitext, cleanup, and
  template formatting into the package domain and isolating its 404 HTML-title
  fallback in source infrastructure.
- Adopted `#gadget` imports, standardized package documentation, and the shared
  typed ES2024 builder with clean, dedicated output directories.
- Renamed the durable release record to `CHANGELOG.md`.
- Moved browser startup from the package entry point into `browser.ts`, keeping
  imports side-effect free.
- Replaced generated-looking terminology and test names with
  responsibility-specific names and removed an unused domain re-export from the
  source-adapter entry point.
- Added a root license notice and linked it from the package entry
  documentation.
