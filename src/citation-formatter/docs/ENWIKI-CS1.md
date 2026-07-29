# English Wikipedia CS1 Maintenance

Use the shared [CS1 data maintenance guide][1] for the title checklist, safe
download commands, Lua review, live-validation behavior, and verification
procedure. This file records the English Wikipedia sources and interpretation
rules.

Last live HTTPS review: 2026-07-26.

## Authoritative sources

- [TemplateData API][2]
- [Supported templates][3]
- [CS1 implementation][4]
- [Parameter whitelist][5]
- [Date rules][6]

Use `CS1_LANGUAGE=en` with the shared download commands.

## TemplateData destination

English TemplateData is the formatter's committed source for shared form
layout. After applying the shared preservation checks, regenerate the matching
module under `domain/data/`. Update its index only when the supported title set
changes.

Review generated diffs especially carefully for title casing, deleted or moved
parameters, and alias changes.

## Whitelist and date semantics

Compare the downloaded Lua sources with `domain/validation/enwiki.ts` and
`domain/source-validation.ts`.

- `true` is supported, `false` is supported but deprecated, `tracked` is
  supported and tracked, and `nil` is unsupported.
- For numbered creator parameters, CS1 replaces every digit sequence with `#`
  before checking the numbered whitelist. The validator must not impose the
  finite slot count present in TemplateData.
- Preprint classes such as arXiv, bioRxiv, CiteSeerX, medRxiv, and SSRN use
  restricted parameter sets. CS1 remains authoritative for class-specific
  combinations.
- Several citation classes add unique parameters beyond the shared basic table.

The local date validator intentionally recognizes only clear, common CS1 forms
for immediate editor feedback. It permits `n.d.` and `nd` only for `date`. Live
template and module validation remains authoritative for complex ranges and
unusual date syntax.

[1]: CS1-MAINTENANCE.md
[2]: https://en.wikipedia.org/w/api.php?action=templatedata
[3]: https://en.wikipedia.org/wiki/Template:Citation_Style_documentation/cs1
[4]: https://en.wikipedia.org/wiki/Module:Citation/CS1
[5]: https://en.wikipedia.org/wiki/Module:Citation/CS1/Whitelist
[6]: https://en.wikipedia.org/wiki/Module:Citation/CS1/Date_validation
