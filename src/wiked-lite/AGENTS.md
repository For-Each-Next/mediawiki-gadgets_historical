# wikEd Lite Instructions

These instructions apply to `src/wiked-lite/` together with the repository
instructions.

## Safety and compatibility

- Keep the native MediaWiki textarea as the submitted source of truth. Mirror
  editor changes into it immediately and restore it when the enhanced surface
  is removed.
- Treat article wikitext as untrusted text. Build highlighted and tooltip DOM
  with text nodes; never inject article text as HTML.
- Keep formatting deterministic and protect comments plus literal extension
  tags. Network-backed link checks must be optional and must not block editing.

## Architecture

- Keep parsing and formatting in `domain/`, MediaWiki API access in
  `adapters/`, runtime boundaries in `contracts/`, and editor/dialog rendering
  in `ui/`.
- Create logging and native notification adapters in `main.ts`; inject them
  through the editor contract instead of calling `console` or `mw.notify`
  directly.
- Keep `main.ts` as the composition root and `browser.ts` as the only browser
  entry that invokes `start`.
- Preserve Cacycle's authorship credit in package metadata, documentation, and
  distributable userscript metadata.
