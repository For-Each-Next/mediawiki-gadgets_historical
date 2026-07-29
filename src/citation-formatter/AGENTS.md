# Citation Formatter Instructions

These instructions apply to `src/citation-formatter/` and supplement the
repository instructions.

## Architecture

- Keep `index.ts`, `api.ts`, and `main.ts` side-effect free. Let `browser.ts`
  invoke `main.ts`, and keep MediaWiki startup and editor mounting in
  `browser.ts` and `ui/`.
- Keep `main.ts` as the sole composition root for wiring sibling UI, workflows,
  and infrastructure. Use `#gadget/*` for package-local imports and explicit
  `#shared/<name>` entries for workspace shared responsibilities.
- Keep citation parsing, validation, analysis, and wikitext transformations in
  `domain/` deterministic and independent of MediaWiki globals, the DOM, and
  network access.
- Keep Citoid, archive, and wiki integrations in `infra/`. Keep Codex and Vue
  rendering, editor adapters, and user interaction in `ui/`.
- Preserve type-checked localization through `i18n/`; do not embed user-visible
  strings in otherwise locale-independent domain services.
- Source authored CSS custom properties from the documented
  `@wikimedia/codex-design-tokens` catalog. Do not infer design tokens from
  component CSS or introduce undeclared token names.
- Let MediaWiki provide Codex token values at runtime. Keep the shared
  declaration-only token import for stylesheet tooling out of browser bundles.

## Runtime and Editor Safety

- Treat article wikitext and remote responses as untrusted input. Preserve
  unsupported syntax and custom citation fields unless the user explicitly
  chooses a transformation.
- Keep editor writes reviewable, scoped to the active action, and recoverable
  within the current session. Re-read editor content when an action promises to
  operate on the current article state.
- Use HTTPS for remote requests. Normal editing must use local validation and
  must not trigger live `action=parse` checks; live CS1 validation remains an
  explicit user action.
- Mount only after the required MediaWiki modules and editor surface are
  available. Keep browser-independent operations usable in tests without `mw`,
  Vue, or a browser DOM. The generated gadget and userscript are the products;
  the private TypeScript package is not a published library.

## TemplateData and Site Validation

- Treat `domain/data/` as generated English Wikipedia TemplateData. Refresh it
  with `npm run update:template-data -w citation-formatter`, not by manually
  rewriting generated snapshots.
- Follow `docs/CS1-MAINTENANCE.md` and the relevant English or Chinese site
  guide for safe downloads, supported-title checks, and Lua-rule review.
- Keep the supported template set aligned with `domain/templates.ts`. Review
  generated diffs for unexpected removals, canonical-title changes, parameter
  order, aliases, and date fields.
- Keep zhwiki-only aliases and numbered whitelist rules in
  `domain/validation/zhwiki.ts`; do not mix them into generated English
  TemplateData.
- Keep local validators conservative. The installed wiki CS1 modules remain
  authoritative for complex and site-specific behavior.

## Documentation and Changelog

- Keep the package overview and usage in `README.md`, the release record in
  `CHANGELOG.md`, and detailed maintenance guides under `docs/`.
- Record every completed package-scoped change in `CHANGELOG.md`. Inherit all
  version selection and suffix rules from the repository instructions;
  documentation-only work does not bump the package version.

## Verification

- For package changes, run `npm run check -w citation-formatter` and
  `npm test -w citation-formatter`.
- For material browser changes, apply the repository's build-version rules, run
  `npm run build -w citation-formatter`, and inspect both generated artifact
  headers.
- For documentation-only changes, run Prettier on the package Markdown, check
  local Markdown links, and inspect `git diff --check`.
