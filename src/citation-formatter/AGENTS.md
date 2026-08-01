# Citation Formatter Instructions

These instructions apply to `src/citation-formatter/` and supplement the
repository instructions.

## Architecture

- Keep `index.ts`, `api.ts`, and `main.ts` side-effect free. Let `browser.ts`
  invoke `main.ts`, and keep MediaWiki startup and editor mounting in
  `browser.ts` and `ui/`.
- Keep citation parsing, validation, analysis, and wikitext transformations in
  `domain/` deterministic and independent of MediaWiki globals, the DOM, and
  network access.
- Keep Citoid, archive, and wiki integrations in `infra/`. Keep Codex and Vue
  rendering, editor adapters, and user interaction in `ui/`.
- Source authored CSS custom properties from the documented
  `@wikimedia/codex-design-tokens` catalog and use only its declared token
  names.
- Let MediaWiki provide Codex token values at runtime. Keep the shared
  declaration-only token import for stylesheet tooling out of browser bundles.

## Runtime and Editor Safety

- Treat article wikitext and remote responses as untrusted input. Preserve
  unsupported syntax and custom citation fields. Transform them only after an
  explicit user choice.
- Keep editor writes reviewable, scoped to the active action, and recoverable
  within the current session. Re-read editor content when an action promises to
  operate on the current article state.
- Use HTTPS for remote requests. Normal editing relies on local validation;
  reserve live `action=parse` CS1 validation for an explicit user action.
- Mount only after the required MediaWiki modules and editor surface are
  available. Keep browser-independent operations usable in tests without `mw`,
  Vue, or a browser DOM. The formatted, minified, and userscript browser
  artifacts are the products; the private TypeScript package is not a published
  library.

## TemplateData and Site Validation

- Treat `#shared/citation` as the shared citation capability and its committed
  `citation-template-data/` branch as generated English Wikipedia TemplateData.
  The maintenance guide defines its reproducible refresh workflow.
- Follow `docs/cs1-maintenance.md` and the relevant English or Chinese site
  guide for safe downloads, supported-title checks, and Lua-rule review.
- Keep the supported template set aligned with `domain/templates.ts`. Review
  generated diffs for unexpected removals, canonical-title changes, parameter
  order, aliases, and date fields.
- Keep zhwiki-only aliases and numbered whitelist rules in
  `domain/validation/zhwiki.ts`, separate from generated English TemplateData.
- Keep local validators conservative. The installed wiki CS1 modules remain
  authoritative for complex and site-specific behavior.

## Documentation

- Keep reference-name syntax in `docs/reference-names.md`.
- Keep the shared refresh workflow in `docs/cs1-maintenance.md`. Keep English
  and Chinese authority and interpretation rules separate in
  `docs/enwiki-cs1.md` and `docs/zhwiki-cs1.md`.
