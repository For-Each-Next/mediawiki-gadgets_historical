# Commit Workflow

Use this workflow when a completed repository change is ready to record.

## Prepare the Commit

1. Inspect the complete staged and unstaged diff.
2. Keep the commit focused on one cohesive change. Separate unrelated
   formatting, generated output, dependencies, and features when they have
   independent purposes.
3. Run the verification required by `AGENTS.md` and any scoped package
   instructions.
4. Stage the intended files and inspect `git diff --cached --check`.

## Write the Message

- Follow [Conventional Commits 1.0.0][1].
- Format the first line as `<type>[optional scope]: <description>`.
- Use a short package or subsystem scope when it improves clarity.
- Use a lowercase type such as `feat`, `fix`, `docs`, `refactor`, `test`,
  `build`, `ci`, `perf`, `style`, `chore`, or `revert`.
- Mark a breaking change with `!` before the colon or a
  `BREAKING CHANGE: <description>` footer.

## Confirm the Result

1. Inspect the recorded commit and its file summary.
2. Confirm the worktree contains only intentionally deferred changes.

[1]: https://www.conventionalcommits.org/en/v1.0.0/
