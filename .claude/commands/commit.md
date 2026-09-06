---
description: Stage and commit changes with a feature-scoped, emoji conventional-commit message
argument-hint: [type] [description]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(cat .specify/feature.json)
---

## Context

- Current branch: !`git branch --show-current`
- Active spec-kit feature (if any): !`cat .specify/feature.json 2>/dev/null || echo "none"`
- Git status: !`git status --porcelain=v1`
- Unstaged/staged diff stat: !`git diff HEAD --stat`

## Your task

Stage the relevant changes and create one commit whose message follows exactly this format:

```
<feature-slug> <emoji> <type>: <description>
```

Example (from this project): `001-project-setup-local-dev 🧹 chore: project init setup`

### 1. Determine `<feature-slug>`

- Use the current git branch name if it looks like a spec-kit feature slug (matches
  `NNN-kebab-name` or `YYYYMMDD-HHMMSS-kebab-name`, per `.specify/init-options.json`'s
  `feature_numbering`).
- If the branch doesn't match that shape (e.g. `main`), omit the `<feature-slug>` token and
  emoji/type start the message instead.
- `.specify/feature.json`'s `feature_directory` is a fallback source for the slug (its basename)
  if the branch name is ambiguous.

### 2. Determine `<type>` and `<description>`

- Parse `$ARGUMENTS`. Accepted forms: `type: description`, `type description`, or just
  `description` (infer `<type>`).
- If `$ARGUMENTS` is empty, infer both from the diff — look at what actually changed, don't
  guess generically.
- `<type>` must be one of: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`,
  `ci`, `build`.

### 3. Map `<type>` to `<emoji>`

| type | emoji |
|---|---|
| feat | ✨ |
| fix | 🐛 |
| chore | 🧹 |
| docs | 📝 |
| refactor | ♻️ |
| test | ✅ |
| style | 🎨 |
| perf | ⚡ |
| ci | 👷 |
| build | 📦 |

### 4. Stage and commit

- Review `git status`/`git diff` output above before staging. Stage specific paths — do not use
  `git add -A` or `git add .` blindly. Never stage `.env`, credentials, or other secret-looking
  files; if something suspicious is staged, stop and flag it instead of committing.
- If there is nothing to commit, say so and stop — do not create an empty commit.
- Commit using a heredoc so the message is passed exactly, e.g.:

  ```sh
  git commit -m "$(cat <<'EOF'
  001-project-setup-local-dev 🧹 chore: project init setup
  EOF
  )"
  ```

- Never use `--no-verify`, `--amend` (unless explicitly asked), or force flags.
- After committing, run `git log -1 --stat` and `git status` to confirm and show the result.
