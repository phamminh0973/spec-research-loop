---
name: open-pr
description: >
  Open or prepare a GitHub pull request from the current branch using repository rules and Git evidence. Use when the user asks to open, create, prepare, draft, or preview a PR with GitHub CLI. Inspect branch state and the base diff, detect duplicate PRs, run required validation, generate a Conventional Commit title and evidence-based body, create the PR only when authorized, and verify the created PR. Do not use for reviewing, merging, closing, or commenting on an existing PR.
---

# Open a GitHub pull request

Prepare and open a pull request whose title, description, and validation claims can be traced to the current branch, against the configured `origin` repository. Draft the title as a valid Conventional Commit header (≤100 chars, lowercase type/scope, imperative description, no emoji).

## Select the mode

- For `prepare` or `preview`, complete the workflow through the preview and do not change GitHub state.
- For `open` or `create`, create a ready PR only after all required validation passes.
- For an explicit draft request, allow incomplete or failed validation only when the body reports the exact status.
- If a PR already exists for the head branch, return it and stop. Do not create a duplicate or silently convert the task into an update.

## Run the workflow

### 1. Load repository policy

Read the applicable `AGENTS.md` files and any scoped rules (`.agents/rules/`) before inspecting the diff. Default branch is `main`.

Inspect package manifests and CI configuration to discover required gates. Run
only commands that actually exist. Until implementation tooling is present,
report unavailable checks as `NOT AVAILABLE`; do not invent a quality gate.

### 2. Inspect repository and branch state

Determine:

- authenticated GitHub identity and repository remote;
- default branch and current branch;
- upstream and remote head branch, if present;
- committed ahead count relative to the base;
- tracked, staged, and untracked working-tree changes.

Stop before preparing a PR when the current branch is the default branch or when `<base>..HEAD` contains no commits. Report uncommitted changes separately because they are not part of the PR evidence.

Do not push, commit, stage, switch branches, or edit application files unless the current user request explicitly authorizes that action. If the head branch is not available on the remote, report that push is required.

### 3. Detect an existing PR

Query GitHub for a pull request whose head is the current branch. Include open and closed states when practical so a closed or merged PR is not mistaken for an unused branch.

If one exists, return its number, state, and URL. Do not call `gh pr create`.

### 4. Build evidence from the scoped branch

Inspect only the branch range and merge-base diff:

```bash
git log <base>..HEAD
git diff --stat <base>...HEAD
git diff <base>...HEAD
```

Never use `git log --all` or unrelated branches as PR evidence. Group changes by behavior, workflow, or architectural layer rather than narrating every file. Do not include uncommitted changes in the title or body.

Warn about reviewability when the committed diff exceeds 20 non-generated files or 800 changed non-generated lines. Treat this as a warning, not a hard block. Recommend a draft when the scope is difficult to review, but do not split or rewrite the branch.

### 5. Run validation

Run every required gate from the repository policy in the current worktree. Record the command, exit code, and status as `PASS`, `FAIL`, or `NOT RUN`.

- Mark `PASS` only when the command exits with code 0 in the current run.
- Never infer validation from commits, CodeRabbit, merge status, prior output, or a successful build on another branch.
- Stop before creating a ready PR if a required gate fails or cannot run.
- Create a draft with failed or incomplete validation only when the user explicitly requested that outcome.

Do not fix validation failures unless the user also asked for a fix.

### 6. Draft the title and body

Write a concise Conventional Commit title based on the dominant outcome of the full branch. Do not copy the last commit blindly when the branch contains multiple commits.

If the branch implements one or more PBIs, include the PBI trace in the PR title
and body using explicit evidence from the request, branch notes, commits, or
diff. Do not infer PBI identifiers from the branch name. Branch names remain
outcome-based.

Recommended PBI title shape:

```text
feat(web): add document upload for PB-01
```

Use this minimum body contract:

```markdown
## Summary

[Describe the branch outcome in one short paragraph.]

## What changed

- [Group the important changes by behavior or layer.]

## Why

[Explain the problem and why this approach belongs in the current scope.]

## PBI Trace

- PB-01: [Only include when supported by explicit evidence.]

## Validation

- repository checks: PASS | FAIL | NOT RUN | NOT AVAILABLE
- PR title commitlint: PASS | FAIL | NOT RUN | NOT AVAILABLE
```

Omit `PBI Trace` when no PBI is explicitly tied to the branch.

Add `Risk / Impact`, `Follow-ups`, or `Screenshots` only when the diff provides a concrete reason. Do not claim "no regressions" without corresponding verification. Do not copy bot-generated release notes into the initial body.

### 7. Preview before mutation

Present the base branch, head branch, ready or draft status, title, complete body, validation results, uncommitted-change warning, and reviewability warning.

Stop after the preview for prepare-only requests. For an explicit open or create request, continue without asking the user to repeat the same authorization unless a new choice is required, such as permission to push or whether to create a draft after failed validation.

### 8. Create and verify

Write the approved body to a temporary file and use `gh pr create --body-file` to avoid quoting damage. Pass base, head, title, and draft status explicitly.

After creation, read the PR back with:

```bash
gh pr view --json number,url,title,body,baseRefName,headRefName,isDraft,state
```

Compare the returned title, body, base, head, and draft state with the preview. Report a mismatch instead of claiming completion. On success, return the PR URL and a compact validation summary.

## Gotchas

- A dirty worktree does not prevent a PR, but uncommitted changes are absent from the remote PR. Always make that boundary visible.
- A successful bot review is not evidence that repository checks or PR-title commitlint passed.
- `gh pr create` can select an unintended base or head from ambient state. Always pass both explicitly.
- Shell interpolation can corrupt Markdown backticks, dollar signs, or command substitutions. Always pass the body through a file.
- A closed or merged PR may already own the current head branch. Check before creating another PR.
- Generated files and lockfiles can distort size warnings. Exclude them only when their generated status is evident; otherwise state that the count is unfiltered.

## Completion contract

For a preview, return the complete proposed PR and state that GitHub was not modified.

For a created PR, return:

- PR number and URL;
- title and `<base> <- <head>`;
- ready or draft status;
- each validation command and its recorded result;
- any uncommitted-change or reviewability warnings.

Never report success until the created PR has been read back and verified.
