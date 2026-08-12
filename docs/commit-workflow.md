# Commit Workflow

Use this workflow when a completed repository change is ready to record.

## Prepare the Commit

1. Inspect the complete staged and unstaged diff.
2. Keep the commit focused on one cohesive change. Separate unrelated generated
   output, dependency, formatting, and feature changes when they have
   independent purposes.
3. Run `npm run verify` for material or project-level work. While iterating,
   use the focused commands in the [development workflow][1]. Apply every
   relevant package `AGENTS.md` requirement.
4. If dependencies changed, confirm the manifests and tracked
   `package-lock.json` describe the same workspace graph.
5. Stage only the intended files, then run `git diff --cached --check` and
   review `git diff --cached`.

## Write the Message

- Follow [Conventional Commits 1.0.0][2].
- Format the first line as `<type>[optional scope]: <description>`.
- Use a short package or subsystem scope when it improves clarity.
- Use a lowercase type such as `feat`, `fix`, `docs`, `refactor`, `test`,
  `build`, `ci`, `perf`, `style`, `chore`, or `revert`.
- Mark a breaking change with `!` before the colon or a
  `BREAKING CHANGE: <description>` footer.

## Confirm the Result

1. Inspect the recorded commit, its message, and its file summary.
2. Confirm the worktree contains only intentionally deferred changes.
3. Do not rewrite or discard unrelated user changes while cleaning the tree.

[1]: development-workflow.md
[2]: https://www.conventionalcommits.org/en/v1.0.0/
