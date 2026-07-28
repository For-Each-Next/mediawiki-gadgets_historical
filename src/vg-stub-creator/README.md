# VG Stub Creator

VG Stub Creator helps editors create video-game stub articles on Chinese
Wikipedia. It adds page actions on English and Chinese Wikipedia, imports and
normalizes source metadata, builds article wikitext, and coordinates related
follow-up edits.

> **Status:** VG Stub Creator is under active development. This private
> workspace package produces browser-ready MediaWiki gadget and userscript
> artifacts rather than a published npm library.

## Use

A local build writes these files to `dist/vg-stub-creator/`:

- `vg_stub_creator.min.js` for deployment as MediaWiki gadget or personal
  JavaScript.
- `vg_stub_creator.user.js` for installation with a userscript manager. The
  userscript matches English and Chinese Wikipedia.

A deployed compressed copy is available from
[Meta-Wiki][1], although it may lag behind this repository.

The interface can import metadata from English Wikipedia, Wikidata, Steam, and
source URLs. Before saving, editors can review generated categories, redirects,
navboxes, localized names, citations, and stub tags. The workflow can also
create related category and navbox pages, redirects, talk-page banners,
Wikidata sitelinks, and new-page-list entries.

## Development

The workspace requires Node.js 22.18 or later. From the repository root, run:

```sh
npm run check
npm test -w vg-stub-creator
npm run build -w vg-stub-creator
```

## Architecture

- `index.ts` is the browser bundle entry point.
- `config/` and `domain/` define terminology data, normalized article records,
  processing contracts, and wikitext rendering.
- `app/` coordinates the article-creation workflow.
- `infra/` contains MediaWiki, source, editing, save, and persistence adapters.
- `i18n/` contains the English, Simplified Chinese, and Traditional Chinese
  interface catalogs.
- `ui/` contains the Codex interface, previews, review state, and browser
  activation.
- `../shared/` provides workspace-wide citation and wikitext utilities.

See the [development guide][2] for detailed source and data guidance, the
[release history][3] for completed changes, and the [package instructions][4]
for contribution and release rules.

## License

VG Stub Creator is licensed under CC BY-SA 4.0.

[1]: https://meta.wikimedia.org/wiki/User:For_Each_..._Next/global.js/vg_stub_creator.js
[2]: docs/DEVELOPMENT.md
[3]: HISTORY.md
[4]: AGENTS.md
