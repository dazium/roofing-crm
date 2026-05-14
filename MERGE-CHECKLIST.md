# RoofingCRM + Rooftop Renovators CRM Merge Checklist

Date: 2026-04-29

## Source projects reviewed

1. `C:\Users\daziu\Desktop\Apps\RoofingCRM` (local-first Electron/Capacitor app)
2. `C:\Users\daziu\Desktop\Apps\rooftop-renovators-crm` (full-stack web app with MySQL/Drizzle/tRPC)
3. `C:\Users\daziu\Desktop\Apps\iRoofer-CRM-Notes-2026-04-29` (downloaded planning docs/todos/gap analysis)

## Active direction (source of truth)

Date confirmed: 2026-04-30

1. Use `RoofingCRM` as the primary app and operational source of truth.
2. Treat `rooftop-renovators-crm` as a feature donor/reference codebase, not the runtime primary.
3. Import selected rooftop capabilities into RoofingCRM in controlled phases:
   - backend-inspired data modeling where useful
   - crews/calendar/maps and related workflows
   - richer media, materials, and reporting flows
4. Keep RoofingCRM local-first while deciding if/when shared backend sync is required.

## High-risk gaps you can easily miss

1. `Tasks` domain exists in RoofingCRM but not in `rooftop-renovators-crm` schema.
2. RoofingCRM’s local backup/import and offline durability flow has no direct equivalent in web repo.
3. Rooftop repo has multi-user auth/roles/userId scoping; RoofingCRM is single-user local state.
4. Rooftop repo has `crews`, `appointments`, `photos`, `damages`, `damageMaterials`, `roofSpecifications`; RoofingCRM does not have these as first-class persisted entities.
5. Status enums differ across both apps (customer/project/estimate/invoice), so direct data import will misclassify records unless mapped.
6. File/storage model differs: RoofingCRM stores inspection photos in app state; rooftop uses S3-style metadata records.
7. PDF pipelines differ:
   - RoofingCRM: Electron print-to-PDF HTML
   - Rooftop: server-side `pdf-lib` + client `jsPDF`
8. Rooftop has stronger test suite around server workflows; RoofingCRM currently has smoke tests only.

## Domain-by-domain merge matrix

### Customers / Leads
- Keep from rooftop:
  - normalized customer fields (`firstName`, `lastName`, address parts, geocode, status lifecycle)
  - user-scoped records and customer detail modal workflow
- Bring from RoofingCRM:
  - explicit lead-to-job conversion guidance UX
  - operator-friendly quick-contact interactions

### Projects / Jobs
- Keep from rooftop:
  - project lifecycle, `crewId`, date windows, value tracking
  - dedicated project detail pages
- Bring from RoofingCRM:
  - simpler “current workspace” context and next-action dashboard cues

### Inspection / Damages / Roof Specs
- Keep from rooftop:
  - `damages`, `damagePhotos`, `damageMaterials`, `roofSpecifications` entities
- Bring from RoofingCRM:
  - measurement-first inspection workflow (squares/ridge/valley/eaves/rake/waste)
  - direct roof-math panel and practical proposal generation path

### Estimates
- Keep from rooftop:
  - normalized `estimates` + `estimateLineItems`
  - estimate numbering/status lifecycle
- Bring from RoofingCRM:
  - line-item autogeneration from roof measurements + material table
  - polished operator preview flow

### Invoices
- Keep from rooftop:
  - invoice number generation, richer statuses (`viewed`, `cancelled`, etc.), email pipeline
- Bring from RoofingCRM:
  - straightforward partial-payment ergonomics
  - desktop export UX fallback

### Materials / Pricing
- Keep from rooftop:
  - first-class `materials` catalog tables
- Bring from RoofingCRM:
  - desktop scrape refresh controls and overwrite confirmation
  - visible scrape history log
  - single-slot shingle mapping decision (documented)

### Tasks
- Keep from RoofingCRM:
  - create/edit/status/checklist/sort board
- Required in rooftop:
  - add `tasks` table + API + UI pages to avoid feature regression

### Calendar / Maps / Crews / Route optimization
- Keep from rooftop (feature superset)
- Required in RoofingCRM merge target:
  - map these pages into unified nav/workflow so they are not orphaned features

### Storage / Sync
- Keep both (hybrid target):
  - rooftop server persistence for shared data
  - RoofingCRM local cache/backup for offline resilience

## Required status mapping table (do this before importing any data)

### Customer status
- RoofingCRM `New Lead` -> rooftop `lead`
- RoofingCRM `Contacted` -> rooftop `contacted`
- RoofingCRM `Inspection Scheduled` -> rooftop `qualified` (or custom new enum if you want separate stage)
- RoofingCRM `Estimate Sent` -> rooftop `proposal_sent`
- RoofingCRM `Won` -> rooftop `won`
- RoofingCRM `Lost` -> rooftop `lost`

### Job/project status
- RoofingCRM `Scheduled` -> rooftop `scheduled`
- RoofingCRM `In Progress` -> rooftop `in_progress`
- RoofingCRM `Awaiting Final Review` -> rooftop `on_hold` (or add dedicated enum)
- RoofingCRM `Complete` -> rooftop `completed`
- RoofingCRM `Invoiced` -> rooftop `completed` + invoice status marker
- RoofingCRM `Paid` -> rooftop `completed` + paid invoice

### Invoice status
- RoofingCRM `Draft` -> rooftop `draft`
- RoofingCRM `Sent` -> rooftop `sent`
- RoofingCRM `Partial` -> rooftop `viewed` (or add `partial` enum in rooftop)
- RoofingCRM `Paid` -> rooftop `paid`
- RoofingCRM `Overdue` -> rooftop `overdue`

## Data migration checklist

1. Build one-time import script from RoofingCRM `AppData` JSON into rooftop DB tables.
2. Split RoofingCRM `Customer.name` into `firstName/lastName`.
3. Map RoofingCRM `jobs` -> rooftop `projects`.
4. Map RoofingCRM `inspections`:
   - summary fields -> `damages`/`roofSpecifications`
   - photos -> `photos` + `damagePhotos` references
5. Map RoofingCRM material table -> rooftop `materials`.
6. Preserve RoofingCRM `materialPriceHistory` into dedicated history table (new) or audit log.
7. Add missing `tasks` entities in rooftop first, then import RoofingCRM tasks.
8. Backfill `userId` ownership for all imported rows.

## Implementation phases

### Phase 1: Schema/API convergence
1. Add missing tables to rooftop schema:
   - `tasks`
   - optionally `materialPriceHistory`
2. Add status enums/compat mappings needed for RoofingCRM imports.
3. Add tRPC endpoints for tasks + pricing-history.

### Phase 2: UX convergence
1. Port RoofingCRM task board UX into rooftop pages.
2. Port RoofingCRM measurement-driven estimate generator into rooftop estimate flow.
3. Port scraper/history controls into rooftop materials/settings surfaces.

### Phase 3: Runtime convergence
1. Decide hybrid architecture:
   - Electron shell + rooftop API
   - or full web-first with optional local cache module
2. Re-implement local backup/import as an explicit feature in merged app.

### Phase 4: Validation gate
1. End-to-end test flow:
   - customer -> inspection/damage -> estimate -> invoice -> tasks
2. Verify PDF export + invoice email.
3. Verify materials scrape refresh and cost propagation into estimates.
4. Verify mobile interactions (camera/gallery/maps).

## Must-keep artifact checklist from downloaded notes

From `iRoofer-CRM-Notes-2026-04-29`, ensure these are not dropped during merge:

1. `todo.md` priorities and phase sequencing.
2. `Roofing CRM - Comprehensive Gap Analysis.md` as backlog source.
3. `database-schema.md` and `workflows.md` for business-process alignment.
4. `roof-calculator-guide.md` + `materials-list.md` + `pricing-sources.md` for estimating logic references.

## Current merge readiness verdict

1. You are not missing major discovery context anymore.
2. Biggest immediate merge blockers are:
   - tasks schema/API gap
   - status mapping ambiguity (`Inspection Scheduled`, `Awaiting Final Review`, `Partial`)
   - offline/local-backup parity strategy
3. Do not start blind code merge until status mappings + import script contract are fixed first.
