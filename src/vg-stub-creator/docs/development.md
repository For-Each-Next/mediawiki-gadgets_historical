# VG Stub Creator Development Guide

## Architecture

`browser.ts` invokes `main.ts`, while `index.ts` remains a side-effect-free
package entry point. `main.ts` is the sole composition root and joins the
package layers through explicit contracts.

- `ui/` owns browser presentation, form and review state, and previews.
- `workflows/` coordinates imports, article generation, pre-save planning, and
  saves.
- `domain/` owns normalized records, citation policy, and wikitext rendering.
- `infra/` isolates MediaWiki, Wikidata, storage, and external source adapters.
- `support/` holds presentation-neutral state transitions and error handling.
- `config/` and `i18n/` contain terminology data and interface catalogs.

UI and workflows are siblings joined through the typed ports in `ui/ports.ts`.
Dependencies point toward `domain/`, `support/`, and shared code. Domain code
never imports workflows, infrastructure, or UI code, and infrastructure does
not import UI code. Use `#gadget/*` for package-local imports and explicit
`#shared/<name>` entries for workspace shared responsibilities.

Workspace-wide MediaWiki template and link helpers live in
`src/shared/wikitext.ts`, and raw Citoid acquisition lives in
`src/shared/citoid.ts`. Citation templates, cleanup, reference rendering,
fallback policy, and caching remain package-local.

## Data flow

Article modules normalize raw inputs into the `ArticleDataRecord` contracts in
`domain/models.ts`. Each record carries normalized input, values, citations,
metadata, assumed categories and navboxes, and module-specific wikitext.

`domain/article-module.ts` supplies record defaults, `domain/modules.ts`
assigns field ownership, and `domain/processor.ts` flushes registered modules.
Pure source-field extraction stays in `domain/source-fields.ts`; external
acquisition stays in `infra/sources/`.

`workflows/article.ts` coordinates normalized records, adapters, and final
rendering. Handlers own MediaWiki page resolution and review state, while
wikitext builders own article rendering. `workflows/pre-save.ts` orders the
reviewed follow-up operations.

## Data definitions

### Terminologies

Edit terminology definitions in `config/terminologies/`:

- `companies.ts`: company aliases, labels, pages, categories, and stub tags.
- `genres.ts`: genre aliases, labels, pages, categories, and stub tags.
- `platforms.ts`: platform aliases, labels, optional pages, categories, and
  stub tags.
- `years.ts`: release-year aliases, labels, and categories. Years normally have
  no related page.

Use `config/terminologies/index.ts` to read these definitions. Call
`get(type, value)` for complete metadata, or pass `label`, `page`, `link`,
`short name`, `categories`, or another metadata key as the third argument. The
`link` projection returns `[[page|label]]` when a page exists and plain `label`
when it does not. Keep the canonical identity first in `aliases`; omit `page`
when the term should not generate a wikilink.

### Citation rules

Edit citation URL and host-specific normalization rules in
`domain/citations/data/citation-rules.ts`. Template-specific parameter order
belongs in a separate module such as `domain/citations/data/cite-web.ts`, then
in the registry at `domain/citations/data/templates.ts`. Unknown templates
retain their original parameter order.

### Interface messages

Edit interface messages in `i18n/`. English is the source catalog; every
translated catalog must contain the same semantic IDs and named placeholders.
Import `msg`, `msgParts`, and `interfaceLocale` from the locale directory entry
point rather than importing an individual catalog.

### Language text

Edit generated language text and its structural builders in `domain/wiki.ts`.
The template catalog remains separate from interface messages because it
produces article wikitext rather than gadget UI.
