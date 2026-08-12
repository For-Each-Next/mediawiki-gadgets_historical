# CS1 Data Maintenance

This guide defines the workflow shared by Citation Formatter's English and
Chinese Wikipedia metadata and validation refreshes. Read it together with the
site-specific guide:

- [English Wikipedia CS1 maintenance][1] describes the canonical English
  TemplateData snapshot and enwiki rules.
- [Chinese Wikipedia CS1 maintenance][2] describes the zhwiki comparison
  snapshot and local rules.

## Authority and safety

Use HTTPS for every request. Keep ad hoc downloads outside the package and
never redirect them over committed files. Do not scrape rendered template pages
for parameter metadata. The TemplateData API resolves redirects and returns
canonical titles, parameter order, aliases, and types as structured data.

The committed validators provide conservative, immediate editor feedback. Each
wiki's live CS1 Lua modules remain authoritative for complex date ranges,
deprecated combinations, class-specific restrictions, and parameter
interactions.

## Refresh English TemplateData

Run the authored-data updater from the repository root:

```shell
npm run update:template-data -w citation-formatter
```

The updater reads the supported set from `domain/templates.ts`, requests it in
bounded batches, rejects missing or incomplete responses, and then rewrites the
generated modules and index under `config/citation-template-data/generated/`.
Do not hand-edit those snapshots or duplicate the supported-title list in
documentation.

Review the complete generated diff for:

- missing, obsolete, or unexpectedly renamed template modules;
- canonical-title and parameter-order changes;
- removed or moved parameters;
- alias additions, removals, and ordering changes; and
- changes to parameters typed as dates.

Large removals usually indicate an incomplete or unexpected API response.

## Compare site TemplateData

Use a manual TemplateData request only to compare sites or troubleshoot the
updater. Set the language and titles according to the site-specific guide. This
abbreviated request shows every required API option:

```sh
CS1_LANGUAGE=zh
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

Verify that the response includes every requested page, resolves each expected
canonical title, and reports no missing title. Compare `paramOrder`, all
canonical parameters and aliases, and parameters whose TemplateData type is
`date`.

Never copy a manual response over generated English data. Rerun the updater for
English changes. Apply intentional site differences only at the destination
defined by the relevant site guide.

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

## Finish and verify

After updating authored data or rules:

1. Add focused tests under `tests/citation-formatter/`.
2. Inspect the complete data and site-rule diffs, especially unexpected
   removals, canonical titles, parameter order, aliases, and date fields.
3. Follow the package [verification and release instructions][3], including
   artifact-header inspection when a build is required.

[1]: enwiki-cs1.md
[2]: zhwiki-cs1.md
[3]: ../AGENTS.md
