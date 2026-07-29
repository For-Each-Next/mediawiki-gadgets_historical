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

This writes two ignored artifacts to `dist/vg-stub-creator/`:

- `vg_stub_creator.min.js` for a MediaWiki personal JavaScript page.
- `vg_stub_creator.user.js` for a userscript manager. Its generated metadata
  matches English and Chinese Wikipedia.

### MediaWiki user page

Open `Special:MyPage/common.js` on a supported wiki, paste the complete
contents of `dist/vg-stub-creator/vg_stub_creator.min.js`, and publish the
page. Use [Meta-Wiki's `Special:MyPage/global.js`][1] to load it across
Wikimedia projects where the account is active.

After publishing, bypass the browser cache or perform a hard refresh.

### Userscript manager

Create a script in a userscript manager, replace its editor contents with
`dist/vg-stub-creator/vg_stub_creator.user.js`, and save it. Keep the generated
metadata header intact.

After either installation, use the page action on English or Chinese Wikipedia.
Review the generated article and every related operation before confirming a
save.

## Features

VG Stub Creator:

- imports article metadata from English Wikipedia and Wikidata;
- collects localized names from source pages, Wikidata, and Steam;
- builds citations from article sources and manually entered URLs;
- normalizes terminology for companies, genres, platforms, series, and years;
- generates reviewable Chinese Wikipedia article wikitext;
- resolves categories, redirects, navboxes, and stub tags before saving;
- previews related page, talk-page, and Wikidata operations;
- records resumable save progress for partial failures; and
- preserves form history for restoring or comparing earlier drafts.

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

Tests use local fixtures and mocked external services. Do not verify editing,
page moves, or Wikidata updates against production.

See the [development guide][2] for terminology, data-normalization, source, and
fixture guidance.

## Architecture

Dependencies flow downward from the browser entry point. The package entry
point remains side-effect free:

```text
browser.ts
└── main.ts
    ├── ui
    ├── workflows
    ├── domain
    ├── infra
    └── shared

index.ts
```

- `index.ts` is the side-effect-free package entry point.
- `browser.ts` invokes the browser composition root.
- `main.ts` wires UI, workflows, domain services, and external adapters.
- `ui/dialogs/` keeps each Codex dialog in a template, state-asset, and scoped
  style trio.
- `ui/` owns the assembled Codex interface, previews, and browser state.
- `workflows/` coordinates import, review, pre-save, and save workflows.
- `domain/` contains normalized article records, citation rules, and wikitext
  rendering.
- `infra/` isolates MediaWiki, Wikidata, storage, and source adapters,
  including citation fallback requests.
- `config/` contains typed terminology data.
- `i18n/` stores flat JSON locale catalogs behind a typed registry.
- `../shared/` supplies raw Citoid acquisition and generic wikitext primitives.

See the package [changelog][3], its scoped [AGENTS.md][4], and the repository
[AGENTS.md][5] for architecture, safety, versioning, and verification rules.

## License

VG Stub Creator is licensed under [CC BY-SA 4.0][6]. The repository license
notice is in [LICENSE][7].

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: docs/DEVELOPMENT.md
[3]: CHANGELOG.md
[4]: AGENTS.md
[5]: ../../AGENTS.md
[6]: https://creativecommons.org/licenses/by-sa/4.0/
[7]: ../../LICENSE
