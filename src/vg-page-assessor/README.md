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

This package-only build writes one ignored artifact directly under `dist/`:

- `dist/vg_page_assessor.min.js` is the minified MediaWiki gadget.

A complete workspace build with `npm run build` writes every gadget's minified
file and `dist/00-mediawiki-gadgets.user.js`, the single Greasemonkey-
compatible userscript containing all gadgets. Run `npm run build:all-userscript`
to rebuild only `dist/00-mediawiki-gadgets.user.js` directly from the current
sources.

### MediaWiki user page

Open `Special:MyPage/common.js` on Chinese Wikipedia, paste the complete
contents of `dist/vg_page_assessor.min.js`, and publish the page. Personal
JavaScript pages must be enabled by the wiki; see MediaWiki's [personal-script
documentation][1].

After publishing, bypass the browser cache or perform a hard refresh.

### Userscript manager

Create a script in a Greasemonkey-compatible userscript manager, replace its
editor contents with `dist/00-mediawiki-gadgets.user.js`, and save it. Keep
the generated metadata header intact. This userscript contains every workspace
gadget; each one starts only on its declared sites.

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

The project-owned portions of VG Page Assessor 0.2.2 are dedicated under [CC0
1.0 Universal][5]. The package [license][6] fixes this release's scope and
preserves third-party terms. The repository [licensing map][7] covers the rest
of the workspace.

[1]: https://www.mediawiki.org/wiki/Manual:Interface/JavaScript
[2]: CHANGELOG.md
[3]: AGENTS.md
[4]: ../../AGENTS.md
[5]: https://creativecommons.org/publicdomain/zero/1.0/
[6]: LICENSE
[7]: ../../LICENSE
