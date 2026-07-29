# VG Stub Creator Instructions

These instructions apply to `src/vg-stub-creator/`. The repository-root
instructions remain in force.

## Workflow safety

- Treat MediaWiki reads, writes, moves, Wikidata updates, and related-page
  creation as live-wiki operations. Do not run them against production during
  development or verification.
- Preserve the review, confirmation, pre-save validation, edit-summary, and
  resumable-progress steps. Do not make a workflow write earlier or more
  broadly than the editor approved.
- Exercise network and save behavior through mocks or fixtures. Keep partial
  failure recoverable and report the affected page or operation clearly.

## Architecture and imports

- Keep `index.ts` and `main.ts` side-effect free. Let `browser.ts` invoke
  `main.ts`, and keep `main.ts` as the sole composition root for sibling UI,
  workflows, domain services, and external adapters.
- Put orchestration in `workflows/`, pure records and rendering in `domain/`,
  external adapters in `infra/`, and browser presentation and state in `ui/`.
- Dependencies point toward `domain/` and shared code: domain code must not
  import workflows, infra, or UI code, and infra code must not import UI code.
- Use `#gadget/*` for package-local imports and explicit `#shared/<name>`
  entries for workspace responsibilities. Put cross-layer coordination in
  `workflows/article.ts`.

## Normalization, data, and language

- Normalize raw source data into the named `ArticleDataRecord` contracts before
  rendering or saving it. Keep handlers responsible for page resolution and
  review state, and keep wikitext builders responsible for article text.
- Keep canonical terminology identities first in `aliases`; omit `page` when a
  term must remain unlinked. Keep VG citation formatting and cleanup in
  `domain/`, HTML fallback requests in `infra/sources/`, and raw Citoid
  acquisition behind `#shared/citoid`.
- Treat English as the source interface catalog. Keep every translated catalog
  aligned on semantic message IDs and named placeholders, and import messages
  through the `i18n/` entry point.
- Keep generated article-language text in `domain/wiki.ts`, separate from
  interface messages. Update fixtures and focused tests with data or
  normalization changes.

## Documentation and releases

- Keep `README.md` as the package overview. Maintain detailed guidance in
  `docs/DEVELOPMENT.md` and the durable release record in `CHANGELOG.md`.
- Update the active changelog entry for every completed package change. Inherit
  all version-selection, suffix, cleanup, and build rules from the repository
  instructions; do not bump versions for documentation-only work.

## Verification

- Run `npm run check -w vg-stub-creator` and `npm test -w vg-stub-creator` for
  package changes.
- For behavior or build changes, also follow the repository build and generated
  artifact checks. A documentation-only change does not require a gadget build.
