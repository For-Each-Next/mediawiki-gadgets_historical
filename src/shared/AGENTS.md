# Shared Package Instructions

These instructions apply to `src/shared/` and supplement the repository
instructions.

## Public API

- Treat `package.json#exports` as the complete shared API. Add a capability
  only when at least two gadgets own the same stable responsibility.
- Give every published capability a directory entry point. Keep implementation
  modules private and avoid a bare aggregate export.
- Keep capabilities independent of gadget packages. Do not encode one gadget's
  workflow, UI state, messages, or release policy in shared source.
- Prefer explicit contracts and dependency injection at browser boundaries so
  shared behavior remains testable without a live wiki.

## Capabilities

- Keep Citoid transport in `citoid/`, editor integration in `edit-box/`,
  translation mechanics in `i18n/`, structured diagnostics in `logging/`, and
  native action messages in `mediawiki/notifications/`.
- Keep wiki-independent syntax parsing and construction in `wikitext/`. Keep
  database-specific namespace and title rules in `wiki-titles/`.
- Keep short-footnote resolution in `short-footnotes/`; it may depend on the
  public wikitext capability but not on a gadget.
- Keep the Codex token stylesheet declaration under `mediawiki/`; it is tooling
  input and must not enter browser bundles.

## Safety and Tests

- Redact article text, credentials, identity data, request payloads, and URLs
  before emitting diagnostics. Keep logging disabled below `warn` by default.
- Use `mw.notify` for brief action feedback; persistent error outcomes may
  remain until dismissed. Do not introduce toast components or notification
  presentation CSS.
- Mirror public capability names under `tests/shared/`. Exercise browser
  integrations through narrow mocks, and keep the suite offline.
