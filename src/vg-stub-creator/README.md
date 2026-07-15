# VG Stub Creator

VG Stub Creator is a Chinese Wikipedia helper for creating video-game stub articles. It adds page actions on English Wikipedia and Chinese Wikipedia, builds article wikitext, and can run the related follow-up edits before saving.

## Features

- Builds Chinese Wikipedia video-game stub article source.
- Imports and normalizes metadata from English Wikipedia, Wikidata, Steam, and source URLs.
- Reviews generated categories, redirects, navboxes, localized names, citations, and stub tags before saving.
- Can create related category pages, navbox pages, redirects, talk-page banners, Wikidata sitelinks, and new-page-list entries.

## Build

Run `npm run check`, `npm test`, and `npm run build` from this directory.

Generated files are written to `dist/vg-stub-creator/` as `vg_stub_creator.min.js` and `vg_stub_creator.user.js`.

You can get compressed code from <https://meta.wikimedia.org/wiki/User:For_Each_..._Next/global.js/vg_stub_creator.js>, but it may not update on time.

## Source

- `index.ts`: minimal browser bundle entry point.
- `domain/article/`: normalized article records and processing contracts.
- `domain/data.ts`: pure field parsing and metadata extraction.
- `domain/modules.ts`: field ownership and normalized record adapters.
- `domain/wiki.ts`: pure wikitext rendering and language templates.
- `domain/terminologies/`: configured video-game terminology data.
- `application/workflow.ts`: article creation use cases.
- `infrastructure/`: MediaWiki, source, editing, and persistence adapters.
- `presentation/`: Codex UI, previews, review state, and browser activation.
- `shared/`: package-local form primitives; generic helpers live in
  `../shared/`.
- `DEVELOPMENT.md`: source architecture and editing guidance.
