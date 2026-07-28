# VG Page Assessor

VG Page Assessor is a Chinese Wikipedia helper for assessing video-game
articles. It adds a localized toolbox action that updates talk-page assessment
banners and can register eligible articles on
`WikiProject:电子游戏/新进条目`.

> **Status:** Version 0.1.0 is in early development and has known bugs. The
> tool writes to live wiki pages, so review its wikitext and change previews
> carefully before saving.

## Install and use

Build the package from the repository root:

```sh
npm run build -w vg-page-assessor
```

This creates two ignored artifacts in `dist/vg-page-assessor/`:

- `vg_page_assessor.min.js` for a MediaWiki gadget or on-wiki user script.
- `vg_page_assessor.user.js` for a userscript manager; its generated metadata
  matches `https://zh.wikipedia.org/*`.

Publish or install the appropriate artifact using the normal workflow for the
target gadget, user-script page, or userscript manager. A separately hosted
[minified copy][1] is available, but it may lag behind this
repository.

After loading the script on Chinese Wikipedia, open the localized VG Page
Assessor action from the page toolbox. Select the assessment values, inspect
the talk-page and new-page-list previews, and save only after confirming the
proposed changes.

## Development

The repository requires Node.js 22.18 or later. From the repository root, run:

```sh
npm install
npm run check
npm run build -w vg-page-assessor
```

## Source

- `index.ts`: browser bundle entry point.
- `domain/assessment.ts`: talk-page assessment rules and wikitext.
- `app/new-page-list.ts`: new-page-list parsing and registration.
- `infra/`: MediaWiki API and diagnostic logging.
- `config/project-config.ts`: WikiProject configuration.
- `i18n/`: English, Simplified Chinese, and Traditional Chinese messages.
- `ui/`: dialog, previews, save flow, styles, and browser activation.

See [HISTORY.md][2] for release history. Package-specific development rules are
in [AGENTS.md][3], with repository-wide contribution and release rules in the
root [AGENTS.md][4].

## License

VG Page Assessor is licensed under
[Creative Commons Attribution-ShareAlike 4.0 International][5].

[1]: https://meta.wikimedia.org/wiki/User:For_Each_..._Next/global.js/vg_page_assessor.js
[2]: HISTORY.md
[3]: AGENTS.md
[4]: ../../AGENTS.md
[5]: https://creativecommons.org/licenses/by-sa/4.0/
