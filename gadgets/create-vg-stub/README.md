# create-vg-stub

MediaWiki gadget template for quickly creating a video game stub on the
Chinese Wikipedia.

The dialog can also fetch source metadata through the MediaWiki Citoid REST API
from a URL and generate a `{{cite ...}}` template for the stub reference.

## Scripts

- `npm run check` validates the gadget entry file syntax.
- `npm run build` reads `src/index.js` and writes the files in `dist/`.
