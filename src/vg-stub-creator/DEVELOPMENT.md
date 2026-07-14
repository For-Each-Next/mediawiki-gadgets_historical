# VG Stub Creator source layout

The gadget passes named data records through the article workflow. Every
raw article module emits the `ArticleDataRecord` shape from
`article/data-record.ts`. The record includes normalized input, values,
citations, metadata, assumed categories, navboxes, and module-specific
wikitext.

- `article/data/`: pure field parsing and metadata extraction.
- `article/modules/`: field ownership, live normalization, and record adapters.
- `article/processor.ts`: flushes registered modules into article data.
- `handlers/`: asynchronous title/category/navbox resolution and review state.
- `terminologies/`: canonical names, aliases, optional pages, and metadata.
- `wikitext/`: pure builders and generated-language templates.
- `interface/`: form UI and form-history persistence.
- `sources/`: citation and external metadata acquisition.
- `editing/`: edit-session, summary, and pre-save behavior.
- `save/`: persistent save-progress state and rendering.
- `shared/`: low-level form and wikitext utilities.
- `workflow.ts`: coordinates form input, handlers, citations, previews, and
  final wikitext.

## Data definitions

### Terminologies

Edit terminology definitions in `terminologies/`:

- `companies.ts`: company names, aliases, pages, categories, and stub tags.
- `genres.ts`: genre names, aliases, pages, categories, and stub tags.
- `platforms.ts`: platform names, aliases, optional pages, categories, and
  stub tags.
- `years.ts`: release-year names, aliases, and categories. Years normally
  have no related page.

Use `terminologies/index.ts` to read these definitions. Call
`get(type, value)` for complete metadata, or pass `name`, `page`, `link`,
`short name`, `categories`, or another metadata key as the third argument.
The `link` projection returns `[[page|name]]` when a page exists and plain
`name` when it does not.

### Citation rules

Edit citation URL and host-specific normalization rules in
`sources/citation-rules.ts`.

### Language text

Edit generated language text in `wikitext/wikitext.ts`. Builders retain
structural wikitext and substitute named placeholders through
`shared/text-templates.ts`.

Prose composition belongs to `wikitext/prose.ts`. It builds the whole lead
paragraph from the relevant named records and returns:

```js
const result = {
    fragments,
    sinographs,
    text,
};
```

Handlers own MediaWiki page resolution and review state. Wikitext builders
own article text rendering. Cross-layer work belongs in `workflow.ts`.
