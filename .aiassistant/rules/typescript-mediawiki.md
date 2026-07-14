---
应用: 始终
---

# TypeScript And MediaWiki

- Use `.ts` extensions for source, tests, scripts, and supported configuration
  modules. Use explicit `.ts` suffixes in local imports.
- Store authored runtime data in typed `.ts` modules instead of JSON or JSONC
  files. Reserve `.d.ts` files for declarations without runtime values.
- Lint `.d.ts` files with the TypeScript-aware ESLint parser.
- Keep TypeScript imports erasable when they are type-only by using
  `import type`.
- Use the global declarations from `types-mediawiki` for `mw` and MediaWiki
  API clients.
- Do not import `types-mediawiki` at runtime or allow it into gadget bundles.
- Use API parameter types from `types-mediawiki/api_params` when a request
  object has a corresponding exported type.
- Keep `tsconfig.json` in `noEmit` mode. Builds are produced by esbuild, not
  TypeScript.
- Use the newest TypeScript syntax supported by the installed compiler. Keep
  the standardized authored environment at ES2025 unless the project adopts
  a newer published ECMAScript edition.
- Set the browser JavaScript target in esbuild. Do not treat TypeScript's
  `target` option as the gadget output pipeline.
- Keep executable TypeScript scripts compatible with Node's type-stripping
  runtime, or introduce an explicit TypeScript runtime before using syntax
  that requires JavaScript generation.
- Preserve the existing MediaWiki globals and injected esbuild define values.
- Do not weaken types with `any` when a stable local interface, DOM type, or
  MediaWiki declaration can describe the value.
- Do not use jQuery or OOUI in authored source.
