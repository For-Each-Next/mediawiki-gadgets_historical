# CS1 Data Maintenance

This guide defines the workflow shared by Citation Formatter's English and
Chinese Wikipedia metadata and validation refreshes. Read it together with the
site-specific guide:

- [ENWIKI-CS1.md][1] describes the canonical English TemplateData snapshot and
  enwiki rules.
- [ZHWIKI-CS1.md][2] describes the zhwiki comparison snapshot and local rules.

## Authority and safety

Use HTTPS for every request and run downloads from a temporary directory,
rather than directly over committed files. Do not scrape rendered template
pages for parameter metadata. The TemplateData API resolves redirects and
returns the canonical title, `paramOrder`, parameter aliases, and parameter
types in one structured response.

The committed validators provide conservative, immediate editor feedback. Each
wiki's live CS1 Lua modules remain authoritative for complex date ranges,
deprecated combinations, class-specific restrictions, and parameter
interactions.

## Supported title checklist

Request and verify all 31 templates supported by the formatter:

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

The same list is defined in `domain/templates.ts`. The API, rather than a
rendered page or search result, determines whether a requested title exists or
redirects. A refresh is incomplete if the response:

- reports a missing title;
- resolves a request to an unexpected canonical template;
- omits a requested title; or
- contains fewer pages than requested.

## Download TemplateData

Set the language to `en` or `zh` according to the site-specific guide. Batch
the title list if putting all 31 titles on one command line is unwieldy. This
abbreviated request shows every required API option:

```sh
CS1_LANGUAGE=en
CS1_TITLES='Template:Citation|Template:Cite web|Template:Cite book'

curl --fail --location --silent --show-error \
  --get "https://${CS1_LANGUAGE}.wikipedia.org/w/api.php" \
  --data-urlencode 'action=templatedata' \
  --data-urlencode 'format=json' \
  --data-urlencode 'formatversion=2' \
  --data-urlencode 'redirects=1' \
  --data-urlencode 'includeMissingTitles=1' \
  --data-urlencode "titles=${CS1_TITLES}"
```

For every returned page:

1. Remove only the `Template:` namespace prefix from the canonical API title.
2. Preserve `paramOrder` exactly; it controls the standard editor row order.
3. Use `Object.keys(params)` only when `paramOrder` is absent.
4. Preserve every canonical parameter in `params`.
5. Preserve each parameter's `aliases` in API order.
6. Record parameters whose TemplateData `type` is `date` in `dateParams`.
7. Apply the destination rules from the relevant site-specific guide.

Review the complete diff for title casing, deleted or moved parameters, and
alias changes. Large removals usually indicate an incomplete API response.

## Review the Lua rules

With `CS1_LANGUAGE` still set for the target wiki, download the whitelist and
date-validation sources separately:

```sh
curl --fail --location --silent --show-error \
  --get "https://${CS1_LANGUAGE}.wikipedia.org/w/index.php" \
  --data-urlencode 'title=Module:Citation/CS1/Whitelist' \
  --data-urlencode 'action=raw'

curl --fail --location --silent --show-error \
  --get "https://${CS1_LANGUAGE}.wikipedia.org/w/index.php" \
  --data-urlencode 'title=Module:Citation/CS1/Date_validation' \
  --data-urlencode 'action=raw'
```

Compare them with the target file under `domain/validation/` and with
`domain/source-validation.ts`. Apply the whitelist and date semantics in the
site-specific guide.

## Understand live validation

When the user runs **Check CS1 issues** in Tools, the source manager submits
the current article source over HTTPS to the target wiki's read-only
`action=parse` API. The wiki's complete live CS1 suite returns error and
maintenance messages, which Citation Formatter displays as normal source-list
rows in a separate popup. Opening a result uses the normal citation editor and
maps applicable API errors to its fields.

Normal editing uses local static validation and makes no parse request.

## Finish and verify

After updating authored data or rules:

1. Add focused tests under `tests/citation-formatter/`.
2. Advance the package version under the repository release rules and update
   `CHANGELOG.md`.
3. Run `npm run check -w citation-formatter`.
4. Run `npm test -w citation-formatter`.
5. Run `npm run build -w citation-formatter`.
6. Inspect `git diff --check`, the generated userscript metadata, and the
   complete data and site-rule diffs before committing.

[1]: ENWIKI-CS1.md
[2]: ZHWIKI-CS1.md
