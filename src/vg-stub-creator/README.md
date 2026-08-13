# VG Stub Creator

VG Stub Creator helps editors create video-game stub articles on Chinese
Wikipedia. It imports and normalizes source metadata, builds reviewable article
wikitext, and coordinates related follow-up edits.

> **Status:** VG Stub Creator is under active development. This private
> workspace package produces a browser-ready MediaWiki gadget, while the
> workspace combines every gadget into one userscript rather than publishing
> npm libraries.

## Run

Build the package from the repository root:

```shell
npm run build -w vg-stub-creator
```

This package-only build writes one ignored artifact directly under `dist/`:

- `dist/vg_stub_creator.min.js` is the minified MediaWiki gadget.

A complete workspace build with `npm run build` writes every gadget's minified
file and `dist/00-mediawiki-gadgets.user.js`, the single Greasemonkey-
compatible userscript containing all gadgets. Run
`npm run build:all-userscript` to rebuild only
`dist/00-mediawiki-gadgets.user.js` directly from the current sources.

### MediaWiki user page

Open `Special:MyPage/common.js` on a supported wiki, paste the complete
contents of `dist/vg_stub_creator.min.js`, and publish the page. Use
[Meta-Wiki's `Special:MyPage/global.js`][1] to load it across Wikimedia
projects where the account is active.

After publishing, bypass the browser cache or perform a hard refresh.

### Userscript manager

Create a script in a Greasemonkey-compatible userscript manager, replace its
editor contents with `dist/00-mediawiki-gadgets.user.js`, and save it. Keep the
generated metadata header intact. This userscript contains every workspace
gadget; each one starts only on its declared sites.

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
- checkpoints each write, resumes confirmed-safe pending work, and blocks
  uncertain writes for manual review; and
- loads, restores, imports, exports, and deletes local draft-history entries.

The interface includes English, Simplified Chinese, and Traditional Chinese
catalogs. Live-wiki writes occur only after the review and confirmation steps.

## Development

The workspace requires Node.js 24.14.1 or later. From the repository root, run:

```shell
npm ci
npm run check -w vg-stub-creator
npm test -w vg-stub-creator
npm run build -w vg-stub-creator
```

Tests use local fixtures and mocked external services for editing, page moves,
and Wikidata updates.

See the package [development guide][2] for architecture, data flow,
terminology, citations, and localization guidance. The repository [development
workflow][9] explains the complete verification gate and live-service policy.

## Architecture

The browser entry invokes the composition root, while the package entry remains
side-effect free:

```text
browser.ts
└── main.ts
    ├── contracts/application.ts <── ui
    ├── ui ─────────> domain, config, i18n, shared
    ├── workflows ──> contracts, domain, shared
    ├── adapters
    │   ├── browser, mediawiki, network, storage
    │   └── contracts, domain, config, shared
    └── domain
        ├── citations
        ├── terminologies
        └── wikitext

index.ts (side-effect-free package entry)
```

`main.ts` creates the browser, MediaWiki, network, storage, logging, and native
notification adapters, then connects them to UI and workflow ports.
`domain/wikitext/` separates output builders, wikilink-aware field parsing, and
reference-data lookup behind one thin facade. The [development guide][2]
documents every boundary and extension point.

See the package [changelog][3], its scoped [AGENTS.md][4], and the repository
[AGENTS.md][5] for architecture, safety, versioning, and verification rules.

## License

The project-owned portions of VG Stub Creator 0.6.0 are dedicated under [CC0
1.0 Universal][6]. The package [license][7] fixes this release's scope and
preserves third-party terms. The repository [licensing map][8] covers the rest
of the workspace.

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: docs/development.md
[3]: CHANGELOG.md
[4]: AGENTS.md
[5]: ../../AGENTS.md
[6]: https://creativecommons.org/publicdomain/zero/1.0/
[7]: LICENSE
[8]: ../../LICENSE
[9]: ../../docs/development-workflow.md
