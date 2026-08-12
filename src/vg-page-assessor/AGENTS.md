# VG Page Assessor Instructions

These instructions apply to `src/vg-page-assessor/` in addition to the
repository-wide `AGENTS.md`.

## Product Status and Wiki Safety

- Treat VG Page Assessor as early-development software with known bugs.
- Preserve a preview-before-save workflow for talk-page assessments and
  new-page-list changes. A live-wiki write must follow an explicit user save
  action and use the exact content shown for review.
- Treat page targeting, edit-conflict handling, edit summaries, and MediaWiki
  API writes as safety-sensitive behavior. Retry only a confirmed edit conflict
  after refetching and reapplying the reviewed change; surface every uncertain
  outcome for user resolution.

## Architecture

- Keep `index.ts` side-effect free. Let `browser.ts` only invoke `start`, and
  keep MediaWiki startup orchestration in the `main.ts` composition root.
- Keep assessment and wikitext rules in `domain/`, application workflows in
  `workflows/`, MediaWiki and storage boundaries in `adapters/`, and rendering
  and user interaction in `ui/`.
- Create the package-scoped shared logger and native action notifier in
  `main.ts`. Inject scoped loggers into workflows, adapters, and UI; never call
  `console.*` or `mw.notify` from package implementation modules.
- Keep project-specific constants in `config/` and all user-facing text in
  `i18n/`. Domain logic receives API results, configuration, and localized
  presentation through explicit boundaries.
