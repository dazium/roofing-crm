# Munro & Sons CRM — Cross-Platform Alignment Audit

**Audit date:** 2026-11-08  
**Status:** Initial source inspection complete; runtime verification not yet performed.

## Product direction

Maintain two independently developed products:

1. **Web CRM:** `dazium/msre`, with the live Manus-hosted version as the visual and workflow reference.
2. **Standalone application:** `dazium/roofing-crm`, providing the Windows desktop application (Electron) and Android application (Capacitor).

The desktop and Android builds should share the same product design, navigation, terminology, and workflows. They must remain separate from the Manus web deployment. Over time, all platforms should work with the same business records through a documented authenticated API and synchronization layer.

Do not merge the two repositories or replace the existing desktop application with a web wrapper.

## Repository roles

| Repository | Current role | Decision |
|---|---|---|
| `dazium/msre` | Manus-built React web CRM, Express/tRPC backend, Drizzle and MySQL/TiDB | Official web reference and web product |
| `dazium/roofing-crm` | React/Vite single-user local-first application, Electron desktop, Capacitor Android, SQLite/local storage | Official standalone desktop + Android product |
| `dazium/MSRE-crm` | Earlier web CRM copy | Historical reference only |
| `dazium/copy-of-munro-and-sons-roofing-experts` | Earlier Manus-style web copy | Historical reference only |
| `dazium/msre-main` | Nested/copy-style repository requiring confirmation against local files | Historical reference candidate; do not archive until verified |

No repositories were deleted, archived, renamed, or merged as part of this audit.

## Source findings

### Web CRM — `dazium/msre`

- React 19, TypeScript, Vite and Tailwind.
- Express backend with tRPC 11.
- Drizzle ORM with MySQL/TiDB.
- Manus runtime integration and Manus-hosted deployment.
- Database-backed customer, company, project, estimate, invoice, payment, crew, appointment, material, photo, damage and work-order modules.
- The current route tree includes Dashboard, Direct Customers, Companies & Accounts, Subcontractor Operations, Work Orders, Projects, Estimates, Inspections, Invoices, Invoice Templates, Financial Dashboard/Reports, Calendar, Job Map, Route Optimization, Materials, Crews, Crew Availability/Productivity and related detail screens.
- The repository also contains a Capacitor Android wrapper configured to load the Manus-hosted web service. This is not the target standalone Android application for this product direction; the official standalone Android build remains in `dazium/roofing-crm`.
- `ANDROID.md` explicitly describes the current web-backed wrapper and notes the hosted CRM is a public demonstration. Production use requires authentication and authorization.

### Standalone application — `dazium/roofing-crm`

- React 19, TypeScript and Vite.
- Electron desktop shell.
- Capacitor Android packaging with app ID `com.daziu.roofingcrm`.
- Local-first persistence: Electron uses SQLite with JSON backups; Android uses Capacitor SQLite where available; browser fallback uses localStorage.
- The README states there is currently no multi-user backend, authentication system or synchronization server.
- Existing main-branch modules include Dashboard, Customers, Inspections, Jobs, Estimates, Invoices, Tasks, Calendar, Crews, Crew Mode, Damages, Photos, Locations, Reports, Timesheets, Change Orders, Production Plan, Material Fulfillment, Approvals and Profitability.
- Existing automated test assets include Vitest smoke tests and Playwright workflow tests. Their current passing status has not been verified in this audit.
- Existing useful roofing-specific functionality includes roof measurements/calculations, estimating, local material pricing, field photos, crew mode, PDF/export workflows, backups and operational modules.

### Subcontractor development branch — `feature/subcontractor-operations`

- Adds Companies & Accounts, Work Orders, subcontractor contacts, job sites, account documents, work-order lifecycle helpers and unit tests.
- The implementation checklist marks the core company/work-order UI and scheduling/crew/completion foundations as implemented.
- The checklist still marks invoice generation from completed work orders, duplicate-invoice prevention, subcontractor receivables, payment recording, aging and several reporting functions as incomplete.
- The branch is **diverged** from main: 18 commits ahead and 12 commits behind at audit time.
- Pull request #1 is open as a draft. Do not merge it wholesale. Reconcile its feature work with the newer main branch first.
- Pull request #2, “V2 msre consolidation”, is already merged; it is not an outstanding integration task.

### Web branch status

- `dazium/msre/main` is the current web source of truth.
- `v2-msre-consolidation` is one commit behind main after the merged pull request.
- `fix/production-hardening` is 15 commits behind main.
- The prior web PR for routing work-order intake through Subcontractor Operations is merged.
- This audit did not run a fresh typecheck, build, test suite or browser walkthrough.

## Platform feature alignment

The Manus web application is the reference for the target screen design and business workflows. This table is a comparison plan, not a claim that feature parity has already been achieved.

| Module | Web reference | Standalone current state | Alignment work |
|---|---|---|---|
| Dashboard | Business and subcontractor overview | Dashboard exists | Match information hierarchy, metrics, quick actions and visual language |
| Companies & Accounts | First-class subcontractor accounts | Added on feature branch, not reconciled into main | Integrate and align |
| Work Orders | Company-first work-order intake and lifecycle | Added on feature branch, not reconciled into main | Integrate, then connect completion to invoicing |
| Customers | Direct customer records and details | Customer CRUD exists | Align fields, details, search and empty/loading states |
| Projects / Jobs | Projects, job sites, crew and history | Jobs exist | Map data and workflows; preserve standalone roofing-specific job capabilities |
| Estimates | Estimate list, detail and line items | Estimate builder and roof calculations exist | Align presentation and ensure data mapping preserves calculation detail |
| Invoices / Payments | Invoice lifecycle, payments and financial views | Invoicing and payment tracking exist locally | Align statuses, balances, history and payment recording |
| Inspections | Roofing inspection workflow | Detailed roof inspection and measurements exist | Preserve strong standalone measurement workflow; align screen design |
| Materials | Shared catalogue and pricing | Local price settings/history and scraper | Align catalogue fields and distinguish catalogue items from price history |
| Crews | Crew records, availability and productivity | Crew management and Crew Mode exist | Align crew records, assignments and mobile field experience |
| Calendar | Appointments and operational scheduling | Calendar exists | Align event types, status, date handling and crew/job links |
| Maps / Routing | Job Map and route optimization | Locations exists | Compare capabilities and build equivalent route workflows |
| Photos / Damages | Project photos and damage records | Both exist | Align categories, attachments, capture and detail views |
| Reports | Financial and operational reports | Reports and Profitability exist | Reconcile definitions and calculations before matching visualizations |
| Settings / Security | Web account and company configuration | Local settings and backups | Add platform-aware settings and authentication strategy |

## Target architecture

### User experience

- Establish a shared design specification from the Manus web CRM: brand, colors, typography, navigation groups, page titles, table/card patterns, forms, dialogs, status badges, responsive behavior and empty/loading/error states.
- Implement that design system in the standalone application without making the standalone application depend on Manus hosting.
- Desktop should use a full-width desktop layout; Android should use the same information architecture with touch-friendly controls and mobile navigation.
- Keep platform-specific capabilities where they make sense: native camera/location, Android sharing, desktop file/PDF handling and offline storage.

### Data and synchronization

- Do not connect the desktop or Android app directly to the web application's MySQL database.
- Define a versioned API contract and stable entity identifiers.
- Use the authenticated web backend as the canonical shared-data service once authentication and authorization are ready.
- Keep SQLite as a local cache/offline store for the standalone application.
- Add a synchronization queue, conflict handling, retry behavior and visible sync state.
- Do not silently overwrite local edits or discard local data during first synchronization.
- Map the two existing schemas explicitly. Do not assume fields, statuses, identifiers or relationships are interchangeable.
- Treat subcontractor company accounts and direct customers as distinct account types, while allowing shared job-site, work-order, crew, document, invoice and payment relationships where the business rules require them.

## Recommended implementation sequence

### Phase 0 — Protect and establish baselines
- Keep both official repositories separate.
- Keep web `main` as the web source of truth.
- Keep desktop `main` as the standalone application's stable baseline.
- Preserve the divergent subcontractor branch until its changes are reconciled.
- Capture a known-good baseline of both applications and their data models.
- Run existing checks before code changes and record failures.

### Phase 1 — Reconcile desktop subcontractor work
- Compare the 18-ahead/12-behind feature branch against current desktop main.
- Port Companies, Work Orders, types, helpers and tests selectively.
- Preserve later main-branch changes.
- Complete the build/test/e2e checks.
- Integrate only through a reviewed pull request.

### Phase 2 — Establish visual and workflow parity
- Build a module-by-module screen inventory from the web reference and standalone app.
- Implement shared standalone components and navigation.
- Align Dashboard, Companies, Work Orders, Customers, Jobs, Estimates, Invoices, Crews and Materials first.
- Follow with Calendar, Inspections, Photos, Damages, Maps, Reports and Settings.
- Test desktop and Android layouts separately.

### Phase 3 — Shared identity, API and synchronization
- Resolve authentication and authorization for the standalone clients.
- Document API endpoints, entity mappings, IDs, status mappings and validation rules.
- Implement safe first-time import/sync, incremental sync, offline edits and conflict resolution.
- Verify that create/update/delete actions on one platform propagate correctly to the others.

### Phase 4 — Product hardening
- End-to-end tests for core workflows on web, desktop and Android.
- Offline/reconnect tests and backup/restore tests.
- Security review, permissions review and release signing.
- Android physical-device testing and desktop installer testing.
- Only then consider production use or repository archival.

## Safety rules for future work

1. Do not modify or deploy the live Manus web application without an explicit deployment decision.
2. Do not merge the divergent desktop subcontractor branch without reconciling it against current main.
3. Do not delete or archive any repository until local folders and active deployment connections are verified.
4. Do not discard or overwrite local SQLite/JSON data during schema changes or synchronization work.
5. Do not mark features complete based only on a checklist or code presence; run the relevant tests and exercise the workflow.
6. Keep the official web and standalone application repositories separate.
7. Keep the product name and branding consistent: **Munro & Sons** / **MSRE**.

## Audit limitations

This is a repository/source inspection based on GitHub file contents, branch metadata, pull requests and manifests. No local clone, package installation, typecheck, build, automated test run, emulator test or live Manus browser walkthrough was performed as part of this initial audit. All implementation status must be verified before being treated as complete.
