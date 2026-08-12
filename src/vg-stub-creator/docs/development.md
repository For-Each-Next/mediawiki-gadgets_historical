# VG Stub Creator Development Guide

## Architecture

`browser.ts` invokes `main.ts`, while `index.ts` remains a side-effect-free
package entry point. `main.ts` is the sole composition root and joins the
package layers through explicit contracts.

- `ui/` owns browser presentation, form and review state, and previews.
- `workflows/` coordinates imports, article generation, pre-save planning, and
  saves.
- `domain/` owns normalized records, citation policy, and wikitext rendering.
- `adapters/` isolates browser, MediaWiki, network, and storage systems.
- `contracts/` defines the application capabilities presented to the UI.
- `config/` names target-wiki pages; `i18n/` contains interface catalogs.

The composition root implements the typed ports in `contracts/application.ts`.
Dependencies point toward `domain/`, contracts, and shared code. Domain code
never imports workflows, adapters, or UI code; adapters do not import UI code.
Use `#gadget/*` for package-local imports and explicit `#shared/<name>` entries
for workspace shared responsibilities.

Package-specific template and link helpers live in `domain/wikitext/`. Raw
Citoid acquisition uses `#shared/citoid`. Citation templates, cleanup,
reference rendering, fallback policy, and caching remain package-local.

## Data flow

Article modules normalize raw inputs into the `ArticleDataRecord` contracts in
`domain/models.ts`. Each record carries normalized input, values, citations,
metadata, assumed categories and navboxes, and module-specific wikitext.

`domain/article-module.ts` supplies record defaults, `domain/modules.ts`
assigns field ownership, and `domain/processor.ts` flushes registered modules.
Pure source-field extraction stays in `domain/source-fields.ts`; external
acquisition stays in `adapters/network/`.

`workflows/article.ts` coordinates normalized records, injected adapters, and
final rendering. MediaWiki adapters own page resolution, UI owns review state,
and wikitext builders own article rendering. `workflows/pre-save.ts` orders the
reviewed follow-up operations.

Before the primary article write, the workflow stores a versioned checkpoint.
New pages use `createonly` with the edit start timestamp; existing pages use
`nocreate` with base and start timestamps. Each follow-up write moves from
pending to running to confirmed. A running or uncertain operation is never
retried automatically; recovery resumes only work known not to have started.

## Data definitions

### Terminologies

Edit terminology definitions in `domain/terminologies/`:

- `companies.ts`: company aliases, labels, pages, categories, and stub tags.
- `genres.ts`: genre aliases, labels, pages, categories, and stub tags.
- `platforms.ts`: platform aliases, labels, optional pages, categories, and
  stub tags.
- `years.ts`: release-year aliases, labels, and categories. Years normally have
  no related page.

Use `domain/terminologies/index.ts` to read these definitions. Call
`get(type, value)` for complete metadata, or pass `label`, `page`, `link`,
`short name`, `categories`, or another metadata key as the third argument. The
`link` projection returns `[[page|label]]` when a page exists and plain `label`
when it does not. Keep the canonical identity first in `aliases`; omit `page`
when the term should not generate a wikilink.

### Wikitext capabilities

Use `domain/wikitext/index.ts` as the stable package-local facade:

- `builders.ts` constructs template calls and wikilinks;
- `field-values.ts` parses compact values and delimiter-aware field lists; and
- `reference-data.ts` matches typed terminology definitions and flattens their
  associated metadata.

Keep the three modules independent of browser and MediaWiki APIs. Add focused
tests for facade behavior when changing parsing or rendering rules.

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
