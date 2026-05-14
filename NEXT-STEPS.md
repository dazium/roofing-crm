# RoofingCRM Next Steps

This is the practical cleanup and correction list for the current codebase.
Keep it concrete.
Decision outcomes are captured in `DECISIONS.md`.

## Main app focus

- `RoofingCRM` is the primary app and operational source of truth (confirmed 2026-04-30).
- `rooftop-renovators-crm` is a feature donor/reference codebase, not the runtime primary.
- Prioritize shipping and validating workflows in RoofingCRM first, then selectively import secondary features.

## Immediate priorities

### 1. Verify runtime flows manually
These are the highest-value checks because they confirm whether the app feels real, not just whether the code looks plausible.

- Note: 2026-05-09 Codex browser automation was blocked locally (`EPERM` for Browser Use sidecar, `EACCES` launching Chrome through Playwright), so these still require a real desktop/Electron click-through.
- [ ] Launch the desktop app and click through the full workflow
- [ ] Verify customer -> inspection -> estimate -> invoice -> tasks flow
- [ ] Verify data survives app restart
- [ ] Verify automatic backups are written as expected
- [ ] Verify PDF export works end-to-end
- [ ] Verify scraper button works in the desktop shell
- [ ] Verify refreshed scraped prices actually affect Roof Math and estimate generation

### 2. Clean up documentation and in-repo continuity
- [x] Replace placeholder README with real project documentation
- [x] Keep `worklog.MD` current after meaningful sessions
- [x] Add setup notes for Electron desktop packaging
- [x] Add notes on Android signing/release process if this becomes a real deploy target

### 3. Tighten material pricing behavior
- [x] Show the source and timestamp of scraped prices more clearly in the UI
- [x] Decide whether multiple scraped shingle products should map to one editable slot or separate materials
- [x] Decide whether scraped prices should overwrite manual prices automatically or require confirmation
- [x] Handle scraper failures more gracefully in the UI
- [x] Consider storing a visible scrape history instead of only latest values

## UX and product corrections

### Customer flow
- [x] Confirm lead status transitions make sense across the whole workflow
- [x] Consider adding explicit "convert lead to job" guidance
- [x] Add stronger empty states for brand-new users

### Inspection flow
- [ ] Verify mobile camera and gallery upload behavior on Android
- [x] Add a dedicated local-first photo gallery/documentation route adapted from the donor app
- [x] Add roof templates and complexity labels adapted from donor roof-spec ideas
- [x] Decide whether roof planes should become a first-class editable feature instead of mostly stored data
- [x] Consider adding more roofing-specific inspection fields if needed in real use

### Estimate flow
- [x] Validate markup/tax/deposit math with real job examples
- [x] Decide whether labour pricing should remain hardcoded in `buildEstimateLineItemsFromPlan`
- [x] Improve PDF styling if customer-facing polish matters
- [x] Add estimate line-item generation from logged damage material allocations
- [ ] Consider estimate versioning/history instead of one active estimate per job

### Invoice flow
- [x] Decide whether invoices need PDF export too
- [x] Consider editable invoice history instead of simple status updates
- [x] Add stronger overdue handling and reminders if the app grows up

### Task flow
- [x] Decide whether tasks need editing, not just creation/status/checklist toggles
- [x] Consider sorting/grouping by due date and priority

### Crew flow
- [x] Add field-focused Crew Mode adapted from the donor mobile crew app
- [x] Add a basic map/location view for customer addresses, job sites, and route stops
- [ ] Verify Crew Mode on mobile-sized viewport and Android device

## Code cleanup

### Architecture
- [ ] Break down large top-level app state responsibilities in `App.tsx`
- [ ] Reduce repeated selection/state orchestration where possible
- [ ] Decide whether data actions should move into hooks or service modules

### Utilities and duplication
- [x] Remove repeated local `uid()` helpers and use a shared one consistently
- [ ] Review repeated customer/job lookup patterns for possible helper extraction
- [ ] Standardize small formatting/styling patterns across sections

### Validation and safety
- [x] Add stronger validation around numeric inputs
- [x] Guard destructive actions with confirmations where appropriate
- [x] Review import behavior for malformed or partial JSON

### Testing
- [x] Add at least smoke-level tests for critical logic:
  - [x] invoice reconciliation
  - [x] roof math calculations
  - [x] estimate line-item generation
  - [x] storage normalization

## Product decisions still open
- [x] Should RoofingCRM stay local-first and single-user, or grow a backend?
- [x] Should material pricing remain desktop-first, or be shared between desktop/mobile through a real sync layer?
- [x] Is this meant to be a personal operator tool, or something multiple staff would use?

## Recommended resume order

If resuming cold, do this:
1. Manual desktop verification
2. Fix runtime bugs found during click-through
3. Verify Locations and Crew Mode on mobile-sized viewport
4. Consider estimate versioning/history
5. Refactor and test critical logic
