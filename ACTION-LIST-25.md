# RoofingCRM 25-Item Execution List

Created 2026-05-29 from `NEXT-STEPS.md`, `WORKLOG.md`, and current code inspection.

## Implemented in this pass

1. [x] Add shared app lookup helpers for customer, job, inspection, estimate, invoice, damage, and task selection.
2. [x] Wire app-level selected customer/job/inspection/estimate/invoice reads through the lookup helpers.
3. [x] Wire workflow strip damage/task state through shared selection helpers.
4. [x] Reuse lookup helpers inside selection-resolution logic.
5. [x] Add smoke tests for the shared lookup helpers.

## Next code work

6. [x] Move repeated invoice job/customer/estimate lookup code in `Invoices.tsx` into local memoized helpers or shared selectors.
7. [x] Move repeated job detail lookup code in `Jobs.tsx` into local memoized helpers or shared selectors.
8. [x] Move repeated dashboard activity lookup code in `Dashboard.tsx` into derived summary helpers.
9. [x] Standardize selected-customer empty states across Customers, Inspect, Photos, Damages, Estimates, Invoices, and Tasks.
10. [x] Add estimate version/history data model and UI path.
11. [x] Add tests for estimate version/history creation and active estimate selection.
12. [ ] Add a storage metadata panel that shows last save time in addition to backup directory, with copy that makes sense on desktop and Android.
13. [x] Add a visible platform warning when scraper refresh is unavailable outside the Electron desktop shell.
14. [x] Add a visible platform warning when PDF export falls back to browser/Android print behavior.
15. [x] Add import validation details that identify which backup section failed normalization.
16. [x] Add route planner tests for Google Maps handoff URL ordering.
17. [x] Add invoice delivery tests for history entries created by copy/open/export actions.
18. [x] Add photo upload size/type validation before optimization and verify camera/gallery inputs still work on Android.
19. [x] Add a photo count and linked-damage count summary to Inspection in a mobile-friendly layout.
20. [x] Add a Crew Mode readiness checklist for each assigned job and verify it fits Android viewport widths.
21. [x] Add overdue invoice filtering to Dashboard billing cards.
22. [x] Add task quick filters for blocked, due today, and overdue tasks.
23. [x] Add material price stale-age badges when updated/scraped timestamps are old.
24. [x] Add a `npm run verify` script that runs lint, tests, build, and Android web asset sync.
25. [x] Update `WORKLOG.md` after each implementation session with exact verification results.

## Manual QA Still Required

- Electron click-through: customer -> inspection -> estimate -> invoice -> tasks.
- Restart persistence and automatic backup creation.
- Desktop PDF save dialog behavior.
- Desktop scraper execution and price propagation into estimates.
- External mail client and Google Maps handoff.
- Android parity for desktop workflows: navigation, forms, route handoff, email handoff, PDF/print fallback, storage persistence, camera/gallery, and Crew Mode layout.