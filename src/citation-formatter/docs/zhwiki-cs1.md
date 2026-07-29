# Chinese Wikipedia CS1 Maintenance

Use the shared [CS1 data maintenance guide][1] for TemplateData comparison
requests, Lua review, and diff checks. This file records the Chinese Wikipedia
sources and interpretation rules.

Last live HTTPS review: 2026-07-26.

## Authoritative sources

- [TemplateData API help][2]
- [CS1 implementation][3]
- [Parameter whitelist][4]
- [Date rules][5]

Use `CS1_LANGUAGE=zh` with the shared download commands.

## TemplateData destination

Citation Formatter uses the committed English TemplateData snapshot for form
layout and adds zhwiki-specific validation in `domain/validation/zhwiki.ts`.
Treat a zhwiki download as a comparison snapshot: review its title, order, and
alias differences before changing shared form metadata.

When a zhwiki alias or accepted parameter is intentionally absent from English
TemplateData, add it to `additionalParameters` in
`domain/validation/zhwiki.ts`; do not add it to generated English data.
Numbered aliases belong in that file's `numberedParameters`, with `#` replacing
each digit sequence.

## Whitelist and date semantics

Compare the downloaded Lua sources with `domain/validation/zhwiki.ts` and
`domain/source-validation.ts`.

- `true` and `false` whitelist entries are both recognized parameters; `false`
  marks deprecated forms. `nil` is unsupported.
- The CS1 module checks exact basic names, then replaces every digit sequence
  with `#` and checks its numbered table.
- Zhwiki retains local and legacy forms absent from English TemplateData,
  including compact archive, display, DOI, transliteration, and tracking
  aliases.
- Accepted Chinese date forms include `YYYY年`, `YYYY年M月`, and
  `YYYY年M月D日`, alongside common ISO and English forms. `n.d.` and `nd` are
  accepted only by the general `date` parameter.

The local validator is conservative UI feedback, not a complete Lua port. The
live zhwiki CS1 modules remain authoritative for complex ranges, deprecated
combinations, and parameter interactions.

Zhwiki's live validation also runs its installed Error, Language, Links, and
People child modules, and returns localized error and maintenance messages
through the shared **Check CS1 issues** workflow.

[1]: cs1-maintenance.md
[2]: https://zh.wikipedia.org/w/api.php?action=help&modules=templatedata
[3]: https://zh.wikipedia.org/wiki/Module:Citation/CS1
[4]: https://zh.wikipedia.org/wiki/Module:Citation/CS1/Whitelist
[5]: https://zh.wikipedia.org/wiki/Module:Citation/CS1/Date_validation
