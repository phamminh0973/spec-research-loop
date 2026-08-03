---
name: create-branch
description: Use when creating, naming, or validating SpecResearch Loop Git branches under the Conventional Branch prefixes feature/, bugfix/, hotfix/, release/, and chore/.
---

# Create Branch

Create SpecResearch Loop branches with outcome-based Conventional Branch names. Branch names describe the technical change, not the product backlog item (PBI). Keep PBI traceability in PR metadata and implementation evidence.

## Branch Format

```text
<type>/<description>
```

Use these prefixes only:

| Type | Use for |
|---|---|
| `feature/` | New capabilities or enhancements |
| `bugfix/` | Bug fixes |
| `hotfix/` | Urgent production fixes |
| `release/` | Release preparation, such as `release/v1.2.0` |
| `chore/` | Docs, config, dependencies, and repo maintenance |

Default to `feature/` when the request is unclear. Do not use aliases such as `feat/` or `fix/` in this repo.

## Naming Rules

- Description is lowercase kebab-case.
- Use 2 to 5 descriptive words when possible.
- Allowed characters are `a-z`, `0-9`, `-`; dots are allowed only for `release/` versions.
- No spaces, underscores, uppercase letters, special characters, repeated separators, or leading/trailing separators.
- Keep the full branch name concise, ideally under 50 characters.

Good:

```text
feature/add-document-upload
bugfix/fix-worker-ocr-timeout
chore/update-agent-skills
release/v1.2.0
```

Avoid:

```text
feature/pb-01-upload-document
feature/pbi-23-celery
feature/fix-bug
fix/header_bug
```

If the user gives a PBI, use it to understand scope, then remove it from the branch name. Example: "PB-01 upload document" becomes `feature/add-document-upload`.

## Repository Policy

- Default branch is `main`.
- Do not create a branch from dirty state when there are staged changes. Stop and report the staged paths first.
- Unstaged or untracked user changes are not yours to clean up. Do not overwrite, stash, reset, or move them unless the user explicitly asks.
- Do not run `git pull` unless the user explicitly authorizes network/update behavior.
- Do not switch away from the current branch if doing so would overwrite local changes.

## Workflow

### 1. Inspect State

```bash
git status --short
git branch --show-current
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||'
```

Use `main` as the base when remote default detection is unavailable.

If staged changes exist, stop before creating a branch. Explain that this repository does not create branches from staged dirty state.

### 2. Choose the Name

Derive the branch from the desired outcome:

- capability added: `feature/add-document-upload`
- bug corrected: `bugfix/fix-worker-ocr-timeout`
- workflow/docs/config update: `chore/update-agent-skills`

Normalize silently: lowercase, convert spaces to hyphens, remove PBI IDs, collapse repeated hyphens, and strip leading/trailing hyphens.

### 3. Create the Branch

Do not pull automatically. Create from the current checkout or from `main` only when safe:

```bash
git switch main
git switch -c <type>/<description>
```

If switching to `main` is unsafe because of local changes, stop and tell the user exactly what blocks branch creation.

### 4. Confirm

Report:

- branch name created;
- base branch used;
- whether any uncommitted changes were present and left untouched;
- next command when ready to publish: `git push -u origin <branch-name>`.

## Relationship to Commits and PRs

Branch type usually aligns with the dominant Conventional Commit type:

| Branch | Typical commit |
|---|---|
| `feature/add-document-upload` | `feat(web): add document upload` |
| `bugfix/fix-worker-ocr-timeout` | `fix(worker): handle ocr timeout` |
| `chore/update-agent-skills` | `chore: update agent skills` |

PBI identifiers do not belong in branch names by default. Put them in the PR title/body when the branch implements a PBI.
