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

- `src/index.js`: gadget entry point and site activation.
- `src/workflow.js`: article creation workflow.
- `src/article/`: form data and article metadata pipeline.
- `src/wikitext/`: generated article wikitext.
- `src/interface/`: Codex dialog UI, preview, review, and history views.
- `src/editing/`: editor integration, edit summaries, and save sessions.
- `src/handlers/`: category, navbox, title, and new-page-list API helpers.
- `src/save/`: pre-save action execution and progress state.
- `src/sources/`: external-source lookup, citations, crosswiki metadata, and Steam names.
- `src/terminologies/`: configured video-game terminology data.
