# Development Workflow

This guide covers repository setup, local checks, builds, and safe integration
testing. Use each gadget README for its focused commands and behavior.

## Set Up the Workspace

Use Node.js 24.14.1 or newer and install the exact dependency graph recorded in
the tracked lockfile:

```shell
npm ci
```

Use `npm install` only when intentionally changing dependencies and committing
the resulting manifest and lockfile changes together.

## Choose a Verification Command

Run the full handoff gate for project-level or material completed work:

```shell
npm run verify
```

`verify` runs the complete authored-source checks and isolated reproducibility
build. Its principal commands are:

- `npm run check` checks packages, repository contracts, types, lint, tests,
  formatting, and authored Markdown.
- `npm run check:repository` runs the coordinated metadata, structure,
  dependency, documentation, lockfile, licensing, and build-contract checks.
- `npm run build:verify` builds twice with a fixed timestamp in temporary
  output roots and requires byte-identical artifacts.

While iterating on one gadget, use its exact package commands:

```shell
npm run check -w <gadget-name>
npm test -w <gadget-name>
npm run build -w <gadget-name>
```

Run `npm test` for all repository and package tests. Run `npm run build` to
write all MediaWiki artifacts and the aggregate userscript under `dist/`. Those
local outputs are ignored verification products; building them alone does not
select or publish a release version.

## Use Fixtures for External Systems

Automated checks must not edit a wiki, move a page, update Wikidata, or depend
on a live external service. Use committed fixtures and mocked adapters for
MediaWiki reads and writes, Citoid, archive services, storefronts, and other
network integrations.

Some browser behavior performs optional live reads, such as TemplateData,
namespace siteinfo, redirects, and missing-page checks. Test its success,
failure, and fallback behavior locally through mocks. Exercise a live service
manually only when its focused gadget guide calls for it, and never perform a
write without the gadget's review and confirmation path.

The Citation Formatter metadata refresh command intentionally reads English
Wikipedia's live TemplateData API:

```shell
npm run update:template-data -w citation-formatter
```

Review generated data and third-party provenance before committing it.

## Review Dialog Layouts

The browser UI gate mounts the production Vue component factories with the same
build-injected templates and styles used by gadget builds. It uses
deterministic fixtures, blocks live dependencies, and checks every discovered
dialog at wide, narrow, and mobile viewport sizes:

```shell
npx playwright install chromium
npm run test:ui
```

Failures retain a screenshot and browser trace below `.cache/playwright/`.
These artifacts are ignored and uploaded by CI only when verification fails.

For a manual before-and-after visual review, capture the committed `HEAD`
version before capturing the working tree:

```shell
npm run ui:capture -- before
npm run ui:capture -- after
npm run ui:capture -- report
```

Matching captures are stored under `.cache/ui-visual/before/` and
`.cache/ui-visual/after/`. The report is written to
`.cache/ui-visual/report/index.html`, with a text summary beside it. These
review images are intentionally not pixel goldens and are never committed.

## Finish a Change

For a package change, update its changelog as required by the [release
workflow][1]. A shared or build-system change can affect every gadget, so run
their builds and review their artifact contracts. For a project-level change,
run the complete `verify` command.

Finally inspect:

```shell
git diff --check
git diff
git status --short --branch
```

Follow the [commit workflow][2] only after the intended diff and verification
results are clear. Do not change versions or licensing scopes merely because a
local verification build was run.

[1]: release-workflow.md
[2]: commit-workflow.md
