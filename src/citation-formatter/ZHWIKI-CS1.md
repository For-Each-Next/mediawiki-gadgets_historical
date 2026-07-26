# Chinese Wikipedia CS1 data maintenance

This file records how Citation Formatter's Chinese Wikipedia citation metadata
and validation rules are checked and refreshed. It is intentionally independent
of the enwiki procedure in [ENWIKI-CS1.md](ENWIKI-CS1.md).

Last live HTTPS review: 2026-07-26.

## Authoritative sources

Use HTTPS for every request:

- TemplateData API:
  `https://zh.wikipedia.org/w/api.php?action=templatedata`
- CS1 implementation:
  `https://zh.wikipedia.org/wiki/Module:Citation/CS1`
- Parameter whitelist:
  `https://zh.wikipedia.org/wiki/Module:Citation/CS1/Whitelist`
- Date rules:
  `https://zh.wikipedia.org/wiki/Module:Citation/CS1/Date_validation`

Do not scrape rendered template pages for parameter metadata. The TemplateData
API resolves redirects and supplies the canonical title, `paramOrder`,
parameter aliases, and parameter types in one structured response.

Citation Formatter currently uses the committed English TemplateData snapshot
for form layout and adds zhwiki-specific validation from
`domain/validation/zhwiki.ts`. A zhwiki download is therefore a comparison
snapshot: review its title, order, and alias differences before changing
shared form metadata.

## Supported title checklist

Request the same 31 template names used by the formatter:

```text
Citation
Cite arXiv
Cite AV media
Cite AV media notes
Cite bioRxiv
Cite book
Cite CiteSeerX
Cite conference
Cite document
Cite encyclopedia
Cite episode
Cite interview
Cite journal
Cite magazine
Cite mailing list
Cite map
Cite medRxiv
Cite news
Cite newsgroup
Cite podcast
Cite press release
Cite report
Cite serial
Cite sign
Cite speech
Cite SSRN
Cite tech report
Cite thesis
Cite tweet
Cite web
Cite video game
```

The same list is defined in `domain/templates.ts`. The API, rather than the
rendered page or a search result, decides whether a requested name exists or
redirects. A refresh is incomplete if any title is missing, resolves
unexpectedly, or is absent from the response.

## Download procedure

Run requests from a temporary directory and batch titles when needed:

```sh
curl --fail --location --silent --show-error \
  --get 'https://zh.wikipedia.org/w/api.php' \
  --data-urlencode 'action=templatedata' \
  --data-urlencode 'format=json' \
  --data-urlencode 'formatversion=2' \
  --data-urlencode 'redirects=1' \
  --data-urlencode 'includeMissingTitles=1' \
  --data-urlencode 'titles=Template:Citation|Template:Cite web|Template:Cite book'
```

For every returned page, compare:

1. The canonical API title after removing only the `Template:` prefix.
2. The exact `paramOrder`, which defines standard form order.
3. Every canonical key in `params`.
4. Every alias in each parameter's `aliases` array, preserving API order.
5. Parameters with TemplateData `type: "date"`.

When a zhwiki alias or accepted parameter is intentionally absent from English
TemplateData, add it to `additionalParameters` in
`domain/validation/zhwiki.ts`. Do not add it to generated English data.
Numbered aliases belong in that file's `numberedParameters` using `#` in place
of each digit sequence.

## Rule review

Download the Lua sources separately over HTTPS:

```sh
curl --fail --location --silent --show-error \
  'https://zh.wikipedia.org/w/index.php?title=Module:Citation/CS1/Whitelist&action=raw'

curl --fail --location --silent --show-error \
  'https://zh.wikipedia.org/w/index.php?title=Module:Citation/CS1/Date_validation&action=raw'
```

Compare them with `domain/validation/zhwiki.ts` and
`domain/source-validation.ts`.

Important zhwiki behavior:

- `true` and `false` whitelist entries are both recognized parameters; `false`
  marks deprecated forms. `nil` is unsupported.
- The CS1 module checks exact basic names, then replaces digit sequences with
  `#` and checks its numbered table.
- Zhwiki retains local and legacy forms that are not present in English
  TemplateData, including compact archive, display, DOI, transliteration, and
  tracking aliases.
- Chinese dates include `YYYY年`, `YYYY年M月`, and `YYYY年M月D日`, in addition
  to common ISO and English forms. `n.d.` and `nd` are accepted only by the
  general `date` parameter.

The local validator is conservative UI feedback, not a complete Lua port.
The live zhwiki CS1 modules remain authoritative for complex ranges,
deprecated combinations, and parameter interactions.

## Finish and verify

After updating authored data or rules:

1. Add focused tests under `tests/citation-formatter/`.
2. Increment the package patch version and version history.
3. Run `npm run check -w citation-formatter`.
4. Run `npm test -w citation-formatter`.
5. Run `npm run build -w citation-formatter`.
6. Inspect `git diff --check`, generated userscript metadata, and the complete
   site-rule diff before committing.
