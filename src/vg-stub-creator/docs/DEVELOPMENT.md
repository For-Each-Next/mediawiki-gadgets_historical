# VG Stub Creator development guide

The gadget passes named data records through the article workflow. Every raw
article module emits the `ArticleDataRecord` shape from `domain/models.ts`. The
record includes normalized input, values, citations, metadata, assumed
categories, navboxes, and module-specific wikitext.

- `main.ts`: composes sibling UI, workflows, and external adapters.
- `domain/models.ts`: shared article and workflow contracts.
- `domain/article-module.ts`: article-module factory and record defaults.
- `domain/data.ts`: pure field parsing and metadata extraction.
- `domain/modules.ts`: field ownership and normalized record adapters.
- `domain/processor.ts`: flushes registered modules into article data.
- `domain/source-fields.ts`: pure extraction of entered citation fields.
- `domain/citations/`: citation metadata mapping, cleanup, and template text.
- `domain/reference-wikitext.ts`: reference naming and section rendering.
- `config/terminologies/`: canonical aliases, labels, pages, and metadata.
- `domain/wiki.ts`: pure builders and generated-language templates.
- `workflows/article.ts`: coordinates records, adapters, and final text.
- `workflows/pre-save.ts`: orders reviewed follow-up operations.
- `infra/handlers/`: title, category, and navbox resolution.
- `infra/sources/`: raw citation, fallback, and external metadata acquisition.
- `infra/editing/`: edit-session and MediaWiki write adapters.
- `infra/save/`: persistent save-progress storage and controllers.
- `support/`: presentation-neutral state transitions and error normalization.
- `ui/`: form UI, previews, review state, and browser activation.

Workspace-wide MediaWiki template and link helpers live in
`src/shared/wikitext.ts`. Raw Citoid acquisition lives in
`src/shared/citoid.ts`. VG citation template data, cleanup, reference
rendering, fallback policy, and caching remain package-local.

`main.ts` is the composition root. UI and workflows are siblings joined through
the typed ports in `ui/ports.ts`; UI code does not import infrastructure.
Dependencies point toward `domain/`, `support/`, and the workspace shared
package. Domain code never imports workflows, infrastructure, or UI code, and
infrastructure does not import UI code. Use `#gadget/*` for package-local
imports and explicit `#shared/<name>` entries for workspace shared
responsibilities.

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

Prose composition in `domain/wiki.ts` builds the lead paragraph from the
relevant named records and returns:

```js
const result = {
    fragments,
    sinographs,
    text,
};
```

Handlers own MediaWiki page resolution and review state. Wikitext builders own
article text rendering. Cross-layer work belongs in `workflows/`.
