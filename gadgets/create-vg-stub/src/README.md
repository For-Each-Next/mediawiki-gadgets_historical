# create-vg-stub source layout

The gadget passes named data records through the article workflow. Every
raw article module emits the `ArticleDataRecord` shape from
`article/data-record.js`. The record includes normalized input, values,
citations, metadata, assumed categories, navboxes, and module-specific
wikitext.

- `article/data/`: pure field parsing and metadata extraction.
- `article/modules/`: field ownership, live normalization, and record adapters.
- `article/processor.js`: flushes registered modules into article data.
- `config/`: editable build-time definitions and language text.
- `handlers/`: asynchronous title/category/navbox resolution and review state.
- `wikitext/`: pure builders that accept prepared data and return text.
- `interface/`: form UI and form-history persistence.
- `sources/`: citation and external metadata acquisition.
- `editing/`: edit-session, summary, and pre-save behavior.
- `save/`: persistent save-progress state and rendering.
- `shared/`: low-level form and wikitext utilities.
- `workflow/article.js`: coordinates form input, handlers, citations, previews,
  and final wikitext.

Prose composition belongs to `wikitext/prose.js`. It builds the whole lead
paragraph from the relevant named records and returns:

```js
{
    fragments,
    sinographs,
    text,
}
```

Handlers own MediaWiki page resolution and review state. Wikitext builders
own article text rendering. Cross-layer work belongs in
`workflow/article.js`.

Generated language text belongs in `config/wikitext.jsonc`. Builders retain
structural wikitext and substitute named placeholders through
`shared/text-templates.js`.
