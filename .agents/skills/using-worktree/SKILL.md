---
name: using-worktree
description: Use when starting SpecResearch Loop feature work, isolated implementation, or plan execution that should avoid disturbing the current checkout.
---

# Using Worktree

Create an isolated Git worktree before SpecResearch Loop feature work or plan execution when the current checkout may contain unrelated changes, when work should be reviewable on its own branch, or when the user explicitly asks to use a worktree.

## Safety Rules

- Never overwrite, stash, reset, or move uncommitted user changes unless explicitly asked.
- If already inside a linked worktree, do not create another one by default.
- Use `.worktrees/<branch-name>` as the default location when no workspace-native worktree tool is available.
- Before creating `.worktrees/...`, verify `.worktrees/` is ignored. If not ignored, stop and report that `.gitignore` must be updated first.
- Do not run `git pull` or other network-update commands unless the user explicitly allows it.

## Repository Baseline

The full baseline gate is:

Inspect the package manifests and run only a baseline command that actually
exists. Until implementation tooling is present, record
`baseline: NOT AVAILABLE` rather than inventing a command.

## Workflow

### 1. Inspect Environment

```bash
git status --short
git branch --show-current
git rev-parse --git-dir
git rev-parse --git-common-dir
git check-ignore -q .worktrees/ && echo ignored
```

If `git rev-parse --git-dir` and `git rev-parse --git-common-dir` resolve to different directories, you are already in a linked worktree. Report that and continue in the current worktree unless the user asked for another one.

If `.worktrees/` is not ignored, stop before creating anything.

### 2. Choose Branch Name

Use `$create-branch` rules:

- branch name describes the technical outcome;
- default prefixes are `feature/`, `bugfix/`, `hotfix/`, `release/`, `chore/`;
- PBI IDs are not included in branch names by default.

Example: "PB-01 upload document" becomes `feature/add-document-upload`.

### 3. Create Worktree

Use the current `main` checkout as the base unless the user specified another safe base:

```bash
git worktree add -b <branch-name> .worktrees/<branch-name> main
```

If the branch already exists, use:

```bash
git worktree add .worktrees/<branch-name> <branch-name>
```

Do not delete an existing path to make room. Stop and report the collision.

### 4. Confirm

Report:

- worktree path;
- branch name;
- base used;
- baseline command and status: `PASS`, `FAIL`, `NOT RUN`, or `NOT AVAILABLE`;
- any uncommitted changes in the original checkout that were left untouched.
