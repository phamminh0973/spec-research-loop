---
name: commit
description: >
  Create Conventional Commits for the SpecResearch Loop monorepo (apps/web, apps/api,
  apps/worker, packages/*). Invoke whenever the user is ready to commit — staged
  or unstaged changes. Triggers: "commit", "commit this", "tạo commit", "commit
  changes", "/commit". Handles staging, diff analysis, atomic-split detection,
  message composition against this repo's commitlint config, and execution.
  Never bypasses the husky commit-msg hook.
---

# Commit — SpecResearch Loop Conventional Commits Workflow

SpecResearch Loop uses Conventional Commit messages. When Node tooling is
installed, `.husky/commit-msg` runs commitlint. Until a package manifest exists,
the hook explicitly reports that validation was skipped. Never bypass an
available hook with `--no-verify`; fix the message instead.

Commit headers describe the diff outcome. Do not force PBI identifiers into the
header. If a change implements a PBI, keep that trace in the commit body when it
helps reviewers and in the PR title/body via `$open-pr`.

Work through these steps in order.

---

## STEP 1 — Load git state

```bash
git status --porcelain
git diff --cached --name-only
```

**Nothing staged:** show the user what's modified/untracked, ask whether to
stage all or specific files. Only run `git add -A` on explicit confirmation
("all", or no specific files named). Never auto-stage silently.

**Already staged:** proceed with the staged set only — do not touch unstaged
files unless asked.

---

## STEP 2 — Diff analysis

`git diff --staged` and determine:

1. **Type** — see Type Reference.
2. **Scope** — see Scope Reference (derived from `apps/*`, `packages/*`).
3. **Breaking change** — removed/renamed public API, changed shared schema
   contract, changed HTTP contract in `packages/schemas`, changed worker
   job payload shape.
4. **Atomic check** — one logical story per commit. A diff that mixes an
   unrelated `apps/api` fix with a `docs/` update, or crosses two of
   web/api/worker with independent reasons, is not atomic.

If clearly one unit, skip to Step 4.

---

## STEP 3 — Split check (only if needed)

Propose the concrete split, don't ask abstractly:

```
Proposed split:
  1. fix(api): correct idempotency key derivation for save endpoint
  2. docs(project): update product-backlog PB-045 status
```

Ask: "Split into N commits, or commit as one?"

If splitting, stage → confirm (`git diff --cached --name-only`) → compose
(Step 4) → execute (Step 5) → repeat for the next group.

---

## STEP 4 — Compose the commit message

### Format

```
<type>(<scope>): <description>

- change 1
- change 2

BREAKING CHANGE: <what breaks and how to migrate>
```

### Hard rules (enforced by commitlint, do not violate)

- Header (`type(scope): description`) ≤ **100 characters** total.
- `type` — lowercase, from the allowed list below.
- `scope` — lowercase noun in parentheses; omit if the change is cross-cutting
  (touches root tooling, or three or more apps/packages equally).
- `description` — imperative present tense ("add", "fix", not "added", "fixes"),
  lowercase first character, no trailing period.
- Body — bullet list only, one blank line after the header.
- Footer — one blank line after the body; `BREAKING CHANGE:` required when the
  header uses `!` (e.g. `feat(server)!: ...`).
- PBI IDs are optional evidence in the body, not part of the header by default.
- No emoji anywhere.
- Language: English — matches existing repo history even though project docs
  are in Vietnamese.

### Body guidance

Add a body when the subject alone doesn't carry the full picture: multiple
distinct changes in one commit, non-obvious implementation choices, migration
notes. Skip it for a self-contained single-file change
(`docs(research): add worker architecture research`).

---

## STEP 5 — Confirm and execute

Show the message in a code block, offer to adjust type/scope/wording, then run:

```bash
git commit -m "$(cat <<'EOF'
feat(server): add idempotency guard to save endpoint

- derive idempotency key from user id + document checksum
- return 409 on duplicate submission within the ttl window
EOF
)"
```

The commit-msg hook (`pnpm exec commitlint --edit`) runs automatically. If it
fails, fix the message and re-commit — never `--no-verify`. Report the commit
hash and subject from `git log -1 --oneline` after success.

---

## Type Reference

| Type | When to use |
|------|-------------|
| `feat` | New capability visible to a user or API consumer |
| `fix` | Corrects a bug or incorrect behavior |
| `refactor` | Restructures without changing behavior |
| `perf` | Specifically improves performance |
| `docs` | `docs/`, README, JSDoc/docstring only — zero logic change |
| `test` | Adds/corrects tests only |
| `build` | Dependency bumps, Turborepo/tsconfig/eslint-config, Dockerfiles, `docker-compose*.yaml` |
| `ci` | `.github/workflows/*`, husky/commitlint/lint-staged config |
| `chore` | Repo admin: `.gitignore`, version bumps, non-build tooling metadata |
| `style` | Formatting only (Prettier/Ruff), zero logic change |
| `revert` | Reverts a prior commit; reference the hash in the footer |

**`feat` vs `refactor`:** did behavior visible to a caller change? Yes → `feat`.
**`fix` vs `refactor`:** was there a bug? Yes → `fix`.
**`build` vs `ci`:** does it change what ships (deps, Docker, tsconfig)? → `build`.
Does it only change how CI runs? → `ci`.

---

## Scope Reference

Omit scope when a change is cross-cutting (root tooling, or spans three-plus
apps/packages with no dominant one).

| Changed paths contain | Scope |
|---|---|
| `apps/web/` | `web` |
| `apps/api/` | `api` |
| `apps/worker/` | `worker` |
| `packages/schemas/` | `schemas` |
| `packages/eslint-config/` | `eslint-config` |
| `packages/tsconfig/` | `tsconfig` |
| `docs/` | `docs` (or a focused product/architecture/testing scope) |
| `docker-compose*.yaml`, `apps/*/Dockerfile` | `docker` |
| `.github/workflows/` | omit scope, type `ci` |
| `.husky/`, `commitlint.config.mjs`, `.prettierrc`, root `package.json`/`turbo.json` | omit scope, type `build` or `ci` per Type Reference |

---

## Examples

**Single-file docs change:**
```
docs(research): add worker architecture research
```

**Feature with body:**
```
feat(web): add offline-safe upload retry queue

- persist pending uploads to indexeddb before network call
- flush queue on reconnect via a background sync listener
```

**Breaking change:**
```
feat(schemas)!: rename storage_key to storageKey in document dto

BREAKING CHANGE: apps/api and apps/worker consumers must update field
access from storage_key to storageKey; regenerate any cached client types.
```

**Cross-cutting, no scope:**
```
build: bump turbo to 2.10.5 and pin pnpm 11.14.0
```
