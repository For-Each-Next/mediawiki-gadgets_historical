# History

## Until 0.5

### 0.4.33-post.1 (2026-07-28 19:20 UTC)

Overview: This post-release build retains the current English-to-Chinese
Wikipedia workflow for assembling, reviewing, and saving video-game stub
articles and their related pages while consolidating package documentation and
release guidance.

- Added English and Chinese Wikipedia page actions with a cross-wiki creation
  handoff and title-conflict handling.
- Imported and normalized article metadata, localized names, and citations from
  English Wikipedia, Wikidata, Steam, and source URLs.
- Generated reviewable article text, categories, redirects, navboxes, stub
  tags, and follow-up edits for related pages and Wikidata.
- Localized the interface in English, Simplified Chinese, and Traditional
  Chinese and retained draft, history, preview, and save-progress workflows.
- Organized the TypeScript source into domain, application, infrastructure, and
  UI layers backed by shared citation and wikitext utilities.
- Established package-scoped engineering guidance, moved detailed development
  guidance under `docs/`, and kept the release history as a package entry
  document.
- Standardized package documentation on numbered reference-style links.
- Simplified gadget histories to use their overview paragraphs as the sole
  release summaries.
- Rebuilt the browser artifacts with a distinct post-release identifier after
  documentation maintenance.
