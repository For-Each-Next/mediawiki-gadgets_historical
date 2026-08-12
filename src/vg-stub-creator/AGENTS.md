# VG Stub Creator Instructions

These instructions apply to `src/vg-stub-creator/`. The repository-root
instructions remain in force.

## Workflow Safety

- Treat MediaWiki reads, writes, moves, Wikidata updates, and related-page
  creation as live-wiki operations. Use mocks and fixtures for development and
  verification. Keep partial failure recoverable and report the affected page
  or operation clearly.
- Preserve the review, confirmation, pre-save validation, edit-summary, and
  resumable-progress steps. Each workflow write stays within the exact scope
  approved by the editor.

## Architecture

- Present runtime capabilities to the UI through the typed ports in
  `contracts/application.ts`. Keep article pipeline coordination in
  `workflows/article.ts`.

## Domain Invariants

- Normalize raw source data into the named `ArticleDataRecord` contracts before
  rendering or saving it. Keep MediaWiki adapters responsible for page
  resolution, UI responsible for review state, and wikitext builders
  responsible for article text.
- Keep canonical terminology identities first in `aliases`; omit `page` when a
  term must remain unlinked. Keep VG citation formatting and cleanup in
  `domain/`, HTML fallback requests in `adapters/network/`, and raw Citoid
  acquisition behind `#shared/citoid`.
- Keep `domain/wikitext/index.ts` as a thin facade. Put output construction in
  `builders.ts`, form-value parsing in `field-values.ts`, and terminology
  reference lookup in `reference-data.ts`.
- Keep generated article-language text in `domain/wiki.ts`, separate from
  interface messages. Update fixtures and focused tests with data or
  normalization changes.

## Documentation

- Keep detailed contributor guidance in `docs/development.md`.
