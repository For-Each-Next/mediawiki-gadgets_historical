# VG Page Assessor

VG Page Assessor is a Chinese Wikipedia helper for assessing video-game
articles. It adds a localized toolbox action that updates talk-page assessment
banners and can register eligible articles on the WikiProject new-page list.

> **Status:** The 0.2 development line has known bugs. The tool writes to live
> wiki pages, so review every wikitext and change preview carefully before
> saving.

## Run

Build the package from the repository root:

```shell
npm run build -w vg-page-assessor
```

This writes two ignored artifacts to `dist/vg-page-assessor/`:

- `vg_page_assessor.min.js` for a MediaWiki personal JavaScript page.
- `vg_page_assessor.user.js` for a userscript manager. Its generated metadata
  matches Chinese Wikipedia.

### MediaWiki user page

Open `Special:MyPage/common.js` on Chinese Wikipedia, paste the complete
contents of `dist/vg-page-assessor/vg_page_assessor.min.js`, and publish the
page. Personal JavaScript pages must be enabled by the wiki; see MediaWiki's
[personal-script documentation][1].

After publishing, bypass the browser cache or perform a hard refresh.

### Userscript manager

Create a script in a userscript manager, replace its editor contents with
`dist/vg-page-assessor/vg_page_assessor.user.js`, and save it. Keep the
generated metadata header intact.

After either installation, open an eligible article on Chinese Wikipedia and
choose VG Page Assessor from the page toolbox. Select the assessment values,
inspect the talk-page and new-page-list previews, and save only after
confirming the proposed changes.

## Features

VG Page Assessor:

- reads the subject page and its associated talk page;
- preserves unmanaged talk-page lead content and project templates;
- prepares WikiProject Video games class, importance, task-force, and
  maintenance parameters;
- includes configured related-project banners;
- previews the exact talk-page wikitext before an explicit save;
- detects eligible new pages and their creation timestamps;
- prepares a date-ordered WikiProject new-page-list registration; and
- previews the list change before an explicit save.

The interface uses English, Simplified Chinese, or Traditional Chinese
according to the MediaWiki interface language.

## Development

The repository requires Node.js 22.18 or later. From the repository root, run:

```shell
npm install
npm run check -w vg-page-assessor
npm test -w vg-page-assessor
npm run build -w vg-page-assessor
```

Tests use local fixtures and mocked MediaWiki clients. Do not verify save
behavior against a production wiki.

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
- `main.ts` wires UI, workflows, MediaWiki adapters, and logging.
- `ui/` renders the dialog, previews, summaries, and user interactions.
- `workflows/` coordinates loading, preview preparation, and confirmed saves.
- `domain/` contains deterministic assessment and new-page-list rules.
- `infra/` isolates MediaWiki requests, response decoding, caching, and logs.
- `config/` contains project-specific titles and assessment options.
- `i18n/` contains type-checked interface catalogs.

See the package [changelog][2], its scoped [AGENTS.md][3], and the repository
[AGENTS.md][4] for architecture, safety, versioning, and verification rules.

## License

VG Page Assessor is licensed under [Creative Commons Attribution-ShareAlike 4.0
International][5]. The repository license notice is in [LICENSE][6].

[1]: https://www.mediawiki.org/wiki/Manual:Interface/JavaScript
[2]: CHANGELOG.md
[3]: AGENTS.md
[4]: ../../AGENTS.md
[5]: https://creativecommons.org/licenses/by-sa/4.0/
[6]: ../../LICENSE
