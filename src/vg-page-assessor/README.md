# VG Page Assessor

VG Page Assessor is a Chinese Wikipedia helper for assessing video-game
articles. It adds a localized toolbox action that updates talk-page assessment
banners and can register eligible articles on the WikiProject new-page list.

> **Status:** VG Page Assessor is early-development software with known bugs.
> It writes to live wiki pages, so review every wikitext and change preview
> carefully before saving.

## Run

Build the package from the repository root:

```shell
npm run build -w vg-page-assessor
```

This writes three ignored artifacts directly to `dist/`:

- `vg_page_assessor.js` is the formatted, human-readable version.
- `vg_page_assessor.min.js` is the minified version.
- `vg_page_assessor.user.js` is the Greasemonkey-compatible version.

### MediaWiki user page

Open `Special:MyPage/common.js` on Chinese Wikipedia, paste the complete
contents of `dist/vg_page_assessor.min.js`, and publish the page. Personal
JavaScript pages must be enabled by the wiki; see MediaWiki's [personal-script
documentation][1].

After publishing, bypass the browser cache or perform a hard refresh.

### Userscript manager

Create a script in a Greasemonkey-compatible userscript manager, replace its
editor contents with `dist/vg_page_assessor.user.js`, and save it. Keep the
generated metadata header intact.

After either installation, open an eligible article on Chinese Wikipedia and
choose VG Page Assessor from the page toolbox. Select the assessment values,
inspect the talk-page and new-page-list previews, and save only after
confirming the proposed changes.

## Features

VG Page Assessor:

- reads the subject page, resolves redirects and creation dates, and loads its
  associated talk page;
- manages nine assessment classes, five importance levels, six task forces,
  four maintenance flags, and six related-project banners;
- recognizes configured banner aliases while preserving unmanaged lead content
  and unrelated projects inside a banner shell;
- presents editable, exact talk-page lead wikitext and edit summaries beside
  the current source before saving;
- uses timestamp-protected writes, skips no-op changes, and refetches and
  reapplies reviewed changes only for confirmed edit conflicts;
- detects pages that are already registered or outside the eligible age range;
- creates missing year and date groups, handles namespace subgroups, and orders
  same-day registrations by creation time;
- previews focused before-and-after new-page-list snippets with an editable
  edit summary; and
- opens promptly with progress for assessment and new-page-list loading,
  reports visible progress and failures for each requested save, and refreshes
  the completed page so its updated state is visible.

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

Tests use local fixtures and mocked MediaWiki clients for all save behavior.

## Architecture

Dependencies flow downward from the browser entry point. The package entry
point remains side-effect free:

```text
browser.ts
└── main.ts
    ├── ui/ -> contracts/, domain/, config/, i18n/
    ├── workflows/ -> contracts/, domain/
    ├── infra/ -> domain/
    └── config/ -> domain/

contracts/ -> domain/
i18n/ -> #shared/i18n
index.ts (side-effect-free package entry)
```

- `main.ts` composes UI, workflows, project configuration, and MediaWiki
  adapters. Only `browser.ts` invokes it; `index.ts` remains side-effect free.
- `ui/` presents Codex interactions, `workflows/` coordinates use cases,
  `infra/` accesses MediaWiki, and `domain/` holds deterministic rules.
  `contracts/`, `config/`, and `i18n/` provide their shared types, project
  settings, and localized text.

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
