# RoofingCRM + Manus App Merge Design

Date: 2026-05-16

## Decision

`RoofingCRM` remains the main product, runtime, and data source of truth. The Manus-built `rooftop-renovators-crm` app is a donor/reference app. Its best ideas should be adapted into `RoofingCRM`; its backend architecture and database should not replace the main app.

The merged product should feel like `RoofingCRM`: local-first, desktop/mobile friendly, built around roofing workflows, and practical for a single operator or small crew. The Manus app is useful because it contains richer normalized feature examples, stronger server-side workflow tests, and some production-style concepts that can improve the main product when translated carefully.

## Product Goal

Build one coherent roofing operations product around this flow:

Customer -> inspection -> damage/photos -> estimate -> invoice -> tasks/crew/calendar.

Every imported feature should strengthen that flow. Features that add backend complexity, duplicate existing workflows, or make the app feel less local-first should be deferred.

## Source Of Truth

Primary app:

`G:\Other computers\My Computer\Desktop\Apps\RoofingCRM`

Donor/reference app:

`G:\Other computers\My Computer\Desktop\Apps\rooftop-renovators-crm`

## What To Keep From RoofingCRM

- Local-first storage with SQLite/native desktop fallback and browser backup behavior.
- Existing `AppData` model as the short-term product contract.
- Customer, job, inspection, estimate, invoice, task, crew, calendar, damage, photo, and settings sections.
- Measurement-first inspection workflow and roof math.
- Material price settings and material price history.
- Crew Mode as the field-facing experience.
- Backup/import ergonomics.
- Simple status language that matches how a roofing operator thinks.

## What To Adapt From The Manus App

- Richer damage modeling ideas: damage categories, severity, linked photos, and material allocations.
- Roof specification concepts where they improve estimating, without replacing RoofingCRM's measurement workflow.
- Invoice PDF/email concepts, adapted to RoofingCRM's desktop/local runtime.
- Route optimization and map workflow ideas, adapted into the existing Locations/Calendar/Crew workflow.
- Stronger workflow tests from the donor app, rewritten for RoofingCRM's local state model.
- UI patterns only when they simplify an existing RoofingCRM surface.

## What Not To Import For Now

- Manus `userId` auth scoping as a product requirement.
- tRPC, Express, server routers, or MySQL runtime dependencies.
- S3 photo storage as the default photo model.
- Direct Drizzle schema replacement.
- Separate customer/project/estimate/invoice status enums unless they are explicitly mapped.
- Any feature that creates a second way to do the same job inside RoofingCRM.

## Data Mapping Principles

The merge should translate concepts, not copy tables.

`customers` in Manus maps to `Customer` in RoofingCRM. RoofingCRM should move toward structured address fields: street, city, province/state, postal code, and optional latitude/longitude. Keep a display-friendly full address derived from those fields so existing quick-contact and map workflows stay simple.

`projects` in Manus maps to `Job` in RoofingCRM. Keep RoofingCRM's job status model and crew assignment behavior.

`damages`, `damagePhotos`, and `damageMaterials` map to `DamageRecord` plus inspection photo links in RoofingCRM.

`roofSpecifications` maps to RoofingCRM inspection measurements and estimate generation inputs. Do not create a second roof-spec workflow unless it visibly improves estimate creation.

`materials` maps to RoofingCRM material price settings. Donor catalog ideas can improve labels/categories, but the local material pricing/history behavior remains important.

`invoices` maps to RoofingCRM invoices and invoice history. Preserve partial-payment ergonomics.

`appointments` maps to RoofingCRM calendar appointments.

Tasks stay native to RoofingCRM. The donor app does not replace this domain.

## Status Mapping

Customer statuses:

- Manus `lead` -> RoofingCRM `New Lead`
- Manus `contacted` -> RoofingCRM `Contacted`
- Manus `qualified` -> RoofingCRM `Inspection Scheduled`
- Manus `proposal_sent` -> RoofingCRM `Estimate Sent`
- Manus `won` -> RoofingCRM `Won`
- Manus `lost` -> RoofingCRM `Lost`

Project/job statuses:

- Manus `lead` -> RoofingCRM `Scheduled` only after a job is created; otherwise keep as customer lead state.
- Manus `scheduled` -> RoofingCRM `Scheduled`
- Manus `in_progress` -> RoofingCRM `In Progress`
- Manus `completed` -> RoofingCRM `Complete`
- Manus `on_hold` -> RoofingCRM `Awaiting Final Review` only if the context fits; otherwise add notes.
- Manus `cancelled` -> do not force into an active job status; mark in notes or defer until RoofingCRM supports cancelled jobs.

Invoice statuses:

- Manus `draft` -> RoofingCRM `Draft`
- Manus `sent` -> RoofingCRM `Sent`
- Manus `viewed` -> RoofingCRM `Sent` plus invoice history note
- Manus `paid` -> RoofingCRM `Paid`
- Manus `overdue` -> RoofingCRM `Overdue`
- Manus `cancelled` -> defer or record in notes until RoofingCRM supports cancellation.

## Recommended Phases

### Phase 1: Audit And Preserve

Create a feature inventory that compares current RoofingCRM screens against donor features. Mark each item as keep, adapt, defer, or reject.

Acceptance criteria:

- No runtime architecture changes.
- No data model migration yet.
- A short feature decision table exists in the repo.

### Phase 2: Safe Feature Imports

Adapt donor ideas that fit existing RoofingCRM structures:

- Improve damage records and linked photo handling.
- Improve estimate generation from damage/material context.
- Improve invoice PDF/email workflow if it can be done locally.
- Improve route/location workflow if it fits Calendar, Jobs, and Crew Mode.

Acceptance criteria:

- Features operate through existing `AppData`.
- Backup/import still works.
- No duplicate workflow pages are created.

### Phase 3: Data Import Contract

If Manus data needs to be imported, build a one-way conversion script into RoofingCRM backup JSON, not a direct database merge.

Acceptance criteria:

- The script emits valid RoofingCRM `AppData`.
- Ambiguous statuses are logged.
- Photos are either preserved as local data URLs or explicitly skipped with a report.
- The output can be imported through RoofingCRM's existing import flow.

### Phase 4: Verification

Test the core product flow:

Customer -> inspection -> damage/photos -> estimate -> invoice -> task/calendar/crew.

Acceptance criteria:

- Unit or smoke tests cover the workflow.
- A manual QA pass confirms the app can still build and open.
- Existing user data is not overwritten.

## Open Questions

- Should `Cancelled` become a first-class job/invoice status in RoofingCRM?
- Should PDF/email be local-only, mail-client based, or eventually cloud-backed?
- Should maps/route optimization remain lightweight links, or become an embedded route planning screen?

## Next Step

Create an implementation plan for Phase 1: audit the two apps, produce the feature decision table, and identify the first two safe feature imports.
