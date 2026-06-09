# create-vg-stub

MediaWiki gadget template for quickly creating a video game stub on the
Chinese Wikipedia.

## Features

- Generates nearly complete wikified stub text, from `{{NoteTA}}` at the top to
  stub tags at the bottom.
- Makes it easy to copy and adapt information from English Wikipedia.
- Easily generates citations from source URLs.
- Automatically links the page to Wikidata and creates redirects.

## Installation

Run `npm run build`, then copy the contents of `dist/create_vg_stub.js` to your
MediaWiki user JavaScript page.

Alternatively, install `dist/create_vg_stub.user.js` in Tampermonkey.

## Usage

1. Open an English Wikipedia article about a video game. A recently released
   title with a Metacritic Metascore and an OpenCritic critics-recommend
   percentage is recommended.
2. Enter the English title and both review scores. For a Japanese title, also
   enter its Japanese name and use its romanized name as the default sort key.
3. Copy the basic information from the English Wikipedia article's infobox.
4. Paste the Steam store link when one is available, then review and adjust the
   fetched names.
5. When time permits, look for an unofficial Chinese translation using the
   [Google Programmable Search Engine](https://cse.google.com/cse?cx=25f8f2342cbfa4e46)
   maintained by Chinese Wikipedia's video game topic community.
6. Review the categories, proposed page title, and redirects.
7. Submit the page.
