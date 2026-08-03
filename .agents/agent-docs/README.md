# Agent planning and implementation tracking

This directory stores shared, version-controlled working documents used by the
team and coding agents while planning and implementing SpecResearch Loop.

Track documents that help the team coordinate, such as implementation plans,
progress summaries, decision follow-ups, verification evidence, and links to
PBIs or acceptance criteria. Keep authoritative product requirements and
architecture decisions under `docs/`; link to them instead of duplicating them.

Do not store secrets, private credentials, fabricated results, command output
that was not observed, or private chain-of-thought here. Use these status values:
`PLANNED`, `IN_PROGRESS`, `BLOCKED`, and `DONE`. Mark `DONE` only with links to
the relevant code, tests, or reviewed evidence.

Git tracks this directory so all three members share the same implementation
context. Developer-local notes named `*.local.md` and files under `.tmp/` are
ignored.
