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

## Still pending from secondary app

1. Damages domain parity:
   - damage categories/severity/location list UX
   - damage-to-material links

2. Photo subsystem parity:
   - project/customer photo management patterns
   - explicit damage-photo linking

3. Materials parity:
   - material catalog normalization against secondary taxonomy
   - material allocation by damage/project

4. Mapping/routing parity:
   - map view and route optimization workflows

5. Invoicing parity extensions:
   - email delivery workflow and templates from secondary app
   - advanced invoice statuses/workflows if desired
