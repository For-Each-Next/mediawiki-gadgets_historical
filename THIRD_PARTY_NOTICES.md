# Third-Party Notices

These notices identify material that is not unqualifiedly covered by the
project's CC0 dedications. The root [licensing map][1] and package-local
notices define the controlling scope.

## Wikimedia project data

The following committed data was generated, extracted, or curated from
Wikimedia project APIs or wiki configuration:

- generated English Wikipedia TemplateData snapshot modules named
  `citation.ts`, `cite-*.ts`, or `index.ts` under
  `src/citation-formatter/config/citation-template-data/generated/`;
- English and Chinese Wikipedia namespace names and aliases in
  `src/shared/wiki-titles/index.ts`; and
- the TemplateData-style parameter order in
  `src/vg-stub-creator/domain/citations/data/cite-web.ts`.

Other configuration catalogs contain factual wiki identifiers, aliases, and
page titles. Any third-party rights in Wikimedia-hosted content remain under
the applicable Wikimedia project terms. The Wikimedia Terms of Use describe the
licenses and attribution methods for reused project content.[2]

## Wikimedia Codex icons

Citation Formatter and VG Stub Creator browser bundles include selected Codex
icon artwork and vector path data.

Creator and attribution: Wikimedia Foundation Design System Team and
contributors.

Source: [Codex icon overview][3].

License: [Creative Commons Attribution 4.0 International][4]. Selected icon
data is bundled and minified; the artwork is otherwise unmodified.

The `@wikimedia/codex-icons` package software is available under the following
MIT License:

```text
MIT License

Copyright (c) 2011-2022 Wikimedia Design & OOUI team and other contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Prior work and ideas

wikEd Lite preserves credit to Cacycle's public-domain wikEd work and
acknowledges Remember the dot's Syntax highlighter as an inspiration. Its
package README records those credits.

[1]: LICENSE
[2]: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
[3]: https://doc.wikimedia.org/codex/latest/icons/overview.html
[4]: https://creativecommons.org/licenses/by/4.0/
