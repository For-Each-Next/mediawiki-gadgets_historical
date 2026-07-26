# English Wikipedia CS1 data maintenance

This file records how Citation Formatter's English Wikipedia citation metadata
and validation rules are checked and refreshed. It is intentionally independent
of the zhwiki procedure in [ZHWIKI-CS1.md](ZHWIKI-CS1.md).

Last live HTTPS review: 2026-07-26.

## Authoritative sources

Use HTTPS for every request:

- TemplateData API:
  `https://en.wikipedia.org/w/api.php?action=templatedata`
- Supported templates:
  `https://en.wikipedia.org/wiki/Template:Citation_Style_documentation/cs1`
- CS1 implementation:
  `https://en.wikipedia.org/wiki/Module:Citation/CS1`
- Parameter whitelist:
  `https://en.wikipedia.org/wiki/Module:Citation/CS1/Whitelist`
- Date rules:
  `https://en.wikipedia.org/wiki/Module:Citation/CS1/Date_validation`

Do not scrape rendered template pages for parameter metadata. The TemplateData
API resolves redirects and supplies the canonical title, `paramOrder`,
parameter aliases, and parameter types in one structured response.

## Supported title checklist

The requested and returned titles must be checked for all of these templates:

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

The same list is defined in `domain/templates.ts`. A refresh is incomplete if
the API reports a missing title, resolves a request to an unexpected template,
or returns fewer pages than requested.

## Download procedure

Run requests from a temporary directory, not directly over committed files.
Batch the titles if the command line becomes unwieldy. This example shows the
required API options:

```sh
curl --fail --location --silent --show-error \
  --get 'https://en.wikipedia.org/w/api.php' \
  --data-urlencode 'action=templatedata' \
  --data-urlencode 'format=json' \
  --data-urlencode 'formatversion=2' \
  --data-urlencode 'redirects=1' \
  --data-urlencode 'includeMissingTitles=1' \
  --data-urlencode 'titles=Template:Citation|Template:Cite web|Template:Cite book'
```

For every returned page:

1. Remove only the `Template:` namespace prefix from the canonical API title.
2. Preserve `paramOrder` exactly. It controls the standard editor row order.
3. Preserve every canonical parameter in `params`.
4. Preserve each parameter's `aliases` in API order.
5. Record parameters whose TemplateData `type` is `date` in `dateParams`.
6. Use `Object.keys(params)` only when `paramOrder` is absent.
7. Regenerate the matching module in `domain/data/` and the index only when
   the supported title set changes.

Review generated diffs for title casing, deleted parameters, moved parameters,
and alias changes. Large removals usually indicate an incomplete API response.

## Rule review

Download the Lua sources separately over HTTPS:

```sh
curl --fail --location --silent --show-error \
  'https://en.wikipedia.org/w/index.php?title=Module:Citation/CS1/Whitelist&action=raw'

curl --fail --location --silent --show-error \
  'https://en.wikipedia.org/w/index.php?title=Module:Citation/CS1/Date_validation&action=raw'
```

Compare them with `domain/validation/enwiki.ts` and
`domain/source-validation.ts`.

When the user runs **Check CS1 issues** in Tools, the source manager submits
the current article source over HTTPS to enwiki's read-only `action=parse`
API. This runs the complete live CS1 module suite and displays its error and
maintenance messages as normal source-list rows in a separate popup. Opening
a result uses the normal citation editor and maps applicable API errors to its
fields. Normal editing uses local static validation and makes no parse
request.

Important whitelist semantics:

- `true` is supported, `false` is supported but deprecated, `tracked` is
  supported and tracked, and `nil` is unsupported.
- For numbered creator parameters, CS1 replaces every digit sequence with
  `#` before checking the numbered whitelist. The validator must not impose
  the finite slot count present in TemplateData.
- Preprint classes such as arXiv, bioRxiv, CiteSeerX, medRxiv, and SSRN use
  restricted parameter sets. CS1 itself remains authoritative for
  class-specific combinations.
- Several citation classes add unique parameters beyond the shared basic
  table.

The local date validator intentionally recognizes only clear, common CS1 forms
for immediate editor feedback. It permits `n.d.` and `nd` only for `date`.
Template/module validation remains authoritative for complex ranges and
unusual date syntax.

## Finish and verify

After updating authored data or rules:

1. Add focused tests under `tests/citation-formatter/`.
2. Increment the package patch version and version history.
3. Run `npm run check -w citation-formatter`.
4. Run `npm test -w citation-formatter`.
5. Run `npm run build -w citation-formatter`.
6. Inspect `git diff --check`, generated userscript metadata, and the complete
   data diff before committing.
