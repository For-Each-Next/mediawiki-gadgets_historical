# VG Page Assessor

VG Page Assessor is a Chinese Wikipedia helper for assessing video-game related pages. It adds a toolbox link named `VG Page Assessor`, updates talk-page assessment banners, and can register eligible pages on `WikiProject:电子游戏/新进条目`.

## Features

- Updates the talk-page lead assessment section.
- Supports class, importance, Video games task forces, and configured additional WikiProjects.
- Registers eligible pages on the video-game new-page list.

## Build

Run `npm run check`, `npm test`, and `npm run build` from this directory.

Generated files are written to `dist/vg-page-assessor/` as `vg_page_assessor.min.js` and `vg_page_assessor.user.js`.

You can get compressed code from <https://meta.wikimedia.org/wiki/User:For_Each_..._Next/global.js/vg_page_assessor.js>, but it may not update on time.

## Source

- `index.ts`: minimal browser bundle entry point.
- `domain/assessment.ts`: talk-page assessment rules and wikitext.
- `application/new-page-list.ts`: new-page-list registration use cases.
- `infrastructure/`: MediaWiki API and logging adapters.
- `config/project-config.ts`: WikiProject configuration.
- `presentation/`: dialog UI, styles, save flow, and browser activation.
