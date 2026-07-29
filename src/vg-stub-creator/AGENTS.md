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

- Join UI and workflows through the typed ports in `ui/ports.ts`. Keep article
  pipeline coordination in `workflows/article.ts`.

## Domain Invariants

- Normalize raw source data into the named `ArticleDataRecord` contracts before
  rendering or saving it. Keep handlers responsible for page resolution and
  review state, and keep wikitext builders responsible for article text.
- Keep canonical terminology identities first in `aliases`; omit `page` when a
  term must remain unlinked. Keep VG citation formatting and cleanup in
  `domain/`, HTML fallback requests in `infra/sources/`, and raw Citoid
  acquisition behind `#shared/citoid`.
- Keep generated article-language text in `domain/wiki.ts`, separate from
  interface messages. Update fixtures and focused tests with data or
  normalization changes.

## Documentation

- Keep detailed contributor guidance in `docs/development.md`.
