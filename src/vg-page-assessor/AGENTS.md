# VG Page Assessor Instructions

These instructions apply to `src/vg-page-assessor/` in addition to the
repository-wide `AGENTS.md`.

## Product Status and Wiki Safety

- Treat VG Page Assessor as early-development software with known bugs.
- Preserve a preview-before-save workflow for talk-page assessments and
  new-page-list changes. A live-wiki write must follow an explicit user save
  action and use the exact content shown for review.
- Treat page targeting, edit-conflict handling, edit summaries, and MediaWiki
  API writes as safety-sensitive behavior. Keep failure reporting visible and
  do not silently retry a write when its outcome is uncertain.

## Architecture

- Keep `index.ts` and `main.ts` side-effect free. Let `browser.ts` invoke
  `main.ts`, and keep `main.ts` as the sole composition root for sibling UI,
  workflows, and infrastructure.
- Keep assessment and wikitext rules in `domain/`, application workflows in
  `workflows/`, MediaWiki access and logging in `infra/`, and rendering and
  user interaction in `ui/`.
- Use `#gadget/*` for package-local imports and explicit `#shared/<name>`
  entries for workspace shared responsibilities.
- Keep project-specific constants in `config/` and all user-facing text in
  `i18n/`. Do not bypass these boundaries by embedding API calls, project
  configuration, or untranslated text in domain logic.

## Documentation and Changelog

- Keep `README.md`, `AGENTS.md`, and `CHANGELOG.md` at the package root. Put
  supporting package documentation in `docs/`.
- Maintain the canonical package changelog in `CHANGELOG.md` and update its
  active section for every completed package-scoped change, including
  documentation-only work.

## Releases

- The `0.2` development line reflects the user-selected next minor version and
  early-development status. Inherit all version, suffix, build, and
  generated-artifact rules from the repository instructions.

## Focused Verification

- For source changes, run `npm run check -w vg-page-assessor` and
  `npm test -w vg-page-assessor`.
- For material browser-behavior changes, advance the version as required by the
  repository instructions, run `npm run build -w vg-page-assessor`, and verify
  both generated artifact headers. Documentation-only changes do not require a
  build.
