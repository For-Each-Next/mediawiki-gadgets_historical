# Reference Names

Citation Formatter generates stable reference names from citation authors,
dates, source identities, and part locators. Structured HTML comments can
override one component or exclude a field without changing displayed citation
text.

## Name aliases

For a non-Latin author or organization name, an HTML comment beginning with `#`
supplies its reference-name form without changing the citation display:

```wikitext
| author = 宵崎奏<!-- # Yoisaki, Kanade -->
| publisher = セガ<!--# Sega -->
```

When a new source repeats a creator name with an alias used elsewhere in the
article, the source manager offers it as an `Auto-suggested value`. **Use**
copies it into the alias field; **Dismiss** hides it for the current draft.
Ignoring the suggestion also leaves the citation unchanged.

## Source identities

On a `url` field, the same comment supplies an explicit source-identity key.
The actual URL is the fallback key, so only continuation pages need to point
back to an unmarked base page:

```wikitext
| url = https://example.test/interview
| page = 1
```

```wikitext
| url = https://example.test/interview/2<!-- # /interview -->
| page = 2
```

The real links remain unchanged. Matching source keys suppress same-year letter
suffixes and allow page values to distinguish reference names.

## Exclusion directives

Add `!no-author` to a field's comment to exclude that field from the
author-fallback chain. It can share a comment with a reference-name override:

```wikitext
| website = 游民星空<!-- !no-author # Youmin Xingkong -->
```

The corresponding `!no-date` and `!no-part` directives exclude a field from the
reference name's date or part locator:

```wikitext
| publication-date = 2025-05-20<!-- !no-date -->
| time = 1:15:41<!-- !no-part -->
```
