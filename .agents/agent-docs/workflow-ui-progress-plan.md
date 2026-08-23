# Grouped workflow UI progress plan

Status: `DONE`
Date: 2026-08-24
Branch: `bugfix/fix-workflow-ui`
Base: `main`

## Goal

Keep the four grouped navigation links in the workflow sidebar and replace the
duplicated ten-stage status list with a compact progress bar for the active
screen. The progress must describe the actual work shown on that screen and
must not imply that fixture data is production LLM output.

## Scope

1. Keep the existing sidebar toggle and independent sidebar/main scrolling.
2. Render a UI-reference-style horizontal progress bar in the sidebar.
3. Give each grouped screen its own data-backed substeps:
   - Step 1: Generate proposal → Review & edit → Confirm.
   - Step 2: Generate typed cards → Review cards → Handoff readiness.
   - Steps 3–8: Literature → Evidence & gap → Claims → Experiment & feasibility.
   - Steps 9–10: Specification → Independent judges → Revision decision →
     Finalize & export.
4. Preserve the four grouped route links below the progress block.
5. Keep the local web server running after verification for manual testing.

## State rules

- A substep is `complete` only when its corresponding observed fact is ready.
- The first incomplete substep is `current`.
- Later substeps are `pending`; they are not represented as completed merely
  because a later API object exists.
- The bar displays the number of completed substeps and accessible labels for
  each state.

## Verification plan

- Focused workflow-progress tests assert that no grouped screen returns ten
  items and that each state follows its data gates.
- Run web typecheck and Vitest.
- Run the direct Next.js production build if needed, restoring generated
  `next-env.d.ts` changes afterward.
- Smoke-test the fixture route in the browser, including the compact progress,
  sidebar collapse/reopen, and independent scrolling.
- Leave the dev server available at `http://localhost:3000`.

## Observed implementation evidence

- `buildWorkflowProgress` now returns only the active screen's 3 or 4
  substeps; the four grouped route links remain below the progress block.
- Focused web tests, web typecheck, and the direct Next.js production build
  passed on 2026-08-24.
- Browser smoke on the local fixture verified 3 items for Step 1, 3 for Step
  2, 4 for Steps 3–8, and 4 for Steps 9–10. Sidebar collapse/reopen also
  passed. The dev server remains running for manual testing.
