# VG Stub Creator

VG Stub Creator helps editors create video-game stub articles on Chinese
Wikipedia. It imports and normalizes source metadata, builds reviewable article
wikitext, and coordinates related follow-up edits.

> **Status:** VG Stub Creator is under active development. This private
> workspace package produces browser-ready MediaWiki gadget and userscript
> artifacts rather than a published npm library.

## Run

Build the package from the repository root:

```shell
npm run build -w vg-stub-creator
```

This writes three ignored artifacts directly to `dist/`:

- `vg_stub_creator.js` is the formatted, human-readable version.
- `vg_stub_creator.min.js` is the minified version.
- `vg_stub_creator.user.js` is the Greasemonkey-compatible version.

### MediaWiki user page

Open `Special:MyPage/common.js` on a supported wiki, paste the complete
contents of `dist/vg_stub_creator.min.js`, and publish the page. Use
[Meta-Wiki's `Special:MyPage/global.js`][1] to load it across Wikimedia
projects where the account is active.

After publishing, bypass the browser cache or perform a hard refresh.

### Userscript manager

Create a script in a Greasemonkey-compatible userscript manager, replace its
editor contents with `dist/vg_stub_creator.user.js`, and save it. Keep the
generated metadata header intact.

After either installation, use the page action on English or Chinese Wikipedia.
Review the generated article and every related operation before confirming a
save.

## Features

VG Stub Creator:

- launches from English or Chinese Wikipedia and carries source metadata into a
  Chinese Wikipedia article workflow;
- enriches article data from English Wikipedia, Wikidata, source pages, and
  Steam;
- builds localized titles, conversion rules, infobox fields, article prose,
  review scores, references, and footer wikitext;
- fetches and normalizes citations while keeping their parameters editable;
- normalizes terminology for companies, genres, platforms, series, and years;
- previews editable article wikitext, rendered HTML, and the edit summary
  before any write;
- prepares selectable page moves, redirects, talk-page banners, categories,
  navboxes, stub-related pages, and Wikidata sitelink updates;
- records resumable save progress for partial failures; and
- loads, restores, imports, exports, and deletes local draft-history entries.

The interface includes English, Simplified Chinese, and Traditional Chinese
catalogs. Live-wiki writes occur only after the review and confirmation steps.

## Development

The workspace requires Node.js 22.18 or later. From the repository root, run:

```shell
npm install
npm run check -w vg-stub-creator
npm test -w vg-stub-creator
npm run build -w vg-stub-creator
```

Tests use local fixtures and mocked external services for editing, page moves,
and Wikidata updates.

See the [development guide][2] for architecture, data flow, terminology,
citations, and localization guidance.

## Architecture

The browser entry invokes the composition root, while the package entry remains
side-effect free:

```text
browser.ts
└── main.ts
    ├── ui ─────────> domain, i18n, support
    ├── workflows ──> domain, infra, i18n
    └── infra ──────> domain, config, i18n, support, shared

index.ts (side-effect-free package entry)
```

`main.ts` connects presentation, workflow, and adapter ports. Dependencies
point toward domain and shared responsibilities. The [development guide][2]
documents their boundaries and extension points.

See the package [changelog][3], its scoped [AGENTS.md][4], and the repository
[AGENTS.md][5] for architecture, safety, versioning, and verification rules.

## License

VG Stub Creator is licensed under [CC BY-SA 4.0][6]. The repository license
notice is in [LICENSE][7].

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: docs/development.md
[3]: CHANGELOG.md
[4]: AGENTS.md
[5]: ../../AGENTS.md
[6]: https://creativecommons.org/licenses/by-sa/4.0/
[7]: ../../LICENSE
