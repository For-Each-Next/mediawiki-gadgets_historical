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
compatible userscript containing all gadgets. Run
`npm run build:all-userscript` to rebuild only
`dist/00-mediawiki-gadgets.user.js` directly from the current sources.

### MediaWiki user page

Open `Special:MyPage/common.js` on Chinese Wikipedia, paste the complete
contents of `dist/vg_page_assessor.min.js`, and publish the page. Personal
JavaScript pages must be enabled by the wiki; see MediaWiki's [personal-script
documentation][1].

After publishing, bypass the browser cache or perform a hard refresh.

### Userscript manager

Create a script in a Greasemonkey-compatible userscript manager, replace its
editor contents with `dist/00-mediawiki-gadgets.user.js`, and save it. Keep the
generated metadata header intact. This userscript contains every workspace
gadget; each one starts only on its declared sites.

After either installation, open an eligible article on Chinese Wikipedia and
choose VG Page Assessor from the page toolbox. Select the assessment values,
inspect the talk-page and new-page-list previews, and save only after
confirming the proposed changes.

## Features

VG Page Assessor:

- reads the subject page, resolves redirects and creation dates, and loads its
  associated talk page and WikiProject new-page log in one batched API query;
- manages nine localized assessment classes, five localized importance levels,
  six task forces, four maintenance flags, and related-project banners while
  retaining their English wikitext codes;
- initializes those controls from existing banners and recognizes configured
  aliases while preserving unmanaged lead content and unchanged nested banner
  source;
- adds checked controls named from unconfigured `WikiProject ...` and `...專題`
  templates already inside a banner shell;
- reflects recognizable manual source edits into the assessment controls and
  adds an exact final radio choice for a hidden or unconfigured class or
  importance value;
- applies subsequent control selections back to that current manual source
  while preserving recognizable unchanged wikitext where possible;
- presents one editable, exact talk-page lead source above a two-card Codex
  comparison that wraps long source, highlights changed words, and leaves
  context plain;
- uses timestamp-protected writes, skips no-op changes, and refetches and
  reapplies reviewed changes only for confirmed edit conflicts;
- labels new-page registration eligibility and shows no checkbox when a page is
  already registered or outside the eligible age range, and writes its edit
  summary in the interface language;
- creates missing year and date groups, handles namespace subgroups, and orders
  same-day registrations by creation time;
- previews focused new-page-list differences with aligned line and word changes
  plus an editable edit summary; and
- prepares assessment and new-page-list registration during the opening
  progress phase, then reports visible progress and failures for each requested
  save and refreshes the completed page so its updated state is visible.

The interface uses English, Simplified Chinese, or Traditional Chinese
according to the MediaWiki interface language.

## Development

The repository requires Node.js 24.14.1 or later. From the repository root,
run:

```shell
npm ci
npm run check -w vg-page-assessor
npm test -w vg-page-assessor
npm run build -w vg-page-assessor
```

Tests use local fixtures and mocked MediaWiki clients for all save behavior.
See the repository [development workflow][8] for the complete verification gate
and live-service policy.

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

The project-owned portions of VG Page Assessor 0.2.3-post.5 are dedicated under
[CC0 1.0 Universal][5]. The package [license][6] fixes this release's scope and
preserves third-party terms. The repository [licensing map][7] covers the rest
of the workspace.

[1]: https://www.mediawiki.org/wiki/Manual:Interface/JavaScript
[2]: CHANGELOG.md
[3]: AGENTS.md
[4]: ../../AGENTS.md
[5]: https://creativecommons.org/publicdomain/zero/1.0/
[6]: LICENSE
[7]: ../../LICENSE
[8]: ../../docs/development-workflow.md
