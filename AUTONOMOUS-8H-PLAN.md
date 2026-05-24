# RoofingCRM Autonomous 8-Hour Plan

Date: 2026-05-04
Owner: Alesha / OpenClaw
Primary app: `RoofingCRM`
Donor/reference app: `rooftop-renovators-crm`

## Mission
Keep `RoofingCRM` as the only source of truth.
Pull only the useful parts from the donor app, adapted to the real local-first architecture.

## Rules
- Do not redesign RoofingCRM into the donor app's backend architecture.
- Do not treat imported markdown specs as proof of implementation.
- Prefer concrete, testable, incremental changes.
- Update `WORKLOG.md` after meaningful progress.
- If a feature is only spec-level, document it honestly.

## 8-hour execution list

### Phase 1: Truth and merge mapping
- [x] Create a truth-based implementation status file for RoofingCRM
- [x] Create a donor feature import map: keep / adapt / ignore
- [x] Compare donor notes against live RoofingCRM code and remove false completion assumptions

### Phase 2: Runtime verification
- [x] Verify desktop workflow path: customer -> inspection -> estimate -> invoice -> task
- [ ] Verify data persistence after restart
- [ ] Verify backup export/import behavior
- [ ] Verify PDF export from real UI actions
- [ ] Verify scraper refresh behavior from Settings

### Phase 3: High-confidence app improvements
- [ ] Fix any runtime bugs found during manual QA
- [ ] Tighten weak UX flows discovered during testing
- [ ] Knock off safe items from `NEXT-STEPS.md`

### Phase 4: Selective donor imports
- [ ] Identify best donor features that fit current architecture
- [ ] Import one small high-confidence feature at a time
- [ ] Test after each imported feature

## Preferred priority order
1. Reality-check docs
2. Runtime QA
3. Bug fixes
4. Small feature imports
5. Documentation updates

## Definition of good progress
- Build passes
- Tests pass
- Lint passes
- Worklog updated
- New checklist items reflect reality, not guesswork
- Any imported feature is visible in code and survives persistence

## Verification notes (2026-05-20)
- Workflow route reachability was verified via Playwright (`npm run test:e2e`) covering core screens in order.
- Lint, build, and unit tests are currently green (`npm run lint`, `npm run test`, `npm run build`).
- Invoice PDF export implementation path is confirmed in code (`src/sections/Invoices.tsx` -> `buildInvoicePdfHtml` -> desktop export bridge or print fallback), but final sign-off remains a manual Electron click-through check.
- Electron-specific manual checks are still pending for restart persistence, backup/import click-through, PDF export action validation, and scraper refresh behavior.
