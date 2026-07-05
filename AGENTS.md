# Project Instructions

## Commit Style

- Use Conventional Commits for commit messages, for example `feat: add source cache`, `fix: handle empty article title`, or `chore: bump gadget version`.
- Keep commits atomic when practical: each commit should contain one coherent behavior change, fix, refactor, or maintenance update.
- Do not mix unrelated formatting, generated output, dependency changes, and feature code in the same commit unless they are required for the same change.

## Version Updates

- When updating a released gadget or userscript, increment the relevant version tag in the same atomic change.
- Use a single patch-level increment unless the user asks for a different release type, for example `3.1.154` to `3.1.155`.
- Keep package metadata, generated userscript metadata, and tests that assert version output consistent with the new version.
