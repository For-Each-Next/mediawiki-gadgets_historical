# VG Stub Creator source layout

The gadget passes named data records through the article workflow. Every
raw article module emits the `ArticleDataRecord` shape from
`domain/processor.ts`. The record includes normalized input, values,
citations, metadata, assumed categories, navboxes, and module-specific wikitext.

- `domain/data.ts`: pure field parsing and metadata extraction.
- `domain/modules.ts`: field ownership and normalized record adapters.
- `domain/processor.ts`: flushes registered modules into article data.
- `config/terminologies/`: canonical aliases, labels, pages, and metadata.
- `domain/wiki.ts`: pure builders and generated-language templates.
- `app/workflow.ts`: coordinates records, adapters, and final text.
- `infra/handlers/`: title, category, and navbox resolution.
- `infra/sources/`: citations and external metadata acquisition.
- `infra/editing/`: edit-session, summary, and pre-save behavior.
- `infra/save/`: persistent save-progress state and rendering.
- `ui/`: form UI, previews, review state, and browser activation.
- `shared/`: package-local form primitives.

Workspace-wide MediaWiki template, link, and reference helpers live in
the root `src/shared/wikitext.ts` module. Citation acquisition, template data,
and reference rendering live in `src/shared/cite/`; the gadget retains only
its source adapters and citation cache.

Dependencies point toward `domain/` and `shared/`. Domain code never imports
app, infra, or UI code. Infra does not import UI code. Use `#me/*` for
package-local imports and `#shared` for the workspace-wide shared package.

## Data definitions

### Terminologies

Edit terminology definitions in `config/terminologies/`:

- `companies.ts`: company aliases, labels, pages, categories, and stub tags.
- `genres.ts`: genre aliases, labels, pages, categories, and stub tags.
- `platforms.ts`: platform aliases, labels, optional pages, categories, and
  stub tags.
- `years.ts`: release-year aliases, labels, and categories. Years normally
  have no related page.

Use `config/terminologies/index.ts` to read these definitions. Call
`get(type, value)` for complete metadata, or pass `label`, `page`, `link`,
`short name`, `categories`, or another metadata key as the third argument.
The `link` projection returns `[[page|label]]` when a page exists and plain
`label` when it does not. Keep the canonical identity first in `aliases`;
omit `page` when the term should not generate a wikilink.

### Citation rules

Edit shared citation URL and host-specific normalization rules in
`../shared/cite/data/citation-rules.ts`. Template-specific parameter order
belongs in a separate module such as `../shared/cite/data/cite-web.ts`, then in
the registry at `../shared/cite/data/templates.ts`. Unknown templates retain
their original parameter order.

### Interface messages

Edit interface messages in `i18n/`. English is the source catalog;
every translated catalog must contain the same semantic IDs and named
placeholders. Import `msg`, `msgParts`, and `interfaceLocale` from the locale
directory entry point rather than importing an individual catalog.

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

Handlers own MediaWiki page resolution and review state. Wikitext builders
own article text rendering. Cross-layer work belongs in `workflow.ts`.
