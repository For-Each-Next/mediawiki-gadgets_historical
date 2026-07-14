---
应用: 始终
---

# Project Workflow

- Use Conventional Commits, such as `feat: add source cache`,
  `fix: handle empty article title`, or `chore: bump gadget version`.
- Keep commits atomic when practical. Each commit should contain one coherent
  behavior change, fix, refactor, or maintenance update.
- Do not mix unrelated formatting, generated output, dependency changes, and
  feature code unless they are required for the same change.
- When updating a released gadget or userscript, increment its version in the
  same atomic change.
- Use one patch-level version increment unless the user requests another
  release type.
- Keep package metadata, generated userscript metadata, and version assertions
  in tests consistent.
- Prefer code that is explicit, simple, and flat.
- Prefer guard clauses, early returns, and small named helpers over deeply
  nested control flow.
