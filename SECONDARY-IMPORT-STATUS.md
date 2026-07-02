# Secondary -> Main Import Status

Date: 2026-04-29

Primary target: `RoofingCRM`  
Secondary source: `rooftop-renovators-crm`

## Imported in this pass

1. `Crews` domain imported into main app:
   - new `Crew` type
   - persisted in `AppData`
   - seed data + normalization + backup import support
   - full `Crews` UI section (add/edit/delete/status)

2. `Appointments/Calendar` domain imported into main app:
   - new `Appointment` type + status/type enums
   - persisted in `AppData`
   - seed data + normalization + backup import support
   - full `Calendar` UI section (add/edit/delete, customer/job linking)

3. Main shell integration:
   - nav entries for `Calendar` and `Crews`
   - view routing and page descriptions wired in `App.tsx`

4. Validation:
   - `npm run lint` passes
   - `npm run test` passes
   - `npm run build` passes

## Additional imports in latest pass

1. `Damages` domain imported:
   - new `DamageRecord` model with category/severity/location/estimated cost
   - damage-to-material allocation lines
   - damage-to-inspection-photo linking by photo IDs
   - dedicated `Damages` section (add/edit/delete + scoped filtering by customer/job)

2. `Jobs` section upgraded with crew assignment:
   - `crewId` support in job model
   - create/edit crew selection in project workflow
   - crew visibility in project summary and board rows

3. Dashboard workflow integration:
   - next-action now prompts damage logging before estimate when missing
   - workspace links and stats include damage records

4. Main shell integration:
   - new main view route/nav for `Damages`
   - `AppData` import/seed/normalization updated for `damages`

## Parity pass completed on 2026-05-27

1. Damages domain parity:
   - expanded damage categories/severity constants
   - location preset UX via datalist
   - suggested material allocation by damage category
   - project allocation summary

2. Photo subsystem parity:
   - existing customer/project gallery retained
   - explicit photo-to-damage linking controls added in Photos
   - stale damage links still clear when photos are removed

3. Materials parity:
   - material catalog category taxonomy added
   - imported/legacy material prices normalized with inferred categories
   - material allocation visible by damage/project

4. Mapping/routing parity:
   - map/location view exists
   - route queue now supports active-first, schedule, and crew ordering workflows

5. Invoicing parity extensions:
   - invoice email, reminder, and overdue mailto templates added
   - `Viewed` and `Cancelled` invoice statuses added
   - email preparation is logged to invoice history

## Still pending from secondary app

1. Manual Electron verification of PDF export, email-client handoff, scraper refresh, restart persistence, and backup/import behavior.
2. Android/device verification of camera/gallery and mobile route workflows.
3. Any future backend/server convergence remains intentionally deferred; RoofingCRM stays local-first.
